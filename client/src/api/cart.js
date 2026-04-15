import { API_BASE_URL } from "../config/api";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** GET /api/carts/me/count — 배지용 경량 조회 */
export async function fetchCartCount(token) {
  const res = await fetch(`${API_BASE_URL}/carts/me/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return { totalQuantity: 0, totalAmount: 0 };
  return data.data;
}

/** GET /api/carts/me */
export async function fetchMyCart(token) {
  const res = await fetch(`${API_BASE_URL}/carts/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "장바구니를 불러오지 못했습니다.");
  }
  return data.data;
}

/** POST /api/carts/me/items */
export async function addCartItem(token, body) {
  const res = await fetch(`${API_BASE_URL}/carts/me/items`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "장바구니에 담지 못했습니다.");
  }
  return data.data;
}

/** PATCH /api/carts/me/items/:itemId */
export async function patchCartItem(token, itemId, body) {
  const res = await fetch(`${API_BASE_URL}/carts/me/items/${itemId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "장바구니를 수정하지 못했습니다.");
  }
  return data.data;
}

/** DELETE /api/carts/me/items/:itemId */
export async function removeCartItem(token, itemId) {
  const res = await fetch(`${API_BASE_URL}/carts/me/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "항목을 삭제하지 못했습니다.");
  }
  return data.data;
}

/** DELETE /api/carts/me */
export async function clearMyCart(token) {
  const res = await fetch(`${API_BASE_URL}/carts/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "장바구니를 비우지 못했습니다.");
  }
  return data.data;
}
