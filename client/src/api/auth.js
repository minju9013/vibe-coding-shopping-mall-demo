import { API_BASE_URL } from "../config/api";

/** POST /api/auth/forgot-password */
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "요청을 처리하지 못했습니다.");
  }
  return data;
}

/** POST /api/auth/reset-password */
export async function resetPasswordWithToken(token, password) {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "비밀번호를 변경하지 못했습니다.");
  }
  return data;
}
