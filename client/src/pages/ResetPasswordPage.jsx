import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordWithToken } from "../api/auth";
import "./LoginPage.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPasswordWithToken(token, password);
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.message || "비밀번호를 변경하지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-form-section">
          <div className="login-form-wrapper">
            <Link to="/" className="login-logo">
              KINETIC
            </Link>
            <h2 className="login-title">비밀번호 재설정</h2>
            <div className="login-error">
              유효한 재설정 링크가 아닙니다. 이메일로 받은 링크를 사용하거나 다시 요청해 주세요.
            </div>
            <div className="login-footer login-footer--stack">
              <Link to="/forgot-password" className="signup-link">
                비밀번호 재설정 다시 요청
              </Link>
              <Link to="/login" className="signup-link">
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-section">
        <div className="login-form-wrapper">
          <Link to="/" className="login-logo">
            KINETIC
          </Link>
          <h2 className="login-title">새 비밀번호 설정</h2>
          <p className="login-subtitle">새 비밀번호를 입력해 주세요.</p>

          {error ? <div className="login-error">{error}</div> : null}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reset-password">
                새 비밀번호 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상 입력"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-password-confirm">
                새 비밀번호 확인 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="reset-password-confirm"
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 한 번 더 입력"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "저장 중…" : "비밀번호 변경"}
            </button>
          </form>

          <div className="login-footer login-footer--stack">
            <Link to="/login" className="signup-link">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
