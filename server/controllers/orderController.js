/**
 * 주문(Order) 컨트롤러
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API 엔드포인트 목록                                              │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  POST   /api/orders                    → checkout             │
 * │  GET    /api/orders/me                 → getMyOrders          │
 * │  GET    /api/orders/me/:orderId        → getOrderDetail       │
 * │  PATCH  /api/orders/me/:orderId/cancel → cancelOrder          │
 * │  PATCH  /api/orders/:orderId/status    → updateOrderStatus    │
 * │  GET    /api/orders/admin              → getAllOrders         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 검증(Validation) 전략:
 *  - 클라이언트(CheckoutPage.jsx): UX용 즉시 피드백 (빨간 테두리 + 토스트)
 *  - 서버(이 파일): 보안용 최종 검증 (API 직접 호출 방어)
 *    → 주문 중복 체크 (동일 paymentId로 이중 주문 방지)
 *    → 포트원 V2 API로 결제 금액·상태 검증
 */
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");

/* ================================================================== */
/*  포트원 V2 결제 검증 헬퍼                                             */
/*                                                                    */
/*  포트원 REST API로 결제 건을 조회하여 실제 결제가 이루어졌는지,           */
/*  결제 금액이 서버에서 계산한 금액과 일치하는지 검증한다.                   */
/*                                                                    */
/*  API: GET https://api.portone.io/payments/{paymentId}              */
/*  인증: Authorization: PortOne {V2_API_SECRET}                       */
/*                                                                    */
/*  반환값:                                                             */
/*    성공 → { verified: true, payment: { ... } }                      */
/*    실패 → { verified: false, reason: "사유" }                        */
/*    설정 없음 → { verified: true, skipped: true }  (개발 편의)         */
/* ================================================================== */
async function verifyPortonePayment(paymentId, expectedAmount) {
  const apiSecret = process.env.PORTONE_V2_API_SECRET;

  /* API Secret이 설정되지 않은 경우 검증을 건너뜀 (개발/테스트 환경) */
  if (!apiSecret) {
    console.warn("[결제검증] PORTONE_V2_API_SECRET 미설정 — 검증 생략");
    return { verified: true, skipped: true };
  }

  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${apiSecret}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { verified: false, reason: body.message || `포트원 API 오류 (${res.status})` };
    }

    const payment = await res.json();

    /* 결제 상태 확인: "PAID"여야 정상 결제 */
    if (payment.status !== "PAID") {
      return { verified: false, reason: `결제 상태가 PAID가 아닙니다. (현재: ${payment.status})` };
    }

    /* 결제 금액 일치 확인: 클라이언트 조작 방지 */
    if (payment.amount?.total !== expectedAmount) {
      return {
        verified: false,
        reason: `결제 금액 불일치 (기대: ${expectedAmount}원, 실제: ${payment.amount?.total}원)`,
      };
    }

    return { verified: true, payment };
  } catch (err) {
    return { verified: false, reason: `결제 검증 중 오류: ${err.message}` };
  }
}

/**
 * 주문 상세 조회 시 상품(Product) 정보를 함께 가져오기 위한 populate 옵션
 * → items.product 필드에서 name, price, image, sku만 선택적으로 로드
 */
const ITEM_POPULATE = {
  path: "items.product",
  select: "name price image sku",
};

