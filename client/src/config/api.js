/**
 * 백엔드 API 베이스 URL (app.js에서 /api 로 mount)
 * 로컬 기본: http://localhost:5000/api
 * 배포 시 client/.env 에 VITE_API_URL=https://your-api.com/api
 */
const raw = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const API_BASE_URL = String(raw).replace(/\/$/, "");
