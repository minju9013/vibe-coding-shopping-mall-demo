/** 상품 옵션 "색상" 문자열 → CSS 색 (한·영 일반 명칭) */
const ENTRIES = [
  ["#1a1a1a", ["black", "블랙", "검정", "charcoal", "차콜", "다크그레이"]],
  ["#ffffff", ["white", "화이트", "흰색", "ivory", "아이보리", "cream", "크림"]],
  ["#9ca3af", ["gray", "grey", "그레이", "회색", "silver", "실버"]],
  ["#dc2626", ["red", "레드", "빨강", "빨간", "burgundy", "버건디"]],
  ["#2563eb", ["blue", "블루", "파랑", "navy", "네이비", "청"]],
  ["#16a34a", ["green", "그린", "초록", "olive", "올리브", "khaki", "카키"]],
  ["#84cc16", ["lime", "라임", "연두", "neon green"]],
  ["#eab308", ["yellow", "옐로우", "노랑", "골드", "gold"]],
  ["#ea580c", ["orange", "오렌지", "주황"]],
  ["#ec4899", ["pink", "핑크", "분홍", "로즈", "rose"]],
  ["#9333ea", ["purple", "퍼플", "보라", "violet"]],
  ["#78350f", ["brown", "브라운", "갈색", "chocolate"]],
  ["#f5f5f4", ["off white", "오프화이트", "oatmeal", "오트밀"]],
  ["#1e3a8a", ["indigo", "인디고", "딥블루"]],
  ["#0d9488", ["teal", "틸", "민트", "mint"]],
  ["#78716c", ["taupe", "토프", "beige", "베이지"]],
];

const LOOKUP = {};
for (const [hex, names] of ENTRIES) {
  for (const n of names) {
    LOOKUP[n.toLowerCase().replace(/\s+/g, " ").trim()] = hex;
  }
}

export function resolveColorName(raw) {
  if (raw == null || raw === "") return "#d1d5db";
  const s = String(raw).trim();
  const hexMatch = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) return s.startsWith("#") ? s : `#${s}`;

  const key = s.toLowerCase().replace(/\s+/g, " ").trim();
  if (LOOKUP[key]) return LOOKUP[key];

  for (const [name, hex] of Object.entries(LOOKUP)) {
    if (key.includes(name) || name.includes(key)) return hex;
  }
  return "#d1d5db";
}

export function isLightColor(cssColor) {
  const m = cssColor?.match(/^#([0-9a-f]{6})$/i);
  if (!m) return cssColor?.toLowerCase() === "#ffffff" || cssColor?.toLowerCase() === "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.85;
}

/** "색상" 옵션 값 배열 */
export function getProductColorValues(product) {
  const opt = product?.options?.find((o) => o.name === "색상");
  const v = opt?.values;
  return Array.isArray(v) && v.length ? v : [];
}

/**
 * 한 칸에 넣을 색상 1~2개 (쉼표·슬래시 등으로 이색 표현)
 */
export function parseSwatchColors(value) {
  if (value == null || value === "") return ["#d1d5db"];
  const s = String(value).trim();
  const byComma = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (byComma.length >= 2) {
    return [resolveColorName(byComma[0]), resolveColorName(byComma[1])];
  }
  const bySlash = s.split(/[/|]/).map((x) => x.trim()).filter(Boolean);
  if (bySlash.length >= 2) {
    return [resolveColorName(bySlash[0]), resolveColorName(bySlash[1])];
  }
  return [resolveColorName(s)];
}
