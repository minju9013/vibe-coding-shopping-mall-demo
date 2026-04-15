import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchProducts, deleteProduct } from "../../api/products";
import "./AdminProductsPage.css";

const CATEGORY_LABEL = {
  outer: "아우터",
  top: "상의",
  pants: "하의",
  accessories: "악세서리",
};

const FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "outer", label: "아우터" },
  { value: "top", label: "상의" },
  { value: "pants", label: "하의" },
  { value: "accessories", label: "악세서리" },
];

const initialPagination = {
  page: 1,
  limit: 8,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

function formatWon(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("ko-KR")}원`;
}

function AdminProductsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [loadError, setLoadError] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setLoadError("");
      try {
        const { data, pagination: pg } = await fetchProducts({
          page,
          category: categoryFilter || undefined,
          search: debouncedSearch || undefined,
        });
        if (!cancelled) {
          setProducts(data);
          setPagination(pg);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, categoryFilter, debouncedSearch]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」상품을 삭제할까요?`)) return;
    setActionError("");
    try {
      await deleteProduct(token, id);
      let nextPage = page;
      let { data, pagination: pg } = await fetchProducts({
        page: nextPage,
        category: categoryFilter || undefined,
        search: debouncedSearch || undefined,
      });
      if (data.length === 0 && pg.total > 0 && nextPage > 1) {
        nextPage -= 1;
        ({ data, pagination: pg } = await fetchProducts({
          page: nextPage,
          category: categoryFilter || undefined,
          search: debouncedSearch || undefined,
        }));
      }
      setPage(nextPage);
      setProducts(data);
      setPagination(pg);
    } catch (e) {
      setActionError(e.message || "삭제에 실패했습니다.");
    }
  };

  if (authLoading) {
    return <div className="admin-products-loading">불러오는 중…</div>;
  }

  if (!user || user.userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-products-page">
      <header className="admin-products-topbar">
        <div className="admin-products-topbar-inner">
          <Link to="/admin" className="admin-products-back" aria-label="관리자 대시보드로">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="admin-products-title">상품 관리</h1>
          <Link to="/admin/products/new" className="admin-products-btn-new">
            + 새 상품 등록
          </Link>
        </div>
      </header>

      <main className="admin-products-main">
        <nav className="admin-products-tabs" aria-label="상품 관리">
          <span className="admin-products-tab admin-products-tab--active">상품 목록</span>
          <Link to="/admin/products/new" className="admin-products-tab">
            상품 등록
          </Link>
        </nav>

        {loadError ? (
          <p className="admin-products-banner admin-products-banner--error" role="alert">
            {loadError}
          </p>
        ) : null}
        {actionError ? (
          <p className="admin-products-banner admin-products-banner--error" role="alert">
            {actionError}
          </p>
        ) : null}

        <section className="admin-products-panel" aria-labelledby="product-list-heading">
          <h2 id="product-list-heading" className="visually-hidden">
            상품 목록
          </h2>

          <div className="admin-products-toolbar">
            <div className="admin-products-search-wrap">
              <span className="admin-products-search-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                className="admin-products-search-input"
                placeholder="상품명으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="상품명 검색"
              />
            </div>
            <button
              type="button"
              className={`admin-products-filter-btn ${filterOpen ? "admin-products-filter-btn--open" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              필터
            </button>
          </div>

          {filterOpen ? (
            <div className="admin-products-filter-panel">
              <label className="admin-products-filter-label">
                카테고리
                <select
                  className="admin-products-filter-select"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {FILTER_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {!listLoading && pagination.total > 0 ? (
            <p className="admin-products-meta">
              전체 {pagination.total.toLocaleString("ko-KR")}건 · 페이지당 {pagination.limit}개
            </p>
          ) : null}

          <div className="admin-products-table-wrap">
            {listLoading ? (
              <p className="admin-products-empty">목록을 불러오는 중…</p>
            ) : products.length === 0 ? (
              <p className="admin-products-empty">조건에 맞는 상품이 없습니다.</p>
            ) : (
              <table className="admin-products-table">
                <thead>
                  <tr>
                    <th scope="col">이미지</th>
                    <th scope="col">상품명</th>
                    <th scope="col">카테고리</th>
                    <th scope="col">가격</th>
                    <th scope="col">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => (
                    <tr key={p._id} className={idx % 2 ? "admin-products-row--alt" : ""}>
                      <td>
                        <div className="admin-products-thumb">
                          {p.image?.secureUrl ? (
                            <img src={p.image.secureUrl} alt="" />
                          ) : (
                            <span className="admin-products-thumb-placeholder" aria-hidden />
                          )}
                        </div>
                      </td>
                      <td className="admin-products-cell-name">{p.name}</td>
                      <td>{CATEGORY_LABEL[p.category] || p.category}</td>
                      <td className="admin-products-cell-price">
                        <strong className="admin-products-price-current">{formatWon(p.price)}</strong>
                        {p.listPrice != null && Number(p.listPrice) > Number(p.price) ? (
                          <span className="admin-products-price-list">{formatWon(p.listPrice)}</span>
                        ) : null}
                      </td>
                      <td>
                        <div className="admin-products-actions">
                          <button
                            type="button"
                            className="admin-products-icon-btn"
                            title="수정"
                            aria-label={`${p.name} 수정`}
                            onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="admin-products-icon-btn admin-products-icon-btn--danger"
                            title="삭제"
                            aria-label={`${p.name} 삭제`}
                            onClick={() => handleDelete(p._id, p.name)}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!listLoading && pagination.totalPages > 1 ? (
            <nav className="admin-products-pagination" aria-label="페이지 이동">
              <button
                type="button"
                className="admin-products-page-btn"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </button>
              <span className="admin-products-page-info">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="admin-products-page-btn"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </nav>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default AdminProductsPage;
