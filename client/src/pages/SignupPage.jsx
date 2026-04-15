import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignupPage.css";

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    passwordConfirm: "",
    userType: "customer",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUserType = (type) => {
    setForm({ ...form, userType: type });
  };

  const handleAgreementAll = () => {
    const next = !agreements.all;
    setAgreements({ all: next, terms: next, privacy: next });
  };

  const handleAgreement = (key) => {
    const updated = { ...agreements, [key]: !agreements[key] };
    updated.all = updated.terms && updated.privacy;
    setAgreements(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!agreements.terms || !agreements.privacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          password: form.password,
          userType: form.userType,
          address: form.address,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "회원가입에 실패했습니다.");
        return;
      }
      alert("회원가입이 완료되었습니다!");
      navigate("/");
    } catch {
      setError("서버와 통신할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form-section">
        <div className="signup-form-wrapper">
          <Link to="/" className="signup-logo">
            KINETIC
          </Link>
          <h2 className="signup-title">회원가입</h2>
          <p className="signup-subtitle">
            기본 정보를 입력하여 계정을 생성하십시오.
          </p>

          {error && <div className="signup-error">{error}</div>}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label className="form-label">
                이메일 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@kinetic.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                이름 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="이름"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                비밀번호 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              <span className="form-hint">
                8자 이상, 영문, 숫자, 특수문자 포함
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                비밀번호 확인 <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                >
                  {showPasswordConfirm ? "🙈" : "👁"}
                </button>
              </div>
              <span className="form-hint">
                8자 이상, 영문, 숫자, 특수문자 포함
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                사용자 유형 <span className="required">*</span>
              </label>
              <div className="usertype-toggle">
                <button
                  type="button"
                  className={`usertype-btn ${form.userType === "customer" ? "active" : ""}`}
                  onClick={() => handleUserType("customer")}
                >
                  일반 사용자
                </button>
                <button
                  type="button"
                  className={`usertype-btn ${form.userType === "admin" ? "active" : ""}`}
                  onClick={() => handleUserType("admin")}
                >
                  관리자
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">주소 (선택)</label>
              <div className="input-wrapper address-wrapper">
                <span className="input-icon">📍</span>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="서울시 강남구..."
                />
                <button type="button" className="address-search-btn">
                  주소 검색
                </button>
              </div>
            </div>

            <div className="agreement-section">
              <label className="agreement-item agreement-all">
                <input
                  type="checkbox"
                  checked={agreements.all}
                  onChange={handleAgreementAll}
                />
                <div>
                  <strong>전체 동의하기</strong>
                  <p>이용약관 및 개인정보 처리방침에 모두 동의합니다.</p>
                </div>
              </label>
              <div className="agreement-divider" />
              <label className="agreement-item">
                <input
                  type="checkbox"
                  checked={agreements.terms}
                  onChange={() => handleAgreement("terms")}
                />
                <span>이용약관 동의 (필수)</span>
                <button type="button" className="agreement-link">
                  보기
                </button>
              </label>
              <label className="agreement-item">
                <input
                  type="checkbox"
                  checked={agreements.privacy}
                  onChange={() => handleAgreement("privacy")}
                />
                <span>개인정보 수집 및 이용 동의 (필수)</span>
                <button type="button" className="agreement-link">
                  보기
                </button>
              </label>
            </div>

            <button type="submit" className="submit-btn">
              가입하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
