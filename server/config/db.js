const mongoose = require("mongoose");
const Product = require("../models/Product");

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/shopping-mall";

/**
 * MongoDB 연결 문자열
 * 1) MONGODB_ATLAS_URL — MongoDB Atlas (클라우드)
 * 비어 있으면 2) MONGODB_URI, 3) 로컬 기본값
 */
function resolveMongoUri() {
  const atlas = typeof process.env.MONGODB_ATLAS_URL === "string" ? process.env.MONGODB_ATLAS_URL.trim() : "";
  const local = typeof process.env.MONGODB_URI === "string" ? process.env.MONGODB_URI.trim() : "";

  if (atlas) return { uri: atlas, label: "Atlas (MONGODB_ATLAS_URL)" };
  if (local) return { uri: local, label: "로컬 (MONGODB_URI)" };
  return { uri: DEFAULT_LOCAL_URI, label: "로컬 (기본값)" };
}

const connectDB = async () => {
  try {
    const { uri, label } = resolveMongoUri();
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB 연결 성공 (${label}): ${conn.connection.host}`);

    // 스키마에 없는 인덱스(예: 예전 productId unique) 제거 — 두 번째 상품 삽입이 막히는 흔한 원인
    await Product.syncIndexes();
    console.log("Product 컬렉션 인덱스를 스키마와 맞춤(syncIndexes)했습니다.");
  } catch (error) {
    console.error(`MongoDB 연결 실패: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
