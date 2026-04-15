/**
 * 주문(Order) Mongoose 스키마
 * - 장바구니 → 주문 전환 시 상품 스냅샷(이름·이미지·단가)을 복사 보관
 * - pre('save') 훅으로 totalQuantity / totalAmount / grandTotal 자동 계산
 */
const mongoose = require("mongoose");

/* ------------------------------------------------------------------ */
/*  Sub-schemas                                                        */
/* ------------------------------------------------------------------ */

/** 주문 아이템 — 장바구니 아이템과 유사하되 상품 스냅샷 포함 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productName: { type: String, required: true, trim: true },
    productImage: { type: String, default: "" },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "단가는 0 이상이어야 합니다."],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "수량은 1 이상이어야 합니다."],
      default: 1,
    },
    color: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, default: "" },
    itemTotal: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

/** 배송지 */
const shippingSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, "수령인 이름은 필수입니다."],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "연락처는 필수입니다."],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "우편번호는 필수입니다."],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "기본 주소는 필수입니다."],
      trim: true,
    },
    addressDetail: { type: String, trim: true, default: "" },
    memo: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

/** 결제 */
const PAYMENT_METHODS = ["card", "bank_transfer", "virtual_account", "kakao_pay", "naver_pay"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: `결제 수단은 ${PAYMENT_METHODS.join(", ")} 중 하나여야 합니다.` },
      default: "card",
    },
    status: {
      type: String,
      enum: { values: PAYMENT_STATUSES, message: `결제 상태는 ${PAYMENT_STATUSES.join(", ")} 중 하나여야 합니다.` },
      default: "pending",
    },
    paidAt: { type: Date },
    transactionId: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/*  Order (메인)                                                       */
/* ------------------------------------------------------------------ */

const ORDER_STATUSES = [
  "pending",    // 주문 생성(미결제)
  "paid",       // 결제 완료
  "preparing",  // 상품 준비
  "shipped",    // 발송
  "delivered",  // 배송 완료
  "cancelled",  // 취소
];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "주문자는 필수입니다."],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "주문 상품은 1개 이상이어야 합니다.",
      },
    },
    shipping: {
      type: shippingSchema,
      required: [true, "배송지 정보는 필수입니다."],
    },
    payment: {
      type: paymentSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: { values: ORDER_STATUSES, message: `주문 상태는 ${ORDER_STATUSES.join(", ")} 중 하나여야 합니다.` },
      default: "pending",
    },
    totalQuantity: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    orderedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

/* ---------- helpers ---------- */

function aggregateOrderTotals(items) {
  let totalQuantity = 0;
  let totalAmount = 0;
  for (const line of items || []) {
    const q = Number(line.quantity);
    if (!Number.isFinite(q) || q < 1) continue;
    totalQuantity += q;
    const unit = Number.isFinite(Number(line.unitPrice)) ? Number(line.unitPrice) : 0;
    totalAmount += q * unit;
  }
  return { totalQuantity, totalAmount: Math.round(totalAmount) };
}

/** 주문번호 생성: ORD-YYYYMMDD-XXXXX (5자리 랜덤) */
function generateOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `ORD-${ymd}-${rand}`;
}

/* ---------- hooks ---------- */

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }

  for (const item of this.items) {
    item.itemTotal = Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
  }

  const { totalQuantity, totalAmount } = aggregateOrderTotals(this.items);
  this.totalQuantity = totalQuantity;
  this.totalAmount = totalAmount;
  this.grandTotal = totalAmount + (Number(this.shippingFee) || 0);

  next();
});

/* ---------- indexes ---------- */

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
