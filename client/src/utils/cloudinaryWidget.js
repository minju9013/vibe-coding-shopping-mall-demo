/** Cloudinary Upload Widget (스크립트: https://upload-widget.cloudinary.com) */
import { getCloudinaryWidgetConfig } from "../config/cloudinary";

const WIDGET_SCRIPT =
  "https://upload-widget.cloudinary.com/latest/global/all.js";

export function loadCloudinaryWidgetScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저에서만 사용할 수 있습니다."));
      return;
    }
    if (window.cloudinary?.createUploadWidget) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      `script[src="${WIDGET_SCRIPT}"]`
    );
    if (existing) {
      const finish = () => {
        if (window.cloudinary?.createUploadWidget) resolve();
        else reject(new Error("Cloudinary 위젯 API를 찾을 수 없습니다."));
      };
      if (document.readyState === "complete" && window.cloudinary?.createUploadWidget) {
        finish();
        return;
      }
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("위젯 스크립트 로드에 실패했습니다."))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (window.cloudinary?.createUploadWidget) resolve();
      else reject(new Error("Cloudinary 위젯 API를 찾을 수 없습니다."));
    };
    script.onerror = () =>
      reject(new Error("Cloudinary 위젯 스크립트를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

/**
 * @param {(payload: { publicId: string, secureUrl: string }) => void} onSuccess
 * @param {(err: unknown) => void} [onError]
 */
export function createUploadWidget(onSuccess, onError) {
  const { cloudName, uploadPreset } = getCloudinaryWidgetConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET 환경 변수가 필요합니다."
    );
  }

  return window.cloudinary.createUploadWidget(
    {
      cloudName: String(cloudName),
      uploadPreset: String(uploadPreset),
      sources: ["local", "url", "camera"],
      multiple: false,
      maxFiles: 1,
      maxFileSize: 10485760,
      showAdvancedOptions: false,
      showUploadMoreButton: false,
    },
    (error, result) => {
      if (error) {
        onError?.(error);
        return;
      }
      if (!result) return;
      if (result.event === "success" && result.info) {
        onSuccess({
          publicId: result.info.public_id,
          secureUrl: result.info.secure_url,
        });
      }
    }
  );
}
