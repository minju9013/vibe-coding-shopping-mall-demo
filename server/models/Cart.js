/**
 * 장바구니(Cart) Mongoose 스키마
 * - 로그인 사용자당 하나의 장바구니 문서(user 필드 unique)
 * - 라인 아이템: 상품 참조, 수량, 선택 옵션(색상·사이즈), 담기 시점 단가 스냅샷(선택)
 */
const mongoose = require("mongoose");

/** 장바구니 내 개별 상품 한 줄 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "상품은 필수입니다."],
    },
    quantity: {
      type: Number,
      required: [true, "수량은 필수입니다."],
      min: [1, "수량은 1 이상이어야 합니다."],
      default: 1,
    },
    /** 선택 색상 라벨(예: API 옵션 "색상" 값 또는 표시명) */
    color: {
      type: String,
      trim: true,
      default: "",
    },
    /** 선택 사이즈(예: "M", "L") */
    size: {
      type: String,
      trim: true,
      default: "",
    },
    /**
     * 담은 시점 단가(원). totalAmount 집계에 사용.
     * 비어 있으면 해당 줄은 금액 합계에 0으로 반영되므로, 담기 API에서 채우는 것을 권장.
     */
    unitPrice: {
      type: Number,
      min: [0, "단가는 0 이상이어야 합니다."],
    },
  },
  { _id: true }
);

/** items 배열로부터 전체 수량·금액 합산 (원 단위 금액은 정수로 반올림) */
function aggregateCartTotals(items) {
  let totalQuantity = 0;
  let totalAmount = 0;
  for (const line of items || []) {
    const q = Number(line.quantity);
    if (!Number.isFinite(q) || q < 1) continue;
    totalQuantity += q;
    const unit =
      line.unitPrice != null && Number.isFinite(Number(line.unitPrice))
        ? Number(line.unitPrice)
        : 0;
    totalAmount += q * unit;
  }
  return {
    totalQuantity,
    totalAmount: Math.round(totalAmount),
  };
}

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "사용자는 필수입니다."],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    /** 라인 수량 합 (품목 종류가 아닌 총 개수) */
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** 라인별 quantity × unitPrice 합계(원). unitPrice 없는 줄은 0으로 계산 */
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.pre("save", function (next) {
  const { totalQuantity, totalAmount } = aggregateCartTotals(this.items);
  this.totalQuantity = totalQuantity;
  this.totalAmount = totalAmount;
  next();
});

/** findOneAndUpdate 등 save를 거치지 않는 갱신 후 수동 호출용 */
cartSchema.methods.recalculateTotals = function recalculateTotals() {
  const { totalQuantity, totalAmount } = aggregateCartTotals(this.items);
  this.totalQuantity = totalQuantity;
  this.totalAmount = totalAmount;
  return this;
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
