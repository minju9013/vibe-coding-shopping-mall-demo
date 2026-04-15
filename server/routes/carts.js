/**
 * 장바구니 API — /api/carts
 * 로그인(JWT) 사용자 본인 장바구니만 접근 (user 필드 = req.user._id)
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  getMyCart,
  getMyCartCount,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearMyCart,
} = require("../controllers/cartController");

router.use(authMiddleware);

// 구체적인 경로를 먼저 등록
router.get("/me/count", getMyCartCount);
router.get("/me", getMyCart);
router.delete("/me", clearMyCart);
router.post("/me/items", addCartItem);
router.patch("/me/items/:itemId", updateCartItem);
router.delete("/me/items/:itemId", removeCartItem);

module.exports = router;
