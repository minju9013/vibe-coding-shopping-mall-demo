const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("로그인이 필요합니다.");
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      const error = new Error("해당 유저를 찾을 수 없습니다.");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      error.message = "유효하지 않은 토큰입니다.";
      error.statusCode = 401;
    }
    if (error.name === "TokenExpiredError") {
      error.message = "토큰이 만료되었습니다. 다시 로그인해주세요.";
      error.statusCode = 401;
    }
    next(error);
  }
};

module.exports = authMiddleware;
