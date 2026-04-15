import { useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./OrderFailPage.css";

export default function OrderFailPage() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reason = searchParams.get("reason") || "결제 처리 중 문제가 발생했습니다.";
  const code = searchParams.get("code") || "";

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  return (
    <div className="of-page">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="of-main">
        <div className="of-hero">
          <div className="of-x-circle">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </div>
          <h1 className="of-hero-title">결제에 실패했습니다</h1>
          <p className="of-hero-sub">주문이 완료되지 않았습니다.</p>
          <p className="of-hero-desc">{reason}</p>
          {code ? <p className="of-hero-code">오류 코드: {code}</p> : null}
        </div>

        <div className="of-card">
          <h2 className="of-card-title">어떻게 해야 하나요?</h2>
          <ul className="of-help-list">
            <li>결제 수단(카드 한도, 잔액 등)을 확인 후 다시 시도해주세요.</li>
            <li>문제가 계속되면 다른 결제 수단을 선택해보세요.</li>
            <li>장바구니의 상품은 그대로 유지되어 있습니다.</li>
          </ul>
        </div>

        <div className="of-actions">
          <Link to="/checkout" className="of-btn of-btn--primary">다시 결제하기</Link>
          <Link to="/cart" className="of-btn of-btn--secondary">장바구니로 돌아가기</Link>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
