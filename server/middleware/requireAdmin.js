const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.userType !== "admin") {
    const error = new Error("관리자 권한이 필요합니다.");
    error.statusCode = 403;
    return next(error);
  }
  next();
};

module.exports = requireAdmin;
