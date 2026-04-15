import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { patchCartItem } from "../../api/cart";
import { getColorValues, getSizeValues } from "../../utils/cartProductOptions";
import { resolveColorName, parseSwatchColors, isLightColor } from "../../utils/productColors";
import "./CartEditModal.css";

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

const CartEditModal = memo(function CartEditModal({ item, token, onClose, onSaved }) {
  const product = item?.product;
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const colorValues = product ? getColorValues(product) : [];
  const sizeValues = product ? getSizeValues(product) : [];

  useEffect(() => {
    if (!item) return;
    setColor(typeof item.color === "string" ? item.color : "");
    setSize(typeof item.size === "string" ? item.size : "");
    setQty(Math.max(1, Number(item.quantity) || 1));
    setError("");
  }, [item]);

  const handleSave = useCallback(async () => {
    if (!item?._id || !token || !product) return;
    setSaving(true);
    setError("");
    try {
      const unitPrice = Number(product.price);
      const cart = await patchCartItem(token, item._id, {
        quantity: qty,
        color,
        size,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
      });
      onSaved(cart);
      onClose();
    } catch (e) {
      setError(e.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [item, token, product, qty, color, size, onSaved, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item || typeof document === "undefined") return null;

  const thumb = product?.image?.secureUrl;

  return createPortal(
    <div
      className="cart-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cart-modal" role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">
        <div className="cart-modal-header">
          <h2 id="cart-modal-title" className="cart-modal-title">
            옵션 수정
          </h2>
          <button type="button" className="cart-modal-close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cart-modal-body">
          {!product ? (
            <p className="cart-modal-error">상품 정보를 불러올 수 없습니다.</p>
          ) : (
            <>
              <div className="cart-modal-product">
                {thumb ? (
                  <img src={thumb} alt="" className="cart-modal-thumb" />
                ) : (
                  <div className="cart-modal-thumb" aria-hidden />
                )}
                <p className="cart-modal-product-name">{product.name}</p>
              </div>

              {error ? <p className="cart-modal-error">{error}</p> : null}

              <div className="cart-modal-field">
                <span className="cart-modal-label">색상</span>
                {colorValues.length > 0 ? (
                  <div className="cart-modal-sizes">
                    {colorValues.map((v) => {
                      const parts = parseSwatchColors(v);
                      const bg = resolveColorName(parts[0]);
                      const light = isLightColor(bg);
                      return (
                        <button
                          key={v}
                          type="button"
                          className={`cart-modal-color-btn ${color === v ? "cart-modal-color-btn--active" : ""}`}
                          onClick={() => setColor(v)}
                        >
                          <span
                            className={`cart-modal-color-dot ${light ? "cart-modal-color-dot--light" : ""}`}
                            style={{ background: bg }}
                            aria-hidden
                          />
                          {v}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="cart-modal-text-input"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="색상"
                    aria-label="색상"
                  />
                )}
              </div>

              <div className="cart-modal-field">
                <span className="cart-modal-label">사이즈</span>
                {sizeValues.length > 0 ? (
                  <div className="cart-modal-sizes">
                    {sizeValues.map((v) => {
                      const label = String(v).replace(/\s*품절\s*/g, "").trim();
                      const dis = String(v).includes("품절");
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={dis}
                          className={`cart-modal-size-btn ${size === label ? "cart-modal-size-btn--active" : ""}`}
                          onClick={() => setSize(label)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="cart-modal-text-input"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="사이즈"
                    aria-label="사이즈"
                  />
                )}
              </div>

              <div className="cart-modal-field">
                <span className="cart-modal-label">수량</span>
                <div className="cart-modal-qty">
                  <button
                    type="button"
                    aria-label="수량 감소"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span>{qty}</span>
                  <button
                    type="button"
                    aria-label="수량 증가"
                    disabled={qty >= 99}
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="cart-modal-label" style={{ marginTop: "0.5rem" }}>
                예상 금액: {formatPriceKRW((Number(product.price) || 0) * qty)}
              </p>
            </>
          )}
        </div>
        <div className="cart-modal-footer">
          <button type="button" className="cart-modal-btn cart-modal-btn--ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="cart-modal-btn cart-modal-btn--primary"
            disabled={saving || !product}
            onClick={handleSave}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default CartEditModal;
