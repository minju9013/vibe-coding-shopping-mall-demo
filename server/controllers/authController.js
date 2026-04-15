const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // JWT 토큰 생성/검증 라이브러리
const User = require("../models/User"); // MongoDB User 모델

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * JWT 토큰 생성 함수
 * @param {string} userId - MongoDB에서 부여한 유저 고유 ID (_id)
 * @returns {string} 서명된 JWT 토큰 문자열
 *
 * jwt.sign()의 인자:
 *  - { id: userId } : 토큰에 담길 데이터 (payload). 나중에 디코딩하여 유저 식별에 사용
 *  - process.env.JWT_SECRET : 토큰 서명에 사용되는 비밀 키 (.env 파일에 정의)
 *  - expiresIn : 토큰 만료 기간 (기본 7일). 만료 후 재로그인 필요
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * 로그인 API 컨트롤러
 * POST /api/auth/login
 *
 * 요청 body: { email, password }
 * 성공 응답: { success: true, token: "JWT토큰", data: { 유저정보(비밀번호 제외) } }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) 필수 입력값 검증
    if (!email || !password) {
      const error = new Error("이메일과 비밀번호를 입력해주세요.");
      error.statusCode = 400;
      throw error;
    }

    // 2) 이메일로 DB에서 유저 조회 (소문자로 통일하여 검색)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      error.statusCode = 401;
      throw error;
    }

    // 3) 입력된 비밀번호와 DB에 저장된 해싱된 비밀번호 비교 (bcrypt 사용)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      error.statusCode = 401;
      throw error;
    }

    // 4) 인증 성공 → JWT 토큰 발급
    const token = generateToken(user._id);

    // 5) 응답에서 비밀번호 필드 제거 후 유저 정보 + 토큰 반환
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, token, data: userResponse });
  } catch (error) {
    next(error);
  }
};

/**
 * 현재 로그인된 유저 정보 조회 API
 * GET /api/auth/me
 *
 * authMiddleware를 거쳐야 하므로, req.user에 이미 유저 정보가 주입되어 있음
 * 클라이언트가 페이지 새로고침 시 저장된 토큰으로 로그인 상태를 복원할 때 사용
 */
const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * body: { email }
 * — 이메일 존재 여부와 관계없이 동일한 메시지(계정 열거 방지)
 * — 개발 환경에서는 재설정 URL을 응답에 포함(실제 메일 미연동 시 테스트용)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) {
      const error = new Error("이메일을 입력해주세요.");
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    const sameMessage =
      "등록된 이메일이 있다면 비밀번호 재설정 안내가 전송되었습니다. 메일함을 확인해 주세요.";

    if (!user) {
      return res.json({ success: true, message: sameMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const payload = { success: true, message: sameMessage };
    if (process.env.NODE_ENV !== "production") {
      const origin = (req.get("origin") || "").replace(/\/$/, "") || process.env.CLIENT_URL || "http://localhost:5173";
      payload.resetUrl = `${origin}/reset-password?token=${rawToken}`;
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * body: { token, password }
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      const error = new Error("토큰과 새 비밀번호를 입력해주세요.");
      error.statusCode = 400;
      throw error;
    }
    if (String(password).length < 6) {
      const error = new Error("비밀번호는 최소 6자 이상이어야 합니다.");
      error.statusCode = 400;
      throw error;
    }

    const hashed = hashResetToken(String(token).trim());
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select("+password +passwordResetToken +passwordResetExpires");

    if (!user) {
      const error = new Error("유효하지 않거나 만료된 재설정 링크입니다. 다시 요청해 주세요.");
      error.statusCode = 400;
      throw error;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요." });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, forgotPassword, resetPassword };
