/**
 * CheckoutPage — 주문/결제 페이지
 *
 * 결제 흐름 (포트원 V2 SDK):
 *  1. 장바구니 데이터를 불러와 주문 요약을 표시
 *  2. 배송 정보 및 결제 수단을 입력받음
 *  3. "주문하기" 클릭 → PortOne.requestPayment() 호출
 *  4. 결제 성공 시 → paymentId와 함께 서버에 주문 생성 요청
 *  5. 결제 실패/취소 시 → 에러 메시지 표시, 주문 미생성
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { fetchMyCart } from "../api/cart";
import { createOrder } from "../api/orders";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./CheckoutPage.css";

const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;

/** 숫자를 원화(₩) 형식 문자열로 변환. NaN이면 "—" 반환 */
function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

/**
 * 결제 수단 목록
 * - value: 서버에 저장되는 내부 식별값
 * - label: UI에 표시되는 한글 명칭
 * - payMethod: 포트원 V2 PortOne.requestPayment에 전달하는 결제 수단 코드
 */
const PAYMENT_OPTIONS = [
  { value: "card", label: "신용카드", payMethod: "CARD" },
  { value: "bank_transfer", label: "계좌이체", payMethod: "TRANSFER" },
  { value: "kakao_pay", label: "카카오페이", payMethod: "EASY_PAY" },
  { value: "naver_pay", label: "네이버페이", payMethod: "EASY_PAY" },
  { value: "virtual_account", label: "가상계좌", payMethod: "VIRTUAL_ACCOUNT" },
];

/** 배송 요청사항 드롭다운 선택지. "직접 입력" 선택 시 텍스트 입력란 노출 */
const MEMO_OPTIONS = [
  "배송 시 요청사항 (선택)",
  "문 앞에 놓아주세요",
  "부재시 경비실에 맡겨주세요",
  "배송 전 미리 연락주세요",
  "직접 입력",
];

