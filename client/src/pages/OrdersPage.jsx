import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchMyOrders } from "../api/orders";
import { HomeFooter, HomeNavbar } from "../components/layout";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "../constants/orderStatus";
import "./OrdersPage.css";

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_MAP = ORDER_STATUS_LABELS;

const STATUS_ICON = {
  pending: "⏳",
  paid: "💳",
  preparing: "📦",
  shipped: "🚚",
  delivered: "✅",
  cancelled: "✖️",
};

const TABS = ORDER_LIST_TABS;

function StatusBadge({ status }) {
  return (
    <span className={`order-status-badge order-status--${status}`}>
      {STATUS_MAP[status] ?? status}
    </span>
  );
}

export default function OrdersPage() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: "/orders" } });
      return;
    }
    if (user && token) {
      setLoadingOrders(true);
      setError("");
      fetchMyOrders(token, 1, 100)
        .then((result) => setAllOrders(result.orders ?? []))
        .catch((e) => setError(e.message || "주문 목록을 불러오지 못했습니다."))
        .finally(() => setLoadingOrders(false));
    }
  }, [loading, user, token, navigate]);

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const filteredOrders = currentTab.statuses
    ? allOrders.filter((o) => currentTab.statuses.includes(o.status))
    : allOrders;

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.id] = tab.statuses
      ? allOrders.filter((o) => tab.statuses.includes(o.status)).length
      : allOrders.length;
    return acc;
  }, {});

  return (
    <div className="orders-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="orders-main">
        <h1 className="orders-title">주문 내역</h1>

        {/* 탭 */}
        <div className="orders-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`orders-tab${activeTab === tab.id ? " orders-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 ? (
                <span className="orders-tab-count">{tabCounts[tab.id]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {error ? <p className="orders-error">{error}</p> : null}

        {loadingOrders ? (
          <p className="orders-loading">불러오는 중…</p>
        ) : !filteredOrders.length ? (
          <div className="orders-empty">
            <p className="orders-empty-text">
              {activeTab === "all" ? "주문 내역이 없습니다." : `${currentTab.label} 상태의 주문이 없습니다.`}
            </p>
            {activeTab === "all" ? (
              <Link to="/" className="orders-empty-btn">쇼핑하러 가기</Link>
            ) : null}
          </div>
        ) : (
          <ul className="orders-list">
            {filteredOrders.map((order) => (
              <li key={order._id} className="order-card">
                {/* 카드 헤더 */}
                <div className="order-card-header">
                  <div className="order-card-header-left">
                    <span className="order-card-icon">{STATUS_ICON[order.status] ?? "📋"}</span>
                    <span className="order-card-number">주문 #{order.orderNumber}</span>
                  </div>
                  <div className="order-card-header-right">
                    <StatusBadge status={order.status} />
                    <span className="order-card-grand">{formatPriceKRW(order.grandTotal)}</span>
                  </div>
                </div>

                <p className="order-card-date">주문일: {formatDate(order.orderedAt || order.createdAt)}</p>

                {/* 상품 목록 */}
                <ul className="order-card-items">
                  {order.items?.map((item) => (
                    <li key={item._id} className="order-card-item">
                      <div className="order-card-item-img">
                        {item.productImage ? (
                          <img src={item.productImage} alt="" />
                        ) : (
                          <div className="order-card-item-img--empty" />
                        )}
                      </div>
                      <div className="order-card-item-info">
                        <p className="order-card-item-name">{item.productName}</p>
                        <p className="order-card-item-meta">
                          {item.size ? `사이즈: ${item.size}` : null}
                          {item.size && item.color ? " · " : null}
                          {item.color ? `색상: ${item.color}` : null}
                        </p>
                        <p className="order-card-item-qty">수량: {item.quantity}</p>
                        <p className="order-card-item-price">{formatPriceKRW(item.itemTotal)}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* 하단 액션 */}
                <div className="order-card-footer">
                  <Link to={`/orders/${order._id}`} className="order-card-btn">
                    주문 상세보기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}
