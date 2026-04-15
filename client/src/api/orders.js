import { API_BASE_URL } from "../config/api";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** POST /api/orders — 장바구니 → 주문 생성 */
export async function createOrder(token, body) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문에 실패했습니다.");
  }
  return data.data;
}

/** GET /api/orders/me — 내 주문 목록 */
export async function fetchMyOrders(token, page = 1, limit = 10) {
  const qs = new URLSearchParams({ page, limit }).toString();
  const res = await fetch(`${API_BASE_URL}/orders/me?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문 목록을 불러오지 못했습니다.");
  }
  return data.data;
}

/** GET /api/orders/me/:orderId — 주문 상세 */
export async function fetchOrderDetail(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/orders/me/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문 상세를 불러오지 못했습니다.");
  }
  return data.data;
}

/** GET /api/orders/admin — 관리자 전체 주문 목록 */
export async function fetchAllOrders(token, { page = 1, limit = 20, status, search } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  const res = await fetch(`${API_BASE_URL}/orders/admin?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문 목록을 불러오지 못했습니다.");
  }
  return data.data;
}

/** PATCH /api/orders/:orderId/status — 관리자 주문 상태 변경 */
export async function updateOrderStatus(token, orderId, status, reason = "") {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문 상태 변경에 실패했습니다.");
  }
  return data.data;
}

/** PATCH /api/orders/me/:orderId/cancel — 주문 취소 */
export async function cancelOrder(token, orderId, reason = "") {
  const res = await fetch(`${API_BASE_URL}/orders/me/${orderId}/cancel`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "주문 취소에 실패했습니다.");
  }
  return data.data;
}