/* ================================================================== */
/*  1) POST /api/orders — 주문 생성 (체크아웃)                          */
/*                                                                    */
/*  처리 흐름:                                                          */
/*    ① 배송 정보 필수값 검증                                            */
/*    ② 결제 수단·결제 ID 검증                                           */
/*    ③ 주문 중복 체크 (동일 paymentId 이중 주문 방지)                     */
/*    ④ 장바구니 존재 여부 확인                                           */
/*    ⑤ 포트원 V2 API 결제 검증 (금액·상태 확인)                           */
/*    ⑥ 장바구니 아이템 → 주문 아이템 스냅샷 변환                           */
/*    ⑦ Order 문서 생성 & 저장                                          */
/*    ⑧ 장바구니 비우기                                                  */
/*    ⑨ 생성된 주문 데이터 응답                                           */
/* ================================================================== */
exports.checkout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shipping, paymentMethod, paymentId, impUid, merchantUid } = req.body;

    /* ── ① 필수 배송 정보 검증 ──
     * recipientName : 수령인 이름
     * phone         : 연락처
     * postalCode    : 우편번호
     * address       : 기본 주소
     * (addressDetail, memo는 선택)
     */
    if (!shipping || !shipping.recipientName || !shipping.phone || !shipping.postalCode || !shipping.address) {
      return res.status(400).json({ success: false, message: "배송지 정보가 부족합니다." });
    }

    /* ── ② 결제 데이터 검증 ──
     * paymentId : 포트원 V2 결제 완료 후 받은 결제 고유 ID
     * impUid    : 포트원 V1 하위 호환용 (레거시)
     * 둘 다 없으면 결제가 정상적으로 이루어지지 않은 것으로 판단
     */
    if (!paymentId && !impUid) {
      return res.status(400).json({ success: false, message: "결제 정보가 누락되었습니다." });
    }

    /* ── ② 결제 수단 검증 ──
     * 허용 값: card, bank_transfer, virtual_account, kakao_pay, naver_pay
     * (Order 모델의 PAYMENT_METHODS 참조)
     */
    const { PAYMENT_METHODS } = require("../models/Order");
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "유효하지 않은 결제 수단입니다." });
    }

    /* ── ③ 주문 중복 체크 ──
     * 동일한 paymentId(또는 impUid)로 이미 주문이 생성되었는지 확인
     * → 네트워크 오류 등으로 클라이언트가 같은 요청을 재전송하는 경우 방지
     * → 악의적 이중 주문 시도 차단
     */
    const transactionId = paymentId || impUid;
    const existingOrder = await Order.findOne({ "payment.transactionId": transactionId }).lean();
    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "이미 처리된 결제입니다. 주문 내역을 확인해주세요.",
        orderId: existingOrder._id,
      });
    }

    /* ── ④ 장바구니 조회 ──
     * 현재 로그인 사용자의 장바구니를 가져오고,
     * 각 아이템의 상품(Product) 정보를 populate로 함께 로드
     */
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price image",
    });

    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: "장바구니가 비어 있습니다." });
    }

    /* ── ⑤ 포트원 V2 결제 검증 ──
     * 장바구니 금액을 서버에서 다시 계산하여 포트원에 실제 결제된 금액과 비교
     * → 클라이언트에서 결제 금액을 조작하는 것을 방지
     *
     * 검증 항목:
     *   1) 결제 상태가 "PAID"인지
     *   2) 결제 금액이 서버에서 계산한 장바구니 총액과 일치하는지
     */
    const expectedAmount = cart.items.reduce((sum, line) => {
      const unitPrice = line.unitPrice ?? line.product?.price ?? 0;
      return sum + Math.round(unitPrice * (line.quantity ?? 0));
    }, 0);

    const verification = await verifyPortonePayment(transactionId, expectedAmount);
    if (!verification.verified) {
      console.error(`[결제검증 실패] paymentId=${transactionId}, reason=${verification.reason}`);
      return res.status(400).json({
        success: false,
        message: `결제 검증에 실패했습니다: ${verification.reason}`,
      });
    }
    if (verification.skipped) {
      console.warn(`[결제검증] paymentId=${transactionId} — API Secret 미설정으로 검증 생략됨`);
    }

    /* ── ⑥ 장바구니 → 주문 아이템 스냅샷 ──
     * 주문 시점의 상품 정보(이름, 이미지, 단가)를 복사해서 보관
     * → 나중에 상품이 수정/삭제되어도 주문 내역은 변하지 않음
     */
    const orderItems = cart.items.map((line) => {
      const p = line.product;
      return {
        product: p?._id ?? null,            // 상품 ObjectId (참조용)
        productName: p?.name ?? "삭제된 상품", // 스냅샷: 상품명
        productImage: p?.image?.secureUrl ?? "", // 스냅샷: 이미지 URL
        unitPrice: line.unitPrice ?? p?.price ?? 0, // 스냅샷: 단가
        quantity: line.quantity,              // 수량
        color: line.color,                   // 선택한 색상
        size: line.size,                     // 선택한 사이즈
      };
    });

    /* ── ⑦ Order 문서 생성 ──
     * totalQuantity, totalAmount, grandTotal은 Order 모델의
     * pre('save') 훅에서 자동 계산됨
     */
    const order = new Order({
      user: userId,
      items: orderItems,

      // 배송지 정보
      shipping: {
        recipientName: shipping.recipientName,
        phone: shipping.phone,
        postalCode: shipping.postalCode,
        address: shipping.address,
        addressDetail: shipping.addressDetail || "",
        memo: shipping.memo || "",
      },

      // 결제 정보
      payment: {
        method: paymentMethod || "card",     // 결제 수단
        status: "paid",                      // 결제 상태 (결제 완료)
        paidAt: new Date(),                  // 결제 완료 시각
        transactionId: paymentId || impUid || "", // 포트원 결제 트랜잭션 ID
      },

      status: "paid",       // 주문 상태: 결제 완료
      orderedAt: new Date(), // 주문 일시
    });

    await order.save();

    /* ── ⑧ 장바구니 비우기 ──
     * 주문이 성공적으로 생성되었으므로 장바구니를 초기화
     */
    cart.items = [];
    await cart.save();

    /* ── ⑨ 응답 ── */
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/* ================================================================== */
/*  1-b) GET /api/orders/admin — 관리자 전체 주문 목록                   */
/* ================================================================== */
exports.getAllOrders = async (req, res, next) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "관리자 권한이 필요합니다." });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    const rawStatus = req.query.status;
    const statusNorm =
      typeof rawStatus === "string" && rawStatus.trim().length > 0
        ? rawStatus.trim().toLowerCase()
        : "";
    if (statusNorm && statusNorm !== "all" && Order.ORDER_STATUSES.includes(statusNorm)) {
      filter.status = statusNorm;
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      if (s) {
        const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        const orConds = [
          { orderNumber: regex },
          { "shipping.recipientName": regex },
        ];
        const matchingUsers = await User.find({
          $or: [{ email: regex }, { name: regex }],
        })
          .select("_id")
          .lean();
        const userIds = matchingUsers.map((u) => u._id).filter(Boolean);
        if (userIds.length) {
          orConds.push({ user: { $in: userIds } });
        }
        filter.$or = orConds;
      }
    }

    /* 목록에는 상품 스냅샷만 쓰므로 items.product populate 생략 — 잘못된 ref 등으로 전체 쿼리가 실패하는 것을 방지 */
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate({ path: "user", select: "name email userType" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ================================================================== */
/*  2) GET /api/orders/me — 내 주문 목록 (페이지네이션)                   */
/*                                                                    */
/*  쿼리 파라미터:                                                      */
/*    page  : 페이지 번호 (기본 1, 최소 1)                                */
/*    limit : 한 페이지당 개수 (기본 10, 최소 1, 최대 50)                   */
/*                                                                    */
/*  응답: { orders, page, totalPages, totalOrders }                    */
/* ================================================================== */
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 페이지네이션 파라미터 파싱 및 범위 제한
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // 주문 목록 + 전체 건수를 동시에 조회 (성능 최적화)
    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })  // 최신 주문 먼저
        .skip(skip)
        .limit(limit)
        .lean(),                  // 읽기 전용이므로 lean()으로 성능 향상
      Order.countDocuments({ user: userId }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ================================================================== */
/*  3) GET /api/orders/me/:orderId — 주문 상세 조회                     */
/*                                                                    */
/*  보안: user 필터로 본인 주문만 조회 가능                                */
/*  populate: 상품 정보(name, price, image, sku)를 함께 로드              */
/* ================================================================== */
exports.getOrderDetail = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 본인 주문만 조회 (user + orderId 조합)
    const order = await Order.findOne({ _id: req.params.orderId, user: userId })
      .populate(ITEM_POPULATE)
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/* ================================================================== */
/*  4) PATCH /api/orders/me/:orderId/cancel — 주문 취소 (사용자)        */
/*                                                                    */
/*  취소 가능 조건: 주문 상태가 "pending" 또는 "paid"일 때만               */
/*  취소 시:                                                           */
/*    - status → "cancelled"                                          */
/*    - cancelledAt → 현재 시각                                        */
/*    - cancelReason → 요청 body의 reason (선택)                        */
/*    - payment.status → "refunded"                                   */
/* ================================================================== */
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const order = await Order.findOne({ _id: req.params.orderId, user: userId });

    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    // 취소 가능 상태 검증: pending(미결제) 또는 paid(결제완료)만 허용
    if (!["pending", "paid"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `현재 주문 상태(${order.status})에서는 취소할 수 없습니다.`,
      });
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || "";
    if (order.payment) order.payment.status = "refunded";

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/* ================================================================== */
/*  5) PATCH /api/orders/:orderId/status — 주문 상태 변경 (관리자 전용)  */
/*                                                                    */
/*  권한: userType === "admin" 만 허용                                  */
/*                                                                    */
/*  허용 상태값 (Order 모델 참조):                                       */
/*    pending → paid → preparing → shipped → delivered                */
/*    어느 단계에서든 → cancelled                                        */
/*                                                                    */
/*  상태별 부가 처리:                                                    */
/*    "cancelled" → cancelledAt, cancelReason 기록                     */
/*    "paid"      → payment.status = "paid", paidAt 기록               */
/* ================================================================== */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    // 관리자 권한 확인
    if (req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "관리자 권한이 필요합니다." });
    }

    const { status } = req.body;
    const { ORDER_STATUSES } = require("../models/Order");

    // 상태값 유효성 검증
    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "유효하지 않은 주문 상태입니다." });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    order.status = status;

    // 취소 시 부가 정보 기록
    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelReason = req.body.reason || "관리자 취소";
    }

    // 결제 완료 처리 시 결제 정보 갱신
    if (status === "paid" && order.payment) {
      order.payment.status = "paid";
      order.payment.paidAt = order.payment.paidAt || new Date();
    }

    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
