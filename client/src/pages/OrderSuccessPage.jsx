import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchOrderDetail } from "../api/orders";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./OrderSuccessPage.css";

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function getEstimatedDelivery() {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  const end = new Date();
  end.setDate(end.getDate() + 5);
  const fmt = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${fmt(start)} - ${fmt(end)}`;
}

const PAYMENT_MAP = {
  card: "신용/체크카드",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
  bank_transfer: "계좌이체",
  virtual_account: "가상계좌",
};

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user && token && orderId) {
      setLoadingOrder(true);
      fetchOrderDetail(token, orderId)
        .then(setOrder)
        .catch(() => navigate("/orders", { replace: true }))
        .finally(() => setLoadingOrder(false));
    }
  }, [loading, user, token, navigate, orderId]);

  if (loading || loadingOrder) {
    return (
      <div className="os-page">
        <HomeNavbar user={user} token={token} loading onLogout={handleLogout} />
        <main className="os-main"><p className="os-loading">불러오는 중…</p></main>
        <HomeFooter />
      </div>
    );
  }

  if (!order) return null;

  const s = order.shipping || {};

  return (
    <div className="os-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="os-main">
        {/* 성공 헤로 */}
        <div className="os-hero">
          <div className="os-check-circle">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="os-hero-title">주문이 성공적으로 완료되었습니다!</h1>
          <p className="os-hero-sub">주문해 주셔서 감사합니다.</p>
          <p className="os-hero-desc">주문 확인 이메일을 곧 받으실 수 있습니다.</p>
        </div>

        {/* 주문 정보 카드 */}
        <div className="os-card">
          <h2 className="os-card-title">
            <span className="os-card-icon">📋</span>
            주문 정보
          </h2>

          <div className="os-info-grid">
            <div className="os-info-item">
              <span className="os-info-label">주문 번호</span>
              <span className="os-info-value">{order.orderNumber}</span>
            </div>
            <div className="os-info-item">
              <span className="os-info-label">주문 날짜</span>
              <span className="os-info-value">{formatDate(order.orderedAt || order.createdAt)}</span>
            </div>
          </div>

          <div className="os-divider" />

          <h3 className="os-sub-title">주문 상품</h3>
          <ul className="os-items">
            {order.items.map((item) => (
              <li key={item._id} className="os-item">
                <div className="os-item-img">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" />
                  ) : (
                    <div className="os-item-img--empty" />
                  )}
                </div>
                <div className="os-item-info">
                  <p className="os-item-name">{item.productName}</p>
                  <p className="os-item-qty">수량: {item.quantity}</p>
                  <p className="os-item-price">{formatPriceKRW(item.itemTotal)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="os-divider" />

          <div className="os-total-row">
            <span className="os-total-label">총 결제 금액</span>
            <span className="os-total-price">{formatPriceKRW(order.grandTotal)}</span>
          </div>
        </div>

        {/* 배송 정보 카드 */}
        <div className="os-card">
          <h2 className="os-card-title">
            <span className="os-card-icon">📦</span>
            배송 정보
          </h2>

          <div className="os-delivery-banner">
            <span className="os-delivery-icon">📅</span>
            <div>
              <p className="os-delivery-label">예상 배송일</p>
              <p className="os-delivery-date">{getEstimatedDelivery()}</p>
            </div>
          </div>

          <h3 className="os-sub-title">배송 주소</h3>
          <div className="os-address">
            <p className="os-address-name">{s.recipientName}</p>
            <p>{s.phone}</p>
            <p>{s.postalCode}</p>
            <p>{s.address} {s.addressDetail}</p>
            {s.memo ? <p className="os-memo">배송 메모: {s.memo}</p> : null}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="os-actions">
          <Link to={`/orders/${order._id}`} className="os-btn os-btn--primary">주문 상세 보기</Link>
          <Link to="/" className="os-btn os-btn--secondary">쇼핑 계속하기</Link>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
