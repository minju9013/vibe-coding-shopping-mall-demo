import { memo, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchAllProducts } from "../api/products";
import {
  getProductColorValues,
  parseSwatchColors,
  isLightColor,
} from "../utils/productColors";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./HomePage.css";

const categories = [
  { name: "VIEW ALL", icon: "🏷️", active: true },
  { name: "OUTER", icon: "🧥" },
  { name: "TOPS", icon: "👕" },
  { name: "PANTS", icon: "👖" },
  { name: "ACCESSORIES", icon: "⌚" },
];

const CATEGORY_LABEL = {
  outer: "아우터",
  top: "상의",
  pants: "하의",
  accessories: "악세서리",
};

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

const ColorSwatches = memo(function ColorSwatches({ product }) {
  const values = getProductColorValues(product);
  const list = values.length ? values : [null];

  return (
    <div className="product-swatches">
      {list.map((val, i) => {
        const parts = val != null ? parseSwatchColors(val) : ["#e5e7eb"];
        if (parts.length >= 2) {
          return (
            <span
              key={i}
              className="product-swatch product-swatch--split"
              title={val || ""}
              aria-hidden
            >
              <span className="product-swatch-half" style={{ background: parts[0] }} />
              <span className="product-swatch-half" style={{ background: parts[1] }} />
            </span>
          );
        }
        const c = parts[0];
        const light = isLightColor(c);
        return (
          <span
            key={i}
            className={`product-swatch ${light ? "product-swatch--light" : ""}`}
            style={{ background: c }}
            title={val || "색상"}
            aria-hidden
          />
        );
      })}
    </div>
  );
});

const ProductCard = memo(function ProductCard({ product, badge }) {
  const listPrice = product.listPrice != null ? Number(product.listPrice) : null;
  const salePrice = Number(product.price);
  const showList =
    listPrice != null &&
    !Number.isNaN(listPrice) &&
    !Number.isNaN(salePrice) &&
    listPrice > salePrice;

  return (
    <Link to={`/products/${product._id}`} className="product-card-link">
      <article className="product-card">
        <div className="product-image">
          {product.image?.secureUrl ? (
            <img src={product.image.secureUrl} alt="" />
          ) : null}
          {badge ? (
            <span className={`product-badge ${badge.toLowerCase()}`}>{badge}</span>
          ) : null}
        </div>
        <div className="product-info">
          <ColorSwatches product={product} />
          <h3 className="product-title">{product.name}</h3>
          <p className="product-subtitle">
            {CATEGORY_LABEL[product.category] || product.category || ""}
          </p>
          <div className="product-price-row">
            <span className="product-price-sale">{formatPriceKRW(product.price)}</span>
            {showList ? (
              <span className="product-price-origin">{formatPriceKRW(listPrice)}</span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
});

function HomePage() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      setProductsError("");
      try {
        const list = await fetchAllProducts();
        if (!cancelled) setProducts(list);
      } catch (e) {
        if (!cancelled) setProductsError(e.message || "상품을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const newArrivals = products.slice(0, 4);
  const bestSellers = products.length > 4 ? products.slice(4, 8) : [];

  return (
    <div className="home-container">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-label">KINETIC PERFORMANCE SEASON 01</p>
          <h1 className="hero-title">
            NEW YEAR,
            <br />
            <span className="hero-highlight">NEW LIMITS</span>
          </h1>
          <button type="button" className="hero-btn">SHOP NOW</button>
        </div>
      </section>

      <section className="categories">
        <div className="categories-inner">
          {categories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`category-item ${cat.active ? "active" : ""}`}
            >
              <div className="category-icon">{cat.icon}</div>
              <span className="category-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {productsError ? (
        <section className="product-section home-products-error" aria-live="polite">
          <p className="home-products-error-msg">{productsError}</p>
        </section>
      ) : null}

      <section className="product-section" id="new">
        <div className="section-header">
          <h2 className="section-title">NEW ARRIVALS</h2>
          <a href="#new" className="view-all">VIEW ALL →</a>
        </div>
        {productsLoading ? (
          <p className="home-products-loading">상품을 불러오는 중…</p>
        ) : newArrivals.length === 0 ? (
          <p className="home-products-empty">등록된 상품이 없습니다.</p>
        ) : (
          <div className="product-grid">
            {newArrivals.map((p, i) => (
              <ProductCard key={p._id} product={p} badge={i === 0 ? "NEW" : undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="product-section" id="best">
        <div className="section-header">
          <h2 className="section-title">BESTSELLERS</h2>
          <a href="#best" className="view-all">VIEW ALL →</a>
        </div>
        {productsLoading ? (
          <p className="home-products-loading">상품을 불러오는 중…</p>
        ) : bestSellers.length === 0 ? (
          <p className="home-products-empty">표시할 상품이 없습니다.</p>
        ) : (
          <div className="product-grid">
            {bestSellers.map((p) => (
              <ProductCard key={`best-${p._id}`} product={p} />
            ))}
          </div>
        )}
      </section>

      <HomeFooter />
    </div>
  );
}

export default HomePage;
