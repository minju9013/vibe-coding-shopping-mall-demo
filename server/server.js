require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = http.createServer(app);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n[시작 실패] 포트 ${PORT}이(가) 이미 사용 중입니다.`);
      console.error("다른 터미널의 nodemon/Node를 Ctrl+C로 종료한 뒤 다시 실행하세요.");
      console.error(`또는: lsof -tiTCP:${PORT} -sTCP:LISTEN | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`환경: ${process.env.NODE_ENV}`);
  });
};

start();