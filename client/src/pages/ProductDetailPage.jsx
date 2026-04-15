import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { fetchAllProducts, fetchProductById } from "../api/products";
import { addCartItem } from "../api/cart";
import {
  getProductColorValues,
  isLightColor,
  parseSwatchColors,
} from "../utils/productColors";
import { HomeFooter, HomeNavbar } from "../components/layout";
import "./ProductDetailPage.css";

const BREADCRUMB_PARENT = {
  outer: "의류",
  top: "의류",
  pants: "의류",
  accessories: "액세서리",
};

const DEFAULT_FALLBACK_SIZES = ["S", "M", "L", "XL", "XXL"];

const DEFAULT_COLOR_SWATCHES = [
  { label: "스페이스 블랙", token: "블랙" },
  { label: "차콜 그레이", token: "그레이" },
  { label: "포레스트 그린", token: "그린" },
  { label: "아이스 화이트", token: "화이트" },
];

const DESC_VISIBLE_DEFAULT = 3;

const DEFAULT_DESCRIPTION = `- 신축성이 뛰어나고 매우 부드러운 기능성 니트 소재로 궁극의 편안함을 선사합니다. - 소재가 땀을 흡수하고 매우 빠르게 건조됩니다. - 내부의 쉘프 브라에 탈착식 패드가 적용되어 지지력을 향상하며 커버력이 우수합니다. - 앞면의 스쿱 넥과 뒷면의 스키니 스트랩 레이서백 디자인이 돋보입니다. - 가슴, 뒷면 중앙, 밑단에 대비되는 색상의 스티치 디테일이 있습니다. - 체취 억제 기술로 냄새를 최소화합니다.`;

/** "- 항목 - 항목" 형식을 공백으로 구분된 하이픈 기준으로 줄 단위로 분리 */
function splitDescriptionByDash(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return [];
  const withoutLeading = t.replace(/^\s*-\s+/, "");
  const parts = withoutLeading.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [t];
}

