const express = require("express");
const router = express.Router();
const { login, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware, getMe);

module.exports = router;
