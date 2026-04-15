/**
 * 상품 API 라우터
 * app에서 /api 에 붙인 뒤 mount되므로 실제 경로는 /api/products 기준입니다.
 */
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductBySku,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const authMiddleware = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// GET /api/products — 목록 (인증 불필요)
// 쿼리: all=1(전체·최대 500건) | page, limit(기본 8, 최대 50), category, search
router.get("/", getProducts);
// GET /api/products/sku/:sku — 단건 조회(SKU). /:id 보다 먼저 등록해야 함
router.get("/sku/:sku", getProductBySku);
// GET /api/products/:id — 단건 조회(MongoDB _id). 인증 불필요
router.get("/:id", getProductById);

// 아래는 JWT 로그인 + 관리자(userType === "admin")만 허용
router.post("/", authMiddleware, requireAdmin, createProduct);
router.put("/:id", authMiddleware, requireAdmin, updateProduct);
router.delete("/:id", authMiddleware, requireAdmin, deleteProduct);

module.exports = router;