function formatPriceKRW(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function getSizeValues(product) {
  const opt = product?.options?.find((o) => o.name === "사이즈");
  if (opt?.values?.length) return opt.values;
  return [...DEFAULT_FALLBACK_SIZES];
}

function sizeButtonDisabled(sizeVal, usingFallbackSizes) {
  if (String(sizeVal).includes("품절")) return true;
  return usingFallbackSizes && String(sizeVal).trim() === "XXL";
}

function buildColorChoices(product) {
  const fromApi = getProductColorValues(product);
  if (fromApi.length) {
    return fromApi.map((v) => ({ label: v, token: v }));
  }
  return DEFAULT_COLOR_SWATCHES;
}

const StarRow = memo(function StarRow({ filledCount }) {
  return (
    <div className="pdp-stars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          className={`pdp-star ${i < filledCount ? "pdp-star--fill" : ""}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
});

const AccordionItem = memo(function AccordionItem({ title, children, open, onToggle }) {
  return (
    <div className="pdp-accordion-item">
      <button
        type="button"
        className="pdp-accordion-trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className="pdp-accordion-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="pdp-accordion-panel">{children}</div> : null}
    </div>
  );
});

const ProductDescriptionBlock = memo(function ProductDescriptionBlock({ text, resetKey }) {
  const lines = useMemo(() => splitDescriptionByDash(text), [text]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);

  const hasMore = lines.length > DESC_VISIBLE_DEFAULT;
  const visibleLines = expanded || !hasMore ? lines : lines.slice(0, DESC_VISIBLE_DEFAULT);

  if (lines.length === 0) return null;

  return (
    <div className="pdp-desc-block">
      <ul className="pdp-desc-list">
        {visibleLines.map((line, i) => (
          <li key={i} className="pdp-desc-line">
            {line}
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="pdp-desc-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "접기" : "더보기"}
        </button>
      ) : null}
    </div>
  );
});

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, loading, logout } = useAuth();
  const { bumpCart } = useCart();

  const [product, setProduct] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadState("loading");
      setErrorMsg("");
      try {
        const [p, all] = await Promise.all([fetchProductById(id), fetchAllProducts()]);
        if (cancelled) return;
        setProduct(p);
        const others = all.filter((x) => String(x._id) !== String(p._id)).slice(0, 4);
        setRecommended(others);
        setActiveThumb(0);
        setSelectedColorIdx(0);
        const sizes = getSizeValues(p);
        const sizeOpt = p?.options?.find((o) => o.name === "사이즈");
        const usingFallback = !sizeOpt?.values?.length;
        const firstAvailable = sizes.find((s) => !sizeButtonDisabled(s, usingFallback));
        setSelectedSize(firstAvailable ?? sizes[0] ?? "M");
        setQuantity(1);
        setLoadState("ok");
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e.message || "상품을 불러오지 못했습니다.");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const colorChoices = useMemo(() => (product ? buildColorChoices(product) : []), [product]);
  const selectedColor = colorChoices[selectedColorIdx] ?? colorChoices[0];

  const sizes = useMemo(() => (product ? getSizeValues(product) : []), [product]);
  const usingFallbackSizes = useMemo(() => {
    if (!product) return false;
    return !product.options?.find((o) => o.name === "사이즈")?.values?.length;
  }, [product]);

  const mainImageUrl = product?.image?.secureUrl || "";
  const thumbUrls = useMemo(() => {
    const u = mainImageUrl;
    return u ? [u, u, u, u] : [];
  }, [mainImageUrl]);

  const listPrice = product?.listPrice != null ? Number(product.listPrice) : null;
  const salePrice = product ? Number(product.price) : NaN;
  const cartLineTotal = useMemo(() => {
    if (!product || Number.isNaN(salePrice)) return 0;
    return Math.max(0, Math.round(salePrice * quantity));
  }, [product, salePrice, quantity]);
  const showList =
    product &&
    listPrice != null &&
    !Number.isNaN(listPrice) &&
    !Number.isNaN(salePrice) &&
    listPrice > salePrice;

  const descriptionText = product?.description?.trim() || DEFAULT_DESCRIPTION;

  const breadcrumbParent = product ? BREADCRUMB_PARENT[product.category] || "의류" : "";

  const toggleAccordion = useCallback((key) => {
    setOpenAccordion((prev) => (prev === key ? null : key));
  }, []);

  const handleAddCart = useCallback(async () => {
    if (!product) return;
    if (!token) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    const sizeStr =
      selectedSize != null ? String(selectedSize).replace(/\s*품절\s*/g, "").trim() : "";
    try {
      await addCartItem(token, {
        productId: product._id,
        quantity,
        color: selectedColor?.label ?? "",
        size: sizeStr,
        unitPrice: product.price,
      });
      bumpCart();
      window.alert(
        `장바구니에 ${quantity}개 담았습니다. (합계 ${formatPriceKRW(cartLineTotal)})`
      );
    } catch (e) {
      window.alert(e.message || "장바구니에 담지 못했습니다.");
    }
  }, [
    product,
    token,
    id,
    navigate,
    quantity,
    selectedColor,
    selectedSize,
    cartLineTotal,
    bumpCart,
  ]);

  const handleAddWishlist = useCallback(() => {
    window.alert("위시리스트에 담았습니다.");
  }, []);

  return (
    <div className="pdp">
      <HomeNavbar user={user} token={token} loading={loading} onLogout={handleLogout} />

      <main className="pdp-main">
        {loadState === "loading" ? (
          <p className="pdp-loading">상품을 불러오는 중…</p>
        ) : loadState === "error" ? (
          <div className="pdp-error">
            <p>{errorMsg}</p>
            <p style={{ marginTop: "1rem" }}>
              <Link to="/">홈으로 돌아가기</Link>
            </p>
          </div>
        ) : product ? (
          <>
            <nav className="pdp-breadcrumb" aria-label="breadcrumb">
              <Link to="/">홈</Link>
              <span className="pdp-bc-sep" aria-hidden>
                {" "}
                &gt;{" "}
              </span>
              <span>{breadcrumbParent}</span>
              <span className="pdp-bc-sep" aria-hidden>
                {" "}
                &gt;{" "}
              </span>
              <span className="pdp-bc-current">{product.name}</span>
            </nav>

            <div className="pdp-grid">
              <div className="pdp-gallery">
                <div className="pdp-gallery-main">
                  {mainImageUrl ? (
                    <img src={mainImageUrl} alt={product.name} />
                  ) : null}
                </div>
                <div className="pdp-gallery-thumbs">
                  {thumbUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pdp-gallery-thumb ${i === activeThumb ? "pdp-gallery-thumb--active" : ""}`}
                      onClick={() => setActiveThumb(i)}
                      aria-label={`이미지 ${i + 1}`}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pdp-info">
                <h1 className="pdp-info-title">{product.name}</h1>
                <p className="pdp-info-price">
                  {formatPriceKRW(product.price)}
                  {showList ? <del>{formatPriceKRW(listPrice)}</del> : null}
                </p>

                <div className="pdp-rating">
                  <StarRow filledCount={4} />
                  <span className="pdp-rating-text">4.2 (128 리뷰)</span>
                </div>

                <ProductDescriptionBlock text={descriptionText} resetKey={product._id} />

                <div className="pdp-field">
                  <p className="pdp-field-label">
                    색상 선택: {selectedColor?.label ?? "—"}
                  </p>
                  <div className="pdp-color-swatches">
                    {colorChoices.map((c, i) => {
                      const parts = parseSwatchColors(c.token);
                      const active = i === selectedColorIdx;
                      const swCls = "pdp-color-swatch";
                      if (parts.length >= 2) {
                        return (
                          <button
                            key={`${c.label}-${i}`}
                            type="button"
                            className={`${swCls} ${swCls}--split ${active ? `${swCls}--active` : ""}`}
                            onClick={() => setSelectedColorIdx(i)}
                            title={c.label}
                            aria-label={`색상 ${c.label}`}
                            aria-pressed={active}
                          >
                            <span
                              className="pdp-color-swatch-half"
                              style={{ background: parts[0] }}
                              aria-hidden
                            />
                            <span
                              className="pdp-color-swatch-half"
                              style={{ background: parts[1] }}
                              aria-hidden
                            />
                          </button>
                        );
                      }
                      const bg = parts[0];
                      const light = isLightColor(bg);
                      return (
                        <button
                          key={`${c.label}-${i}`}
                          type="button"
                          className={`${swCls} ${light ? `${swCls}--light` : ""} ${active ? `${swCls}--active` : ""}`}
                          style={{ background: bg }}
                          onClick={() => setSelectedColorIdx(i)}
                          title={c.label}
                          aria-label={`색상 ${c.label}`}
                          aria-pressed={active}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="pdp-field">
                  <div className="pdp-field-head">
                    <span className="pdp-field-label">사이즈 선택</span>
                    <button type="button" className="pdp-size-guide">
                      사이즈 가이드
                    </button>
                  </div>
                  <div className="pdp-sizes" role="group" aria-label="사이즈">
                    {sizes.map((s) => {
                      const dis = sizeButtonDisabled(s, usingFallbackSizes);
                      const active = selectedSize === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`pdp-size-btn ${active ? "pdp-size-btn--active" : ""}`}
                          disabled={dis}
                          onClick={() => setSelectedSize(s)}
                        >
                          {String(s).replace(/\s*품절\s*/g, "").trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pdp-field">
                  <p className="pdp-field-label">수량</p>
                  <div className="pdp-qty-row">
                    <div className="pdp-qty-control">
                      <button
                        type="button"
                        className="pdp-qty-btn"
                        aria-label="수량 한 개 줄이기"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        -
                      </button>
                      <span className="pdp-qty-value" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="pdp-qty-btn"
                        aria-label="수량 한 개 늘리기"
                        disabled={quantity >= 99}
                        onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      >
                        +
                      </button>
                    </div>
                    <span className="pdp-stock-hint">재고 5개 남음</span>
                  </div>
                </div>

                <div className="pdp-cta-stack">
                  <button type="button" className="pdp-add-cart" onClick={handleAddCart}>
                    <span className="pdp-add-cart-inner">
                      <svg
                        className="pdp-add-cart-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="pdp-add-cart-label">
                        장바구니 담기 - {formatPriceKRW(cartLineTotal)}
                      </span>
                    </span>
                  </button>
                  <button type="button" className="pdp-add-wishlist" onClick={handleAddWishlist}>
                    <svg
                      className="pdp-wishlist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    위시리스트 담기
                  </button>
                </div>

                <div className="pdp-accordions">
                  <AccordionItem
                    title="소재 및 세탁 방법"
                    open={openAccordion === "material"}
                    onToggle={() => toggleAccordion("material")}
                  >
                    폴리에스터 혼방 원단 사용. 찬물 단독 세탁을 권장하며, 표백제 사용을 피해 주세요. 건조기 사용
                    시 저온으로 줄여 주세요.
                  </AccordionItem>
                  <AccordionItem
                    title="사이즈 및 핏"
                    open={openAccordion === "fit"}
                    onToggle={() => toggleAccordion("fit")}
                  >
                    애슬레틱 핏입니다. 여유 있는 착용을 원하시면 한 사이즈 업을 권장합니다. 상세 치수는 사이즈
                    가이드를 참고해 주세요.
                  </AccordionItem>
                  <AccordionItem
                    title="배송 및 반품"
                    open={openAccordion === "ship"}
                    onToggle={() => toggleAccordion("ship")}
                  >
                    결제 완료 후 영업일 기준 2~3일 내 출고됩니다. 단순 변심 시 수령 후 7일 이내 미착용 상태로
                    반품 가능합니다.
                  </AccordionItem>
                </div>
              </div>
            </div>

            {recommended.length > 0 ? (
              <section className="pdp-reco" aria-labelledby="pdp-reco-heading">
                <h2 id="pdp-reco-heading" className="pdp-reco-title">
                  추천 상품
                </h2>
                <div className="pdp-reco-grid">
                  {recommended.map((rp) => (
                    <Link key={rp._id} to={`/products/${rp._id}`} className="pdp-reco-card">
                      <div className="pdp-reco-img">
                        {rp.image?.secureUrl ? (
                          <img src={rp.image.secureUrl} alt="" />
                        ) : null}
                      </div>
                      <p className="pdp-reco-name">{rp.name}</p>
                      <p className="pdp-reco-price">{formatPriceKRW(rp.price)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      <HomeFooter />
    </div>
  );
}
