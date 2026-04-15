const express = require("express");
const router = express.Router();
const userRoutes = require("./users");
const authRoutes = require("./auth");
const productRoutes = require("./products");
const cartRoutes = require("./carts");
const orderRoutes = require("./orders");

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Shopping Mall API 서버가 정상 작동 중입니다.",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/carts", cartRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