export default function CheckoutPage() {
  const { user, token, loading, logout } = useAuth();
  const { bumpCart } = useCart();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shipping, setShipping] = useState({
    recipientName: "",
    phone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    memo: "",
  });
  const [memoSelect, setMemoSelect] = useState(MEMO_OPTIONS[0]);
  const [customMemo, setCustomMemo] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("card");

  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: "" });
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast({ show: true, message });
    toastTimer.current = setTimeout(() => setToast({ show: false, message: "" }), 3000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID;
  const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

  /* ── 인증 확인 및 장바구니 로드 ──
   * - 비로그인 → 로그인 페이지로 리다이렉트 (결제 후 /checkout 복귀)
   * - 장바구니 비어 있으면 → /cart 로 리다이렉트 */
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: "/checkout" } });
      return;
    }
    if (user && token) {
      setLoadingCart(true);
      fetchMyCart(token)
        .then((data) => {
          if (!data?.items?.length) {
            navigate("/cart", { replace: true });
            return;
          }
          setCart(data);
          setShipping((prev) => ({
            ...prev,
            recipientName: prev.recipientName || user.name || "",
          }));
        })
        .catch(() => navigate("/cart", { replace: true }))
        .finally(() => setLoadingCart(false));
    }
  }, [loading, user, token, navigate]);

  /* ── 금액 계산 ── */
  const totalQuantity = cart?.totalQuantity ?? 0;
  const totalAmount = cart?.totalAmount ?? 0;
  const shippingFee = 0;
  const grandTotal = totalAmount + shippingFee;

  /** 필수 배송 필드(수령인, 연락처, 우편번호, 주소)가 모두 입력되었는지 검증 */
  const isFormValid = useMemo(() => {
    const s = shipping;
    return s.recipientName.trim() && s.phone.trim() && s.postalCode.trim() && s.address.trim();
  }, [shipping]);

  const handleShippingChange = (field) => (e) => {
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleMemoSelect = (e) => {
    const val = e.target.value;
    setMemoSelect(val);
    if (val !== "직접 입력" && val !== MEMO_OPTIONS[0]) {
      setShipping((prev) => ({ ...prev, memo: val }));
      setCustomMemo("");
    } else if (val === MEMO_OPTIONS[0]) {
      setShipping((prev) => ({ ...prev, memo: "" }));
      setCustomMemo("");
    }
  };

  const handleCustomMemo = (e) => {
    setCustomMemo(e.target.value);
    setShipping((prev) => ({ ...prev, memo: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || submitting) return;

    const errors = {};
    if (!shipping.phone.trim() || !PHONE_REGEX.test(shipping.phone.trim())) errors.phone = true;
    if (!shipping.addressDetail.trim()) errors.addressDetail = true;
    if (!shipping.recipientName.trim()) errors.recipientName = true;
    if (!shipping.address.trim()) errors.address = true;
    if (!shipping.postalCode.trim()) errors.postalCode = true;

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      if (errors.phone) showToast("올바른 연락처를 입력해주세요. (예: 010-1234-5678)");
      else if (errors.addressDetail) showToast("상세주소를 입력해주세요.");
      else showToast("필수 항목을 모두 입력해주세요.");
      return;
    }
    setFieldErrors({});

    if (!window.PortOne) {
      showToast("결제 모듈을 불러오지 못했습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    setSubmitting(true);

    const paymentId = `payment_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const selected = PAYMENT_OPTIONS.find((o) => o.value === paymentMethod) || PAYMENT_OPTIONS[0];

    const orderName =
      cart?.items?.length > 1
        ? `${cart.items[0].product?.name ?? "상품"} 외 ${cart.items.length - 1}건`
        : cart?.items?.[0]?.product?.name ?? "상품";

    try {
      const response = await window.PortOne.requestPayment({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount: grandTotal,
        currency: "CURRENCY_KRW",
        payMethod: selected.payMethod,
        customer: {
          fullName: shipping.recipientName,
          phoneNumber: shipping.phone,
          email: user?.email || undefined,
          address: {
            addressLine1: shipping.address,
            addressLine2: shipping.addressDetail.trim(),
            zipcode: shipping.postalCode,
          },
        },
      });

      if (response.code != null) {
        const params = new URLSearchParams({
          reason: response.message || "결제가 완료되지 않았습니다.",
          code: response.code || "",
        });
        navigate(`/order-fail?${params}`, { replace: true });
        return;
      }

      const order = await createOrder(token, {
        shipping,
        paymentMethod,
        paymentId: response.paymentId,
      });
      bumpCart();
      navigate(`/orders/${order._id}/success`, { replace: true });
    } catch (err) {
      const params = new URLSearchParams({
        reason: err.message || "결제 처리 중 오류가 발생했습니다.",
      });
      navigate(`/order-fail?${params}`, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingCart) {
    return (
      <div className="checkout-page">
        <HomeNavbar user={user} token={token} loading onLogout={handleLogout} />
        <main className="checkout-main"><p className="checkout-loading">불러오는 중…</p></main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="checkout-main">
        {/* 스텝 인디케이터 */}
        <div className="checkout-steps">
          <div className="checkout-step checkout-step--active">
            <span className="checkout-step-num">1</span>
            <span className="checkout-step-label">배송정보</span>
          </div>
          <div className="checkout-step-line" />
          <div className="checkout-step">
            <span className="checkout-step-num">2</span>
            <span className="checkout-step-label">결제정보</span>
          </div>
          <div className="checkout-step-line" />
          <div className="checkout-step">
            <span className="checkout-step-num">3</span>
            <span className="checkout-step-label">주문완료</span>
          </div>
        </div>

        <form className="checkout-grid" onSubmit={handleSubmit} noValidate>
          {/* ========== 왼쪽: 배송정보 + 배송방법 + 결제정보 ========== */}
          <div className="checkout-left">

            {/* 배송 정보 */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">
                <span className="checkout-section-icon">📦</span>
                배송 정보
              </h2>

              <div className="checkout-field-row">
                <label className="checkout-label">
                  <span>받는 분 *</span>
                  <input
                    type="text"
                    className={`checkout-input${fieldErrors.recipientName ? " checkout-input--error" : ""}`}
                    value={shipping.recipientName}
                    onChange={handleShippingChange("recipientName")}
                    placeholder="이름"
                  />
                </label>
                <label className="checkout-label">
                  <span>연락처 *</span>
                  <input
                    type="tel"
                    className={`checkout-input${fieldErrors.phone ? " checkout-input--error" : ""}`}
                    value={shipping.phone}
                    onChange={handleShippingChange("phone")}
                    placeholder="010-1234-5678"
                  />
                </label>
              </div>

              <label className="checkout-label">
                <span>주소 *</span>
                <input
                  type="text"
                  className={`checkout-input${fieldErrors.address ? " checkout-input--error" : ""}`}
                  value={shipping.address}
                  onChange={handleShippingChange("address")}
                  placeholder="기본 주소"
                />
              </label>

              <label className="checkout-label">
                <span>상세 주소 *</span>
                <input
                  type="text"
                  className={`checkout-input${fieldErrors.addressDetail ? " checkout-input--error" : ""}`}
                  value={shipping.addressDetail}
                  onChange={handleShippingChange("addressDetail")}
                  placeholder="동/호수 등 상세 주소"
                />
              </label>

              <div className="checkout-field-row">
                <label className="checkout-label">
                  <span>우편번호 *</span>
                  <input
                    type="text"
                    className={`checkout-input${fieldErrors.postalCode ? " checkout-input--error" : ""}`}
                    value={shipping.postalCode}
                    onChange={handleShippingChange("postalCode")}
                    placeholder="12345"
                  />
                </label>
                <label className="checkout-label">
                  <span>배송 요청사항</span>
                  <select
                    className="checkout-input checkout-select"
                    value={memoSelect}
                    onChange={handleMemoSelect}
                  >
                    {MEMO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
              </div>

              {memoSelect === "직접 입력" ? (
                <label className="checkout-label">
                  <input
                    type="text"
                    className="checkout-input"
                    value={customMemo}
                    onChange={handleCustomMemo}
                    placeholder="배송 시 요청사항을 입력해주세요"
                  />
                </label>
              ) : null}
            </section>

            {/* 배송 방법 */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">
                <span className="checkout-section-icon">🚚</span>
                배송 방법
              </h2>
              <div className="checkout-shipping-method">
                <div className="checkout-shipping-method-info">
                  <span className="checkout-shipping-method-name">일반 배송</span>
                  <span className="checkout-shipping-method-desc">3-5 영업일</span>
                </div>
                <span className="checkout-shipping-method-price">무료</span>
              </div>
            </section>

            {/* 결제 정보 */}
            <section className="checkout-section checkout-section--last">
              <h2 className="checkout-section-title">
                <span className="checkout-section-icon">💳</span>
                결제 정보
              </h2>
              <div className="checkout-payment-options">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="checkout-payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                    />
                    <span className="checkout-payment-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* ========== 오른쪽: 주문 요약 (sticky) ========== */}
          <aside className="checkout-right">
            <div className="checkout-summary-card">
              <h2 className="checkout-summary-title">주문 요약</h2>

              {/* 상품 목록 */}
              <ul className="checkout-summary-items">
                {cart?.items?.map((line) => {
                  const p = line.product;
                  const img = p?.image?.secureUrl;
                  const sub = Math.round((line.unitPrice ?? 0) * (line.quantity ?? 0));
                  return (
                    <li key={line._id} className="checkout-summary-item">
                      <div className="checkout-summary-item-img">
                        {img ? <img src={img} alt="" /> : <div className="checkout-summary-item-img--empty" />}
                      </div>
                      <div className="checkout-summary-item-info">
                        <p className="checkout-summary-item-name">{p?.name ?? "삭제된 상품"}</p>
                        <p className="checkout-summary-item-qty">{line.quantity}개</p>
                        <p className="checkout-summary-item-price">{formatPriceKRW(sub)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="checkout-summary-divider" />

              {/* 금액 */}
              <div className="checkout-summary-row">
                <span>상품 수량 ({totalQuantity}개)</span>
                <span>{formatPriceKRW(totalAmount)}</span>
              </div>
              <div className="checkout-summary-row">
                <span>배송비</span>
                <span className="checkout-summary-free">{shippingFee === 0 ? "무료" : formatPriceKRW(shippingFee)}</span>
              </div>

              <div className="checkout-summary-divider" />

              <div className="checkout-summary-row checkout-summary-total">
                <span>총 결제금액</span>
                <span className="checkout-summary-grand-price">{formatPriceKRW(grandTotal)}</span>
              </div>

              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={!isFormValid || submitting}
              >
                {submitting ? "처리 중…" : "주문하기"}
              </button>

              <p className="checkout-agreement">
                개인정보처리방침 및 이용약관에 동의한 것으로 간주됩니다.
              </p>
            </div>
          </aside>
        </form>
      </main>

      <HomeFooter />

      {toast.show && (
        <div className="checkout-toast" role="alert">
          <span className="checkout-toast-icon">⚠️</span>
          <span className="checkout-toast-msg">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
