const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const PRODUCT_POPULATE_SELECT =
  "name price listPrice sku category image description options";

const formatValidationMessage = (err) =>
  Object.values(err.errors || {})
    .map((e) => e.message)
    .join(" ");

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function populateCart(cart) {
  return cart.populate({
    path: "items.product",
    select: PRODUCT_POPULATE_SELECT,
  });
}

function normalizeOption(s) {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * GET /api/carts/me
 * 현재 로그인 사용자 장바구니 조회(없으면 빈 장바구니 생성)
 */
const getMyCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    await populateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/carts/me/items
 * body: { productId, quantity?, color?, size?, unitPrice? }
 * 동일 상품+색상+사이즈면 수량 합산
 */
const addCartItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1, color = "", size = "", unitPrice } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      const err = new Error("유효한 productId가 필요합니다.");
      err.statusCode = 400;
      throw err;
    }

    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 1 || !Number.isInteger(q)) {
      const err = new Error("수량은 1 이상의 정수여야 합니다.");
      err.statusCode = 400;
      throw err;
    }

    const product = await Product.findById(productId);
    if (!product) {
      const err = new Error("상품을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    const colorNorm = normalizeOption(color);
    const sizeNorm = normalizeOption(size);
    const unit =
      unitPrice != null && unitPrice !== ""
        ? Number(unitPrice)
        : Number(product.price);
    if (Number.isNaN(unit) || unit < 0) {
      const err = new Error("unitPrice가 올바르지 않습니다.");
      err.statusCode = 400;
      throw err;
    }

    const cart = await getOrCreateCart(req.user._id);

    const idx = cart.items.findIndex(
      (line) =>
        String(line.product) === String(productId) &&
        normalizeOption(line.color) === colorNorm &&
        normalizeOption(line.size) === sizeNorm
    );

    if (idx >= 0) {
      cart.items[idx].quantity += q;
      cart.items[idx].unitPrice = unit;
    } else {
      cart.items.push({
        product: productId,
        quantity: q,
        color: colorNorm,
        size: sizeNorm,
        unitPrice: unit,
      });
    }

    await cart.save();
    await populateCart(cart);
    res.status(201).json({ success: true, data: cart });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.message = formatValidationMessage(error) || error.message;
      error.statusCode = 400;
    }
    next(error);
  }
};

/**
 * PATCH /api/carts/me/items/:itemId
 * body: { quantity?, color?, size?, unitPrice? } — 최소 한 필드 필요.
 * 색상·사이즈 변경 후 다른 줄과 동일(상품+색+사이즈)이면 수량 합쳐 한 줄로 병합.
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      const err = new Error("유효하지 않은 장바구니 항목 ID입니다.");
      err.statusCode = 400;
      throw err;
    }

    const hasQty = req.body.quantity !== undefined && req.body.quantity !== null;
    const hasColor = req.body.color !== undefined;
    const hasSize = req.body.size !== undefined;
    const hasUnit = req.body.unitPrice !== undefined && req.body.unitPrice !== null;

    if (!hasQty && !hasColor && !hasSize && !hasUnit) {
      const err = new Error(
        "quantity, color, size, unitPrice 중 최소 하나는 보내야 합니다."
      );
      err.statusCode = 400;
      throw err;
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      const err = new Error("장바구니를 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    const line = cart.items.id(itemId);
    if (!line) {
      const err = new Error("해당 장바구니 항목을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    let newQty = line.quantity;
    if (hasQty) {
      const q = Number(req.body.quantity);
      if (!Number.isFinite(q) || q < 1 || !Number.isInteger(q)) {
        const err = new Error("수량은 1 이상의 정수여야 합니다.");
        err.statusCode = 400;
        throw err;
      }
      newQty = q;
    }

    const newColor = hasColor ? normalizeOption(req.body.color) : normalizeOption(line.color);
    const newSize = hasSize ? normalizeOption(req.body.size) : normalizeOption(line.size);

    const productId = line.product;
    const product = await Product.findById(productId);
    if (!product) {
      const err = new Error("상품을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    let newUnit = line.unitPrice;
    if (hasUnit) {
      const u = Number(req.body.unitPrice);
      if (Number.isNaN(u) || u < 0) {
        const err = new Error("unitPrice가 올바르지 않습니다.");
        err.statusCode = 400;
        throw err;
      }
      newUnit = u;
    } else if (hasColor || hasSize) {
      newUnit = Number(product.price);
      if (Number.isNaN(newUnit) || newUnit < 0) {
        const err = new Error("상품 가격을 확인할 수 없습니다.");
        err.statusCode = 400;
        throw err;
      }
    }

    const dup = cart.items.find(
      (x) =>
        String(x._id) !== String(line._id) &&
        String(x.product) === String(productId) &&
        normalizeOption(x.color) === newColor &&
        normalizeOption(x.size) === newSize
    );

    if (dup) {
      dup.quantity += newQty;
      dup.unitPrice = newUnit;
      line.deleteOne();
    } else {
      line.quantity = newQty;
      line.color = newColor;
      line.size = newSize;
      line.unitPrice = newUnit;
    }

    await cart.save();
    await populateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.message = formatValidationMessage(error) || error.message;
      error.statusCode = 400;
    }
    next(error);
  }
};

/**
 * DELETE /api/carts/me/items/:itemId
 */
const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      const err = new Error("유효하지 않은 장바구니 항목 ID입니다.");
      err.statusCode = 400;
      throw err;
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      const err = new Error("장바구니를 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    const line = cart.items.id(itemId);
    if (!line) {
      const err = new Error("해당 장바구니 항목을 찾을 수 없습니다.");
      err.statusCode = 404;
      throw err;
    }

    line.deleteOne();
    await cart.save();
    await populateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/carts/me
 * 장바구니 비우기
 */
const clearMyCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    await populateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/carts/me/count
 * populate 없이 totalQuantity·totalAmount만 반환 (배지용 경량 API)
 */
const getMyCartCount = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).select(
      "totalQuantity totalAmount"
    );
    res.json({
      success: true,
      data: {
        totalQuantity: cart?.totalQuantity ?? 0,
        totalAmount: cart?.totalAmount ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCart,
  getMyCartCount,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearMyCart,
};
