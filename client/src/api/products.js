import { API_BASE_URL } from "../config/api";

const DEFAULT_LIMIT = 8;

/** GET /api/products?all=1 — 메인용 전체 목록(서버 상한 적용) */
export async function fetchAllProducts() {
  const res = await fetch(`${API_BASE_URL}/products?all=1`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "상품을 불러오지 못했습니다.");
  }
  return data.data || [];
}

/** GET /api/products/:id — 단건 조회(MongoDB _id) */
export async function fetchProductById(productId) {
  const res = await fetch(`${API_BASE_URL}/products/${productId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "상품을 불러오지 못했습니다.");
  }
  return data.data;
}

/**
 * GET /api/products — 페이지네이션(기본 8개/페이지)
 * @param {{ category?: string, page?: number, limit?: number, search?: string }} params
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function fetchProducts(params = {}) {
  const { category, page = 1, limit = DEFAULT_LIMIT, search } = params;
  const sp = new URLSearchParams();
  if (category) sp.set("category", category);
  if (page != null) sp.set("page", String(page));
  if (limit != null) sp.set("limit", String(limit));
  if (search && String(search).trim()) sp.set("search", String(search).trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE_URL}/products${qs ? `?${qs}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "상품 목록을 불러오지 못했습니다.");
  }
  return {
    data: data.data || [],
    pagination: data.pagination || {
      page: 1,
      limit: DEFAULT_LIMIT,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

/** PUT /api/products/:id — 관리자: 상품 수정 */
export async function updateProduct(token, productId, body) {
  const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    const err = new Error(data.message || `상품 수정에 실패했습니다. (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** DELETE /api/products/:id — 관리자 */
export async function deleteProduct(token, productId) {
  const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "삭제에 실패했습니다.");
  }
  return data;
}

/**
 * 상품 등록 — POST /api/products
 * 라우트: server/routes/products.js → createProduct (JWT + 관리자)
 * 스키마: server/models/Product.js
 *
 * @param {string} token JWT (Bearer)
 * @param {{
 *   sku: string,
 *   name: string,
 *   price: number,
 *   listPrice?: number,
 *   category: 'outer'|'top'|'pants'|'accessories',
 *   image: { publicId: string, secureUrl: string },
 *   description?: string,
 *   options?: Array<{ name: string, values: string[] }>,
 * }} body
 * @returns {Promise<{ success: true, data: object }>}
 */
export async function createProduct(token, body) {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    const err = new Error(data.message || `상품 등록에 실패했습니다. (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
