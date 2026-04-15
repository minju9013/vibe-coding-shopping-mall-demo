import { createContext, useCallback, useContext, useState } from "react";

const CartContext = createContext(null);

/**
 * 장바구니 변동 시 네비바 배지를 즉시 갱신하기 위한 경량 컨텍스트.
 * cartVersion이 바뀌면 HomeNavbar가 /carts/me/count를 다시 호출한다.
 */
export function CartProvider({ children }) {
  const [cartVersion, setCartVersion] = useState(0);

  const bumpCart = useCallback(() => {
    setCartVersion((v) => v + 1);
  }, []);

  return (
    <CartContext.Provider value={{ cartVersion, bumpCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart는 CartProvider 내부에서 사용해야 합니다.");
  return ctx;
}
