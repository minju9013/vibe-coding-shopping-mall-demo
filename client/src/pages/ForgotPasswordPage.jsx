import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";
import "./LoginPage.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevResetUrl("");
    setIsLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      setSuccess(data.message || "요청이 접수되었습니다.");
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
    } catch (err) {
      setError(err.message || "요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-section">
        <div className="login-form-wrapper">
          <Link to="/" className="login-logo">
            KINETIC
          </Link>
          <h2 className="login-title">비밀번호 재설정</h2>
          <p className="login-subtitle">
            가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 안내를 보내드립니다.
          </p>

          {error ? <div className="login-error">{error}</div> : null}
          {success ? <div className="login-success">{success}</div> : null}
          {devResetUrl ? (
            <div className="login-dev-reset">
              <p className="login-dev-reset-title">개발 모드</p>
              <p className="login-dev-reset-text">
                실제 이메일 발송 대신 아래 링크로 바로 재설정할 수 있습니다.
              </p>
              <a href={devResetUrl} className="login-dev-reset-link">
                비밀번호 재설정 페이지 열기
              </a>
            </div>
          ) : null}

          {!success ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">
                  이메일 <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">✉</span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@kinetic.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? "전송 중…" : "재설정 안내 받기"}
              </button>
            </form>
          ) : null}

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

export default ForgotPasswordPage;
