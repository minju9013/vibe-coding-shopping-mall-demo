/**
 * 주문 내역(OrdersPage) · 관리자 주문(AdminOrdersPage) 공통 탭·라벨
 */
export const ORDER_STATUS_LABELS = {
  pending: "결제대기",
  paid: "결제완료",
  preparing: "상품준비중",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "주문취소",
};

/** 탭 id는 UI용; 배송중 탭 id는 shipping (API·DB는 shipped) */
export const ORDER_LIST_TABS = [
  { id: "all", label: "전체", statuses: null },
  { id: "paid", label: "결제완료", statuses: ["paid"] },
  { id: "preparing", label: "상품준비중", statuses: ["preparing"] },
  { id: "shipping", label: "배송중", statuses: ["shipped"] },
  { id: "delivered", label: "배송완료", statuses: ["delivered"] },
  { id: "cancelled", label: "주문취소", statuses: ["cancelled"] },
];

/** GET /api/orders/admin 의 status 쿼리 값 */
export function orderTabIdToApiStatus(tabId) {
  if (tabId === "all") return "all";
  if (tabId === "shipping") return "shipped";
  return tabId;
}
