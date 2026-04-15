import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchAllOrders } from "../../api/orders";
import { ORDER_STATUS_LABELS } from "../../constants/orderStatus";
import "./AdminPage.css";

const stats = [
  {
    label: "총 주문",
    value: "1,234",
    trend: "+12% from last month",
    tone: "blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    label: "총 상품",
    value: "156",
    trend: "+3% from last month",
    tone: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    ),
  },
  {
    label: "총 고객",
    value: "2,345",
    trend: "+8% from last month",
    tone: "purple",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "총 매출",
    value: "$45,678",
    trend: "+15% from last month",
    tone: "orange",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </svg>
    ),
  },
];

function formatDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatPriceKRW(n) {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  return `₩${num.toLocaleString("ko-KR")}`;
}

/** 대시보드 배지 색용 (기존 admin-status--* 클래스에 맞춤) */
function adminDashboardStatusClass(status) {
  if (status === "shipped") return "shipping";
  if (status === "delivered") return "done";
  if (status === "cancelled") return "cancelled";
  return "processing";
}

function AdminPage() {
  const { user, token, loading } = useAuth();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentOrdersError, setRecentOrdersError] = useState("");
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user || user.userType !== "admin" || !token) {
      setRecentOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setRecentOrdersLoading(true);
    (async () => {
      try {
        const data = await fetchAllOrders(token, { page: 1, limit: 8, status: "all" });
        if (!cancelled) {
          setRecentOrders(data.orders ?? []);
          setRecentOrdersError("");
        }
      } catch (e) {
        if (!cancelled) setRecentOrdersError(e.message || "주문을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setRecentOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (loading) {
    return <div className="admin-loading">불러오는 중…</div>;
  }

  if (!user || user.userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <Link to="/" className="admin-logo">KINETIC</Link>
          <span className="admin-badge">ADMIN</span>
        </div>
        <Link to="/" className="admin-back-btn">
          쇼핑몰로 돌아가기
        </Link>
      </header>

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-title">관리자 대시보드</h1>
          <p className="admin-subtitle">
            KINETIC 쇼핑몰 관리 시스템에 오신 것을 환영합니다.
          </p>
        </header>

        <section className="admin-dashboard" aria-label="대시보드 요약 및 관리">
          <div className="admin-stats-pair" role="group" aria-label="요약 통계 왼쪽 열">
            {stats.slice(0, 2).map((s) => (
              <article key={s.label} className="admin-stat-card">
                <div>
                  <p className="admin-stat-label">{s.label}</p>
                  <p className="admin-stat-value">{s.value}</p>
                  <p className="admin-stat-trend">{s.trend}</p>
                </div>
                <div className={`admin-stat-icon admin-stat-icon--${s.tone}`}>{s.icon}</div>
              </article>
            ))}
          </div>
          <div className="admin-stats-pair" role="group" aria-label="요약 통계 오른쪽 열">
            {stats.slice(2, 4).map((s) => (
              <article key={s.label} className="admin-stat-card">
                <div>
                  <p className="admin-stat-label">{s.label}</p>
                  <p className="admin-stat-value">{s.value}</p>
                  <p className="admin-stat-trend">{s.trend}</p>
                </div>
                <div className={`admin-stat-icon admin-stat-icon--${s.tone}`}>{s.icon}</div>
              </article>
            ))}
          </div>

          <section
            className="admin-panel admin-panel--quick"
            aria-labelledby="quick-actions-title"
          >
            <h2 id="quick-actions-title" className="admin-panel-title">
              빠른 작업
            </h2>
            <div className="admin-quick-list">
              <Link to="/admin/products/new" className="admin-quick-btn admin-quick-btn--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                새 상품 등록
              </Link>
              <Link to="/admin/orders" className="admin-quick-btn admin-quick-btn--ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                주문 관리
              </Link>
              <button type="button" className="admin-quick-btn admin-quick-btn--ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
                </svg>
                매출 분석
              </button>
              <button type="button" className="admin-quick-btn admin-quick-btn--ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                고객 관리
              </button>
            </div>
          </section>

          <section className="admin-panel admin-panel--orders" aria-labelledby="recent-orders-title">
            <div className="admin-orders-head">
              <h2 id="recent-orders-title" className="admin-panel-title">
                최근 주문
              </h2>
              <Link to="/admin/orders" className="admin-view-all">
                전체보기
              </Link>
            </div>
            {recentOrdersError ? (
              <p className="admin-orders-fetch-error" role="alert">{recentOrdersError}</p>
            ) : null}
            <ul className="admin-order-list">
              {recentOrdersLoading ? (
                <li className="admin-order-card admin-order-card--empty">
                  <p className="admin-order-empty-text">최근 주문을 불러오는 중…</p>
                </li>
              ) : recentOrders.length === 0 ? (
                <li className="admin-order-card admin-order-card--empty">
                  <p className="admin-order-empty-text">최근 주문이 없습니다.</p>
                </li>
              ) : (
                recentOrders.map((order) => (
                  <li key={order._id} className="admin-order-card">
                    <div className="admin-order-main">
                      <p className="admin-order-id">{order.orderNumber || order._id}</p>
                      <p className="admin-order-meta">
                        {order.user?.name || order.shipping?.recipientName || "—"} ·{" "}
                        {formatDateShort(order.orderedAt || order.createdAt)}
                      </p>
                    </div>
                    <div className="admin-order-right">
                      <span className={`admin-status admin-status--${adminDashboardStatusClass(order.status)}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span className="admin-order-price">{formatPriceKRW(order.grandTotal)}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <Link to="/admin/products" className="admin-hub-card admin-hub-card--link">
            <span className="admin-hub-icon admin-hub-icon--blue" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <h3 className="admin-hub-title">상품 관리</h3>
            <p className="admin-hub-desc">상품 등록, 수정, 삭제 및 재고 관리</p>
          </Link>
          <Link to="/admin/orders" className="admin-hub-card admin-hub-card--link">
            <span className="admin-hub-icon admin-hub-icon--green" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
            </span>
            <h3 className="admin-hub-title">주문 관리</h3>
            <p className="admin-hub-desc">주문 조회, 상태 변경 및 배송 관리</p>
          </Link>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
