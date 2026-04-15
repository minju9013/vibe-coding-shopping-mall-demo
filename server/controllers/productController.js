const mongoose = require("mongoose");
const Product = require("../models/Product");
const { PRODUCT_CATEGORIES } = Product;

const formatValidationMessage = (err) =>
  Object.values(err.errors || {})
    .map((e) => e.message)
    .join(" ");

/** MongoDB E11000 — keyValue가 드라이버마다 위치가 달라질 수 있음 */
function formatDuplicateKeyMessage(err) {
  const kv =
    err.keyValue ||
    err.errorResponse?.keyValue ||
    (err.cause && err.cause.keyValue);
  const kp =
    err.keyPattern ||
    err.errorResponse?.keyPattern ||
    (err.cause && err.cause.keyPattern);

  if (kv && typeof kv === "object" && "sku" in kv) {
    return `이미 사용 중인 SKU입니다: "${String(kv.sku)}". 다른 SKU를 쓰거나 해당 상품을 삭제하세요.`;
  }

  if (
    (kv && typeof kv === "object" && "productId" in kv) ||
    (kp && typeof kp === "object" && kp.productId)
  ) {
    return (
      "예전 스키마의 productId unique 인덱스가 DB에 남아, 상품이 하나뿐인데도 두 번째 등록이 막힐 수 있습니다. " +
      "서버를 재시작해 인덱스 동기화(syncIndexes)를 적용하거나, Compass에서 products 인덱스의 productId 항목을 삭제하세요."
    );
  }

  const hint =
    kv && Object.keys(kv).length
      ? JSON.stringify(kv)
      : kp && Object.keys(kp).length
        ? JSON.stringify(kp)
        : "";
  return hint
    ? `이미 사용 중인 값입니다 (중복 키). ${hint}`
    : "이미 사용 중인 값입니다 (중복 키). MongoDB 인덱스를 확인하세요.";
}

// 상품 목록 (선택: ?category=outer)
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;
/** 메인 등에서 한 번에 받기 — 과부하 방지 상한 */
const MAX_CATALOG_ALL = 500;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/products — ?page=&limit=&category=&search= | ?all=1 (전체·최대 MAX_CATALOG_ALL건)
const getProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) {
      if (!PRODUCT_CATEGORIES.includes(category)) {
        const error = new Error(
          `유효하지 않은 카테고리입니다. 허용: ${PRODUCT_CATEGORIES.join(", ")}`
        );
        error.statusCode = 400;
        throw error;
      }
      filter.category = category;
    }

    const q = typeof search === "string" ? search.trim() : "";
    if (q) {
      filter.name = { $regex: escapeRegex(q), $options: "i" };
    }

    const wantAll = req.query.all === "true" || req.query.all === "1";
    if (wantAll) {
      const total = await Product.countDocuments(filter);
      const products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .limit(MAX_CATALOG_ALL);
      return res.json({
        success: true,
        data: products,
        pagination: {
          page: 1,
          limit: products.length,
          total,
          totalPages: 1,
          hasNext: total > products.length,
          hasPrev: false,
        },
      });
    }

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
    limit = Math.min(limit, MAX_PAGE_SIZE);

    const total = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

    let page = parseInt(req.query.page, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    page = Math.min(page, totalPages);

    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 단일 상품 (SKU)
const getProductBySku = async (req, res, next) => {
  try {
    const sku = req.params.sku?.trim();
    if (!sku) {
      const error = new Error("SKU가 필요합니다.");
      error.statusCode = 400;
      throw error;
    }
    const product = await Product.findOne({ sku });
    if (!product) {
      const error = new Error("상품을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 단일 상품 (MongoDB _id)
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("유효하지 않은 상품 ID입니다.");
      error.statusCode = 400;
      throw error;
    }
    const product = await Product.findById(id);
    if (!product) {
      const error = new Error("상품을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 상품 생성 — POST /api/products (Product 모델 스키마와 동일한 body)
const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      price,
      listPrice,
      category,
      image,
      description,
      options,
    } = req.body;

    const skuTrim = typeof sku === "string" ? sku.trim() : "";
    const nameTrim = typeof name === "string" ? name.trim() : "";
    const publicId =
      typeof image?.publicId === "string" ? image.publicId.trim() : "";
    const secureUrl =
      typeof image?.secureUrl === "string" ? image.secureUrl.trim() : "";

    if (!skuTrim || !nameTrim || price === undefined || price === null || !category) {
      const error = new Error(
        "SKU, 이름, 가격, 카테고리는 필수입니다."
      );
      error.statusCode = 400;
      throw error;
    }

    if (!publicId || !secureUrl) {
      const error = new Error(
        "이미지는 publicId와 secureUrl이 모두 필요합니다. (Cloudinary)"
      );
      error.statusCode = 400;
      throw error;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      const error = new Error("가격은 0 이상의 숫자여야 합니다.");
      error.statusCode = 400;
      throw error;
    }

    const payload = {
      sku: skuTrim,
      name: nameTrim,
      price: priceNum,
      category,
      image: { publicId, secureUrl },
      description: description ?? "",
      options: Array.isArray(options) ? options : [],
    };

    if (listPrice !== undefined && listPrice !== null && listPrice !== "") {
      const lp = Number(listPrice);
      if (Number.isNaN(lp) || lp < 0) {
        const error = new Error("정가(listPrice)는 0 이상의 숫자여야 합니다.");
        error.statusCode = 400;
        throw error;
      }
      payload.listPrice = lp;
    }

    const product = await Product.create(payload);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.statusCode = 400;
      error.message = formatValidationMessage(error) || error.message;
    }
    if (error.code === 11000) {
      error.message = formatDuplicateKeyMessage(error);
      error.statusCode = 409;
    }
    next(error);
  }
};

// 상품 수정 (sku는 스키마상 변경 불가)
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("유효하지 않은 상품 ID입니다.");
      error.statusCode = 400;
      throw error;
    }

    const { name, price, listPrice, category, image, description, options } =
      req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (listPrice !== undefined && listPrice !== null && listPrice !== "") {
      updates.listPrice = Number(listPrice);
    }
    if (category !== undefined) updates.category = category;
    if (image !== undefined) updates.image = image;
    if (description !== undefined) updates.description = description;
    if (options !== undefined) updates.options = options;

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      const error = new Error("상품을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.statusCode = 400;
      error.message = formatValidationMessage(error) || error.message;
    }
    next(error);
  }
};

// 상품 삭제
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("유효하지 않은 상품 ID입니다.");
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      const error = new Error("상품을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, message: "상품이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductBySku,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
