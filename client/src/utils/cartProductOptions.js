/** 상품 문서의 options에서 사이즈·색상 값 목록 추출 */
export function getSizeValues(product) {
  const opt = product?.options?.find((o) => o.name === "사이즈");
  return Array.isArray(opt?.values) && opt.values.length ? opt.values : [];
}

export function getColorValues(product) {
  const opt = product?.options?.find((o) => o.name === "색상");
  return Array.isArray(opt?.values) && opt.values.length ? opt.values : [];
}
