import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchOrderDetail, cancelOrder } from "../api/orders";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./OrderDetailPage.css";

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const STATUS_MAP = {
  pending: "결제 대기",
  paid: "결제 완료",
  preparing: "상품 준비중",
  shipped: "배송중",
  delivered: "배송 완료",
  cancelled: "주문 취소",
};

const PAYMENT_MAP = {
  card: "신용/체크카드",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
  bank_transfer: "계좌이체",
  virtual_account: "가상계좌",
};

function StatusBadge({ status }) {
  return (
    <span className={`od-status-badge od-status--${status}`}>
      {STATUS_MAP[status] ?? status}
    </span>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: `/orders/${orderId}` } });
      return;
    }
    if (user && token && orderId) {
      setLoadingOrder(true);
      setError("");
      fetchOrderDetail(token, orderId)
        .then(setOrder)
        .catch((e) => setError(e.message || "주문 정보를 불러올 수 없습니다."))
        .finally(() => setLoadingOrder(false));
    }
  }, [loading, user, token, navigate, orderId]);

  const handleCancel = async () => {
    if (!token || !order) return;
    if (!window.confirm("정말 이 주문을 취소하시겠습니까?")) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(token, order._id);
      setOrder(updated);
    } catch (e) {
      window.alert(e.message || "주문 취소에 실패했습니다.");
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = order && ["pending", "paid"].includes(order.status);

  if (loading || loadingOrder) {
    return (
      <div className="od-page">
        <HomeNavbar user={user} token={token} loading onLogout={handleLogout} />
        <main className="od-main"><p className="od-loading">불러오는 중…</p></main>
        <HomeFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="od-page">
        <HomeNavbar user={user} token={token} loading={false} onLogout={handleLogout} />
        <main className="od-main"><p className="od-error">{error}</p></main>
        <HomeFooter />
      </div>
    );
  }

  if (!order) return null;

  const s = order.shipping || {};

  return (
    <div className="od-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="od-main">
        <h1 className="od-page-title">주문 상세</h1>

        <div className="od-header">
          <div>
            <h2 className="od-title">{order.orderNumber}</h2>
            <p className="od-date">{formatDateTime(order.orderedAt || order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* 주문 상품 */}
        <section className="od-section">
          <h2 className="od-section-title">주문 상품</h2>
          <ul className="od-items">
            {order.items.map((item) => (
              <li key={item._id} className="od-item">
                <div className="od-item-img">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" />
                  ) : (
                    <div className="od-item-img--empty" />
                  )}
                </div>
                <div className="od-item-info">
                  <p className="od-item-name">
                    {item.product ? (
                      <Link to={`/products/${typeof item.product === "object" ? item.product._id : item.product}`}>
                        {item.productName}
                      </Link>
                    ) : (
                      item.productName
                    )}
                  </p>
                  <p className="od-item-meta">
                    {item.color ? `색상: ${item.color}` : null}
                    {item.color && item.size ? " / " : null}
                    {item.size ? `사이즈: ${item.size}` : null}
                  </p>
                  <p className="od-item-qty">수량: {item.quantity}개</p>
                </div>
                <p className="od-item-price">{formatPriceKRW(item.itemTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 배송지 정보 */}
        <section className="od-section">
          <h2 className="od-section-title">배송지 정보</h2>
          <dl className="od-dl">
            <dt>수령인</dt>
            <dd>{s.recipientName}</dd>
            <dt>연락처</dt>
            <dd>{s.phone}</dd>
            <dt>주소</dt>
            <dd>
              ({s.postalCode}) {s.address}
              {s.addressDetail ? ` ${s.addressDetail}` : ""}
            </dd>
            {s.memo ? (
              <>
                <dt>배송 메모</dt>
                <dd>{s.memo}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {/* 결제 정보 */}
        <section className="od-section">
          <h2 className="od-section-title">결제 정보</h2>
          <dl className="od-dl">
            <dt>결제 수단</dt>
            <dd>{PAYMENT_MAP[order.payment?.method] ?? order.payment?.method ?? "—"}</dd>
            <dt>결제 상태</dt>
            <dd>{order.payment?.status === "paid" ? "결제 완료" : order.payment?.status ?? "—"}</dd>
            {order.payment?.paidAt ? (
              <>
                <dt>결제 시각</dt>
                <dd>{formatDateTime(order.payment.paidAt)}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {/* 금액 요약 */}
        <section className="od-section od-summary">
          <div className="od-summary-row">
            <span>상품 금액</span>
            <span>{formatPriceKRW(order.totalAmount)}</span>
          </div>
          <div className="od-summary-row">
            <span>배송비</span>
            <span>{order.shippingFee === 0 ? "무료" : formatPriceKRW(order.shippingFee)}</span>
          </div>
          <div className="od-summary-divider" />
          <div className="od-summary-row od-summary-grand">
            <span>총 결제금액</span>
            <span>{formatPriceKRW(order.grandTotal)}</span>
          </div>
        </section>

        {/* 취소 사유 */}
        {order.status === "cancelled" && order.cancelReason ? (
          <section className="od-section">
            <h2 className="od-section-title">취소 사유</h2>
            <p className="od-cancel-reason">{order.cancelReason}</p>
          </section>
        ) : null}

        {/* 액션 */}
        <div className="od-actions">
          {canCancel ? (
            <button
              type="button"
              className="od-cancel-btn"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "처리 중…" : "주문 취소"}
            </button>
          ) : null}
          <Link to="/orders" className="od-list-btn">주문 내역으로</Link>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
