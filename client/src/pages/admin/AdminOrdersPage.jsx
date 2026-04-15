import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchAllOrders, updateOrderStatus } from "../../api/orders";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS, orderTabIdToApiStatus } from "../../constants/orderStatus";
import "./AdminOrdersPage.css";

const STATUS_TONE = {
  pending: "pending",
  paid: "processing",
  preparing: "processing",
  shipped: "shipping",
  delivered: "done",
  cancelled: "cancelled",
};

/** 관리자가 셀렉트로 바꿀 수 있는 상태 (상품준비중 · 배송중 · 주문취소) */
const ADMIN_STATUS_OPTIONS = [
  { value: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { value: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

function canUseAdminStatusSelect(status) {
  return ["pending", "paid", "preparing", "shipped"].includes(status);
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatPriceKRW(n) {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  return `₩${num.toLocaleString("ko-KR")}`;
}

function AdminOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [tabCounts, setTabCounts] = useState({});
  const [tabCountTick, setTabCountTick] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const currentTab = ORDER_LIST_TABS.find((t) => t.id === activeTab) ?? ORDER_LIST_TABS[0];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          ORDER_LIST_TABS.map(async (tab) => {
            const apiStatus = orderTabIdToApiStatus(tab.id);
            const data = await fetchAllOrders(token, {
              page: 1,
              limit: 1,
              status: apiStatus,
              search: debouncedSearch || undefined,
            });
            return [tab.id, data.totalOrders];
          })
        );
        if (!cancelled) setTabCounts(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setTabCounts({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, debouncedSearch, tabCountTick]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setError("");
    try {
      const data = await fetchAllOrders(token, {
        page,
        limit: 20,
        status: orderTabIdToApiStatus(activeTab),
        search: debouncedSearch || undefined,
      });
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotalOrders(data.totalOrders);
    } catch (e) {
      setError(e.message || "주문 목록을 불러오지 못했습니다.");
    } finally {
      setListLoading(false);
    }
  }, [token, page, activeTab, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (orderId, newStatus, reason = "") => {
    setActionLoading(orderId);
    try {
      await updateOrderStatus(token, orderId, newStatus, reason);
      await loadOrders();
      setTabCountTick((t) => t + 1);
      return true;
    } catch (e) {
      setError(e.message || "상태 변경에 실패했습니다.");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return <div className="ao-loading">불러오는 중…</div>;
  }

  if (!user || user.userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="ao-page">
      <header className="ao-topbar">
        <div className="ao-topbar-inner">
          <Link to="/admin" className="ao-back" aria-label="관리자 대시보드로">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="ao-title">주문 관리</h1>
          <span />
        </div>
      </header>

      <main className="ao-main">
        <div className="ao-toolbar">
          <div className="ao-search-wrap">
            <span className="ao-search-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              className="ao-search-input"
              placeholder="주문번호 또는 고객명으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="주문 검색"
            />
          </div>
          <button
            type="button"
            className={`ao-filter-btn ${filterOpen ? "ao-filter-btn--open" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            필터
          </button>
        </div>

        {filterOpen && (
          <div className="ao-filter-panel">
            <label className="ao-filter-label">
              주문 상태
              <select
                className="ao-filter-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                {ORDER_LIST_TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <nav className="ao-tabs" aria-label="주문 상태 필터">
          {ORDER_LIST_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ao-tab ${activeTab === tab.id ? "ao-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 ? (
                <span className="ao-tab-count">{tabCounts[tab.id]}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {error && (
          <p className="ao-banner ao-banner--error" role="alert">{error}</p>
        )}

        {listLoading ? (
          <p className="ao-empty">주문 목록을 불러오는 중…</p>
        ) : orders.length === 0 ? (
          <p className="ao-empty">
            {activeTab === "all"
              ? "조건에 맞는 주문이 없습니다."
              : `${currentTab.label} 상태의 주문이 없습니다.`}
          </p>
        ) : (
          <div className="ao-list">
            {orders.map((order) => {
              const expanded = expandedId === order._id;
              const customerName = order.user?.name || order.shipping?.recipientName || "—";
              const customerEmail = order.user?.email || "—";
              const customerPhone = order.shipping?.phone || order.user?.phone || "—";
              const address = [order.shipping?.address, order.shipping?.addressDetail].filter(Boolean).join(" ");
              const showStatusSelect = canUseAdminStatusSelect(order.status);
              const isActioning = actionLoading === order._id;

              return (
                <article key={order._id} className="ao-card">
                  <div className="ao-card-top">
                    <div className="ao-card-left">
                      <div className="ao-card-id-row">
                        <span className="ao-card-status-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" strokeLinecap="round" />
                          </svg>
                        </span>
                        <span className="ao-card-order-num">{order.orderNumber || order._id}</span>
                      </div>
                      <p className="ao-card-meta">
                        {customerName} · {formatDate(order.orderedAt || order.createdAt)}
                      </p>
                    </div>
                    <div className="ao-card-right">
                      <span className={`ao-status ao-status--${STATUS_TONE[order.status] || "pending"}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                  </div>

                  <div className="ao-card-body">
                    <div className="ao-card-info-grid">
                      <div className="ao-card-info-block">
                        <p className="ao-card-info-label">고객 정보</p>
                        <p className="ao-card-info-value">{customerEmail}</p>
                        <p className="ao-card-info-value">{customerPhone}</p>
                      </div>
                      <div className="ao-card-info-block">
                        <p className="ao-card-info-label">주문 상품</p>
                        <p className="ao-card-info-value">{order.totalQuantity || order.items?.length || 0}개 상품</p>
                      </div>
                      <div className="ao-card-info-block">
                        <p className="ao-card-info-label">배송 주소</p>
                        <p className="ao-card-info-value">{address || "—"}</p>
                      </div>
                    </div>

                    <div className="ao-card-footer">
                      {showStatusSelect ? (
                        <div className="ao-card-footer-left">
                          <label className="ao-status-select-wrap">
                            <span className="ao-status-select-label">주문 상태 변경</span>
                            <select
                              key={`${order._id}-${order.status}`}
                              className="ao-status-select"
                              defaultValue=""
                              disabled={isActioning}
                              aria-busy={isActioning}
                              onChange={async (e) => {
                                const el = e.target;
                                const v = el.value;
                                if (!v) return;
                                if (v === "cancelled" && !window.confirm("이 주문을 취소하시겠습니까?")) {
                                  el.value = "";
                                  return;
                                }
                                const reason = v === "cancelled" ? "관리자 취소" : "";
                                await handleStatusChange(order._id, v, reason);
                                el.value = "";
                              }}
                            >
                              <option value="">{isActioning ? "처리 중…" : "상태 선택"}</option>
                              {ADMIN_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                      <div className="ao-card-footer-right">
                        <span className="ao-card-price ao-card-price--emphasis">{formatPriceKRW(order.grandTotal)}</span>
                        <button
                          type="button"
                          className="ao-detail-btn"
                          onClick={() => setExpandedId(expanded ? null : order._id)}
                          aria-expanded={expanded}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          상세보기
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="ao-card-expanded">
                      <p className="ao-card-info-label">주문 상품 상세</p>
                      {order.items?.length > 0 ? (
                        <ul className="ao-items-list">
                          {order.items.map((item, idx) => (
                            <li key={item._id || idx} className="ao-item-row">
                              {item.productImage && (
                                <img src={item.productImage} alt="" className="ao-item-thumb" />
                              )}
                              <div className="ao-item-info">
                                <span className="ao-item-name">{item.productName}</span>
                                {(item.color || item.size) && (
                                  <span className="ao-item-variant">
                                    {[item.color, item.size].filter(Boolean).join(" / ")}
                                  </span>
                                )}
                              </div>
                              <span className="ao-item-qty">x{item.quantity}</span>
                              <span className="ao-item-price">{formatPriceKRW(item.itemTotal || item.unitPrice * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ao-card-info-value">상품 정보 없음</p>
                      )}

                      {order.shipping?.memo && (
                        <div className="ao-memo-block">
                          <p className="ao-card-info-label">배송 메모</p>
                          <p className="ao-card-info-value">{order.shipping.memo}</p>
                        </div>
                      )}

                      {order.payment && (
                        <div className="ao-payment-block">
                          <p className="ao-card-info-label">결제 정보</p>
                          <p className="ao-card-info-value">
                            {order.payment.method === "card" ? "카드" :
                             order.payment.method === "kakao_pay" ? "카카오페이" :
                             order.payment.method === "naver_pay" ? "네이버페이" :
                             order.payment.method || "—"}
                            {order.payment.paidAt ? ` · ${formatDate(order.payment.paidAt)}` : ""}
                          </p>
                        </div>
                      )}

                      {order.status === "cancelled" && (
                        <div className="ao-cancel-block">
                          <p className="ao-card-info-label">취소 사유</p>
                          <p className="ao-card-info-value">{order.cancelReason || "사유 없음"}</p>
                        </div>
                      )}

                      <div className="ao-tracking-block">
                        <p className="ao-card-info-label">추적번호</p>
                        <p className="ao-card-info-value ao-card-info-value--muted">추적번호 없음</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!listLoading && totalPages > 1 && (
          <nav className="ao-pagination" aria-label="페이지 이동">
            <button
              type="button"
              className="ao-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <span className="ao-page-info">{page} / {totalPages}</span>
            <button
              type="button"
              className="ao-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </nav>
        )}

        {!listLoading && totalOrders > 0 && (
          <p className="ao-total-info">전체 {totalOrders.toLocaleString("ko-KR")}건</p>
        )}
      </main>
    </div>
  );
}

export default AdminOrdersPage;
