import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCartCount } from "../../api/cart";
import { useCart } from "../../contexts/CartContext";
import navCartIcon from "../../assets/nav-cart-icon.svg";
import "./HomeNavbar.css";

const NavSearchBar = memo(function NavSearchBar() {
  return (
    <div className="nav-search-bar" role="search">
      <span className="nav-search-bar-icon-wrap" aria-hidden>
        <svg
          className="nav-search-bar-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="m21 21-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        type="search"
        className="nav-search-input"
        placeholder="검색어를 입력하세요"
        aria-label="검색"
        autoComplete="off"
      />
    </div>
  );
});

/**
 * @typedef {object} HomeNavbarProps
 * @property {{ name: string, userType?: string } | null} user
 * @property {boolean} loading
 * @property {() => void} onLogout
 */

export const HomeNavbar = memo(function HomeNavbar({ user, token, loading, onLogout }) {
  const { cartVersion } = useCart();
  const [cartQty, setCartQty] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setCartQty(0);
      return;
    }
    let cancelled = false;
    fetchCartCount(token).then((d) => {
      if (!cancelled) setCartQty(d.totalQuantity ?? 0);
    });
    return () => { cancelled = true; };
  }, [token, cartVersion]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="nav-logo">KINETIC</Link>
        <div className="nav-links">
          <a href="#new" className="nav-link active">NEW ARRIVALS</a>
          <a href="#men" className="nav-link">MEN</a>
          <a href="#women" className="nav-link">WOMEN</a>
          <a href="#accessories" className="nav-link">ACCESSORIES</a>
          <a href="#training" className="nav-link">TRAINING</a>
        </div>
      </div>
      <div className="nav-right">
        <NavSearchBar />
        {!loading && (
          <>
            {user ? (
              <div className="nav-user-menu" ref={menuRef}>
                <button
                  type="button"
                  className="nav-user-trigger"
                  onClick={toggleMenu}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <span className="nav-user-trigger-name">{user.name}님</span>
                  <span className={`nav-user-chevron ${menuOpen ? "nav-user-chevron--open" : ""}`}>
                    ▾
                  </span>
                </button>
                {menuOpen ? (
                  <div className="nav-user-dropdown">
                    <div className="nav-user-dropdown-header">
                      <span className="nav-user-dropdown-name">{user.name}</span>
                      <span className="nav-user-dropdown-email">{user.email}</span>
                    </div>
                    <div className="nav-user-dropdown-divider" />
                    <Link to="/cart" className="nav-user-dropdown-item" onClick={() => setMenuOpen(false)}>
                      장바구니
                    </Link>
                    <Link to="/orders" className="nav-user-dropdown-item" onClick={() => setMenuOpen(false)}>
                      주문 내역
                    </Link>
                    {user.userType === "admin" ? (
                      <Link to="/admin" className="nav-user-dropdown-item" onClick={() => setMenuOpen(false)}>
                        어드민
                      </Link>
                    ) : null}
                    <div className="nav-user-dropdown-divider" />
                    <button
                      type="button"
                      className="nav-user-dropdown-item nav-user-dropdown-logout"
                      onClick={() => { setMenuOpen(false); onLogout(); }}
                    >
                      로그아웃
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link to="/login" className="nav-text-btn">로그인</Link>
            )}
            <Link
              to={user ? "/cart" : "/login"}
              state={user ? undefined : { from: "/cart" }}
              className="nav-icon-btn nav-cart-wrap"
              aria-label="장바구니"
            >
              <img
                src={navCartIcon}
                alt=""
                className="nav-cart-img"
                width={16}
                height={20}
                decoding="async"
              />
              {cartQty > 0 ? (
                <span className="nav-cart-badge" aria-label={`${cartQty}개`}>
                  {cartQty > 99 ? "99+" : cartQty}
                </span>
              ) : null}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
});

export default HomeNavbar;
