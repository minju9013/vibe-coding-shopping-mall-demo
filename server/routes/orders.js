/**
 * 주문 API — /api/orders
 * 모든 엔드포인트는 JWT 인증 필수
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  checkout,
  getAllOrders,
  getMyOrders,
  getOrderDetail,
  cancelOrder,
  updateOrderStatus,
} = require("../controllers/orderController");

router.use(authMiddleware);

router.get("/admin", getAllOrders);
router.post("/", checkout);
router.get("/me", getMyOrders);
router.get("/me/:orderId", getOrderDetail);
router.patch("/me/:orderId/cancel", cancelOrder);
router.patch("/:orderId/status", updateOrderStatus);

module.exports = router;
