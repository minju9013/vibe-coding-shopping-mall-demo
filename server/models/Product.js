/**
 * 쇼핑몰 상품(Product) Mongoose 스키마
 * - 상품 CRUD는 routes/products 및 controllers/productController 참고
 */
const mongoose = require("mongoose");

/** API·검증에서 공통으로 쓰는 허용 카테고리 목록 */
const PRODUCT_CATEGORIES = ["outer", "top", "pants", "accessories"];

/** Cloudinary 업로드 결과: 삭제·변형 시 publicId, 화면 표시용 secureUrl */
const cloudinaryImageSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: [true, "Cloudinary publicId는 필수입니다."],
      trim: true,
    },
    secureUrl: {
      type: String,
      required: [true, "Cloudinary secureUrl은 필수입니다."],
      trim: true,
    },
  },
  { _id: false }
);

/** 상품 옵션 한 줄: 예) name "사이즈", values ["S","M","L"] */
const productOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "옵션 이름은 필수입니다."],
      trim: true,
    },
    values: {
      type: [String],
      required: [true, "옵션 값 목록은 필수입니다."],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "옵션 값은 하나 이상 있어야 합니다.",
      },
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // 재고·관리용 고유 코드(SKU). 상점에서 직접 부여, DB에서 unique, 생성 후 변경 불가(immutable)
    sku: {
      type: String,
      required: [true, "SKU는 필수입니다."],
      unique: true,
      immutable: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "상품 이름은 필수입니다."],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "상품 가격은 필수입니다."],
      min: [0, "가격은 0 이상이어야 합니다."],
    },
    // 정가(선택). 할인 표시 등에 사용
    listPrice: {
      type: Number,
      min: [0, "정가는 0 이상이어야 합니다."],
    },
    category: {
      type: String,
      required: [true, "카테고리는 필수입니다."],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: `카테고리는 ${PRODUCT_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
      },
    },
    image: {
      type: cloudinaryImageSchema,
      required: [true, "상품 이미지는 필수입니다."],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    options: {
      type: [productOptionSchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 관리
  }
);

// 카테고리별 목록 조회 등에 사용
productSchema.index({ category: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
