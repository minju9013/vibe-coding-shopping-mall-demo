import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import {
  clearMyCart,
  fetchMyCart,
  patchCartItem,
  removeCartItem,
} from "../api/cart";
import { fetchAllProducts } from "../api/products";
import { HomeFooter, HomeNavbar } from "../components/layout";
import CartEditModal from "../components/cart/CartEditModal";
import "./CartPage.css";

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function lineSubtotal(line) {
  const q = Number(line.quantity) || 0;
  const u = line.unitPrice != null ? Number(line.unitPrice) : 0;
  return Math.round(q * u);
}

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6l-.867 12.142A2 2 0 0116.138 20H7.862a2 2 0 01-1.995-1.858L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" />
  </svg>
);

export default function CartPage() {
  const { user, token, loading, logout } = useAuth();
  const { bumpCart } = useCart();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loadingCart, setLoadingCart] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [recommended, setRecommended] = useState([]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const loadCart = useCallback(async () => {
    if (!token) return;
    setLoadingCart(true);
    setLoadError("");
    try {
      const data = await fetchMyCart(token);
      setCart(data);
    } catch (e) {
      setLoadError(e.message || "장바구니를 불러오지 못했습니다.");
      setCart(null);
    } finally {
      setLoadingCart(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: "/cart" } });
      return;
    }
    if (user && token) {
      loadCart();
      fetchAllProducts()
        .then((all) => setRecommended(all.slice(0, 4)))
        .catch(() => {});
    }
  }, [loading, user, token, navigate, loadCart]);

  const handleRemove = async (itemId) => {
    if (!token) return;
    if (!window.confirm("이 상품을 장바구니에서 삭제할까요?")) return;
    try {
      const data = await removeCartItem(token, itemId);
      setCart(data);
      bumpCart();
    } catch (e) {
      window.alert(e.message || "삭제에 실패했습니다.");
    }
  };

  const handleQtyChange = async (itemId, newQty) => {
    if (!token || newQty < 1) return;
    try {
      const data = await patchCartItem(token, itemId, { quantity: newQty });
      setCart(data);
      bumpCart();
    } catch (e) {
      window.alert(e.message || "수량 변경에 실패했습니다.");
    }
  };

  const handleClear = async () => {
    if (!token || !cart?.items?.length) return;
    if (!window.confirm("장바구니를 비울까요?")) return;
    try {
      const data = await clearMyCart(token);
      setCart(data);
      bumpCart();
    } catch (e) {
      window.alert(e.message || "비우기에 실패했습니다.");
    }
  };

  const itemCount = cart?.items?.length ?? 0;

  if (loading) {
    return (
      <div className="cart-page">
        <HomeNavbar user={user} token={token} loading onLogout={handleLogout} />
        <main className="cart-main"><p className="cart-empty-msg">불러오는 중…</p></main>
        <HomeFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="cart-page">
        <HomeNavbar user={null} token={null} loading={false} onLogout={handleLogout} />
        <main className="cart-main"><p className="cart-empty-msg">로그인 페이지로 이동합니다…</p></main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="cart-main">
        <div className="cart-header">
          <button type="button" className="cart-back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="cart-title">장바구니 ({itemCount})</h1>
        </div>

        {loadError ? <p className="cart-error">{loadError}</p> : null}

        {loadingCart ? (
          <p className="cart-empty-msg">장바구니를 불러오는 중…</p>
        ) : !cart?.items?.length ? (
          <>
          <hr className="cart-empty-divider" />
          <div className="cart-empty-state">
            <div className="cart-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h2 className="cart-empty-title">장바구니가 비어있습니다</h2>
            <p className="cart-empty-desc">마음에 드는 상품을 장바구니에 담아보세요!</p>
            <Link to="/" className="cart-empty-btn">쇼핑 계속하기</Link>
          </div>
          </>
        ) : (
          <div className="cart-grid">
            <section className="cart-items-col">
              <ul className="cart-list">
                {cart.items.map((line) => {
                  const p = line.product;
                  const img = p?.image?.secureUrl;
                  const listPrice = p?.listPrice != null ? Number(p.listPrice) : null;
                  const salePrice = p ? Number(p.price) : NaN;
                  const showOrig =
                    listPrice != null &&
                    !Number.isNaN(listPrice) &&
                    !Number.isNaN(salePrice) &&
                    listPrice > salePrice;

                  return (
                    <li key={line._id} className="cart-item">
                      <div className="cart-item-top">
                        <Link to={p ? `/products/${p._id}` : "#"} className="cart-item-img-link">
                          {img ? (
                            <img src={img} alt="" className="cart-item-img" />
                          ) : (
                            <div className="cart-item-img cart-item-img--empty" aria-hidden />
                          )}
                        </Link>

                        <div className="cart-item-info">
                          <div className="cart-item-head">
                            <div className="cart-item-text">
                              {p ? (
                                <h2 className="cart-item-name">
                                  <Link to={`/products/${p._id}`}>{p.name}</Link>
                                </h2>
                              ) : (
                                <h2 className="cart-item-name">삭제된 상품</h2>
                              )}
                              <p className="cart-item-meta">
                                {line.size ? `사이즈: ${line.size}` : null}
                                {line.size && line.color ? "   " : null}
                                {line.color ? `색상: ${line.color}` : null}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="cart-item-delete"
                              title="삭제"
                              onClick={() => handleRemove(line._id)}
                            >
                              <TrashIcon />
                            </button>
                          </div>

                          <div className="cart-item-price-row">
                            <span className="cart-item-price">
                              {formatPriceKRW(lineSubtotal(line))}
                            </span>
                            {showOrig ? (
                              <del className="cart-item-orig-price">
                                {formatPriceKRW(listPrice * (Number(line.quantity) || 1))}
                              </del>
                            ) : null}
                          </div>

                          <div className="cart-item-bottom">
                            <div className="cart-item-qty">
                              <button
                                type="button"
                                disabled={line.quantity <= 1}
                                onClick={() => handleQtyChange(line._id, line.quantity - 1)}
                              >
                                −
                              </button>
                              <span>{line.quantity}</span>
                              <button
                                type="button"
                                disabled={line.quantity >= 99}
                                onClick={() => handleQtyChange(line._id, line.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-item-option-btn"
                              disabled={!p}
                              onClick={() => setEditingItem(line)}
                            >
                              옵션 수정
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="cart-summary-col">
              <div className="cart-summary-card">
                <h2 className="cart-summary-title">주문 요약</h2>

                <div className="cart-summary-row">
                  <span>소계 ({itemCount}개)</span>
                  <span>{formatPriceKRW(cart.totalAmount)}</span>
                </div>
                <div className="cart-summary-row">
                  <span>배송비</span>
                  <span className="cart-summary-free">무료</span>
                </div>

                <div className="cart-summary-divider" />

                <div className="cart-summary-row cart-summary-total">
                  <span>합계</span>
                  <span>{formatPriceKRW(cart.totalAmount)}</span>
                </div>

                <button
                  type="button"
                  className="cart-checkout-btn"
                  onClick={() => navigate("/checkout")}
                >
                  결제하기
                </button>
                <Link to="/" className="cart-continue-btn">
                  쇼핑 계속하기
                </Link>

                <div className="cart-payment-methods">
                  <p className="cart-payment-label">결제 수단</p>
                  <div className="cart-payment-icons">
                    <span className="cart-pay-badge">VISA</span>
                    <span className="cart-pay-badge">MC</span>
                    <span className="cart-pay-badge">카카오페이</span>
                    <span className="cart-pay-badge">네이버페이</span>
                  </div>
                  <p className="cart-ssl">🔒 안전한 SSL 결제</p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {recommended.length > 0 ? (
          <section className="cart-reco">
            <h2 className="cart-reco-title">추천 상품</h2>
            <div className="cart-reco-grid">
              {recommended.map((rp) => (
                <Link key={rp._id} to={`/products/${rp._id}`} className="cart-reco-card">
                  <div className="cart-reco-img">
                    {rp.image?.secureUrl ? (
                      <img src={rp.image.secureUrl} alt="" />
                    ) : null}
                  </div>
                  <p className="cart-reco-name">{rp.name}</p>
                  <p className="cart-reco-price">{formatPriceKRW(rp.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <HomeFooter />

      {editingItem && token ? (
        <CartEditModal
          item={editingItem}
          token={token}
          onClose={() => setEditingItem(null)}
          onSaved={(next) => { setCart(next); bumpCart(); }}
        />
      ) : null}
    </div>
  );
}
