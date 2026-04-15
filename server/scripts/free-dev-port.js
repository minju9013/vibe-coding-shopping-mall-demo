/**
 * 로컬에서 `npm run dev` 시 기존에 포트를 잡고 있던 Node 프로세스를 끄는 용도입니다.
 * (Heroku는 `npm start`만 쓰므로 이 스크립트는 predev에서만 호출됩니다.)
 */
const { execSync } = require("child_process");

const port = Number(process.env.PORT || 5000, 10) || 5000;

try {
  const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null`, {
    encoding: "utf8",
  }).trim();
  if (!out) return;

  const pids = [...new Set(out.split(/\n/).map((s) => s.trim()).filter(Boolean))];
  for (const pid of pids) {
    const n = Number(pid, 10);
    if (!Number.isFinite(n) || n <= 0 || n === process.pid) continue;
    try {
      process.kill(n, "SIGKILL");
    } catch (_) {
      /* 이미 종료됨 */
    }
  }
  if (pids.length) {
    console.log(`[predev] 포트 ${port} 점유 프로세스 종료: ${pids.join(", ")}`);
  }
} catch (_) {
  /* lsof 없음 또는 해당 포트 LISTEN 없음 */
}
