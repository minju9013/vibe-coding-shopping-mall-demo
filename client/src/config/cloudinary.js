/**
 * Cloudinary 업로드 위젯(브라우저)에 필요한 환경 변수 — Vite 규칙상 `VITE_` 접두사만 번들에 포함됩니다.
 *
 * 필수 2개:
 * 1) VITE_CLOUDINARY_CLOUD_NAME
 *    - Cloudinary 콘솔(https://console.cloudinary.com) 대시보드에 표시되는 Cloud name
 * 2) VITE_CLOUDINARY_UPLOAD_PRESET
 *    - Settings → Upload → Upload presets 에서 만든 프리셋 **이름**
 *    - 위젯에서 unsigned 업로드를 쓰려면 프리셋 Signing mode를 **Unsigned** 로 설정
 *
 * 브라우저 위젯(Unsigned)에는 API Secret을 넣지 않습니다. API Key도 일반적으로 필요 없습니다.
 */

export const CLOUDINARY_WIDGET_ENV = {
  CLOUD_NAME: "VITE_CLOUDINARY_CLOUD_NAME",
  UPLOAD_PRESET: "VITE_CLOUDINARY_UPLOAD_PRESET",
};

function trimEnv(value) {
  if (value == null) return "";
  return String(value).trim();
}

/** 위젯 `createUploadWidget` 에 넘기는 값 */
export function getCloudinaryWidgetConfig() {
  return {
    cloudName: trimEnv(import.meta.env[CLOUDINARY_WIDGET_ENV.CLOUD_NAME]),
    uploadPreset: trimEnv(import.meta.env[CLOUDINARY_WIDGET_ENV.UPLOAD_PRESET]),
  };
}

export function isCloudinaryConfigured() {
  const { cloudName, uploadPreset } = getCloudinaryWidgetConfig();
  return Boolean(cloudName && uploadPreset);
}

/** 누락된 환경 변수 이름 배열 */
export function getMissingCloudinaryWidgetEnvKeys() {
  const { cloudName, uploadPreset } = getCloudinaryWidgetConfig();
  const missing = [];
  if (!cloudName) missing.push(CLOUDINARY_WIDGET_ENV.CLOUD_NAME);
  if (!uploadPreset) missing.push(CLOUDINARY_WIDGET_ENV.UPLOAD_PRESET);
  return missing;
}

/** 사용자에게 보여 줄 안내 문구 */
export function cloudinaryWidgetEnvHint() {
  const missing = getMissingCloudinaryWidgetEnvKeys();
  if (missing.length === 0) return "";
  return `client/.env에 ${missing.join(", ")} 를 설정한 뒤 개발 서버(npm run dev)를 다시 시작하세요. 예시는 client/.env.example 참고.`;
}
