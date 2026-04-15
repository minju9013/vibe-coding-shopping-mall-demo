import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  isCloudinaryConfigured,
  cloudinaryWidgetEnvHint,
} from "../../config/cloudinary";
import { loadCloudinaryWidgetScript, createUploadWidget } from "../../utils/cloudinaryWidget";
import { fetchProductById, updateProduct as updateProductApi } from "../../api/products";
import "./AdminProductsPage.css";
import "./AdminProductNewPage.css";

const CATEGORY_OPTIONS = [
  { value: "outer", label: "아우터" },
  { value: "top", label: "상의" },
  { value: "pants", label: "하의" },
  { value: "accessories", label: "악세서리" },
];

function parseCommaValues(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildOptions(sizeStr, colorStr) {
  const options = [];
  const sizes = parseCommaValues(sizeStr);
  const colors = parseCommaValues(colorStr);
  if (sizes.length) options.push({ name: "사이즈", values: sizes });
  if (colors.length) options.push({ name: "색상", values: colors });
  return options;
}

function extractOptionValues(options, optionName) {
  if (!Array.isArray(options)) return "";
  const opt = options.find((o) => o.name === optionName);
  return opt?.values?.join(", ") ?? "";
}

function AdminProductEditPage() {
  const { id } = useParams();
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [category, setCategory] = useState("outer");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [description, setDescription] = useState("");
  const [publicId, setPublicId] = useState("");
  const [secureUrl, setSecureUrl] = useState("");
  const [widgetBusy, setWidgetBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const widgetRef = useRef(null);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    let cancelled = false;
    (async () => {
      setPageLoading(true);
      setLoadError("");
      try {
        const product = await fetchProductById(id);
        if (cancelled) return;
        setName(product.name ?? "");
        setPrice(product.price != null ? String(product.price) : "");
        setListPrice(product.listPrice != null ? String(product.listPrice) : "");
        setCategory(product.category ?? "outer");
        setSizes(extractOptionValues(product.options, "사이즈"));
        setColors(extractOptionValues(product.options, "색상"));
        setDescription(product.description ?? "");
        setPublicId(product.image?.publicId ?? "");
        setSecureUrl(product.image?.secureUrl ?? "");
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "상품 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, id]);

  useEffect(() => {
    return () => {
      try { widgetRef.current?.destroy?.(); } catch { /* noop */ }
      widgetRef.current = null;
    };
  }, []);

  const openUploadWidget = useCallback(async () => {
    setError("");
    if (!isCloudinaryConfigured()) {
      setError(cloudinaryWidgetEnvHint());
      return;
    }
    setWidgetBusy(true);
    try {
      await loadCloudinaryWidgetScript();
      if (!widgetRef.current) {
        widgetRef.current = createUploadWidget(
          ({ publicId: pid, secureUrl: url }) => {
            setPublicId(pid);
            setSecureUrl(url);
            setError("");
          },
          (err) => {
            const msg = err && typeof err === "object" ? err.message : String(err || "");
            if (msg && !/abort|cancel|closed/i.test(msg)) {
              setError(msg || "업로드 중 오류가 발생했습니다.");
            }
          }
        );
      }
      widgetRef.current.open();
    } catch (e) {
      setError(e.message || "위젯을 열 수 없습니다.");
    } finally {
      setWidgetBusy(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    setPublicId("");
    setSecureUrl("");
  }, []);

  if (authLoading) {
    return <div className="admin-products-loading">불러오는 중…</div>;
  }

  if (!user || user.userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  if (pageLoading) {
    return (
      <div className="admin-products-page">
        <header className="admin-products-topbar">
          <div className="admin-products-topbar-inner">
            <Link to="/admin/products" className="admin-products-back" aria-label="상품 목록으로">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <h1 className="admin-products-title">상품 수정</h1>
          </div>
        </header>
        <main className="admin-products-main">
          <p className="admin-products-loading">상품 정보를 불러오는 중…</p>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-products-page">
        <header className="admin-products-topbar">
          <div className="admin-products-topbar-inner">
            <Link to="/admin/products" className="admin-products-back" aria-label="상품 목록으로">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <h1 className="admin-products-title">상품 수정</h1>
          </div>
        </header>
        <main className="admin-products-main">
          <p className="admin-products-banner admin-products-banner--error" role="alert">{loadError}</p>
          <Link to="/admin/products" className="product-reg-cancel" style={{ display: "inline-block", marginTop: "1rem" }}>
            목록으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const priceNum = Number(price);
    if (!name.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      setError("상품명, 판매가격을 올바르게 입력해주세요.");
      return;
    }

    const body = {
      name: name.trim(),
      price: priceNum,
      category,
      description: description.trim(),
      options: buildOptions(sizes, colors),
    };

    if (publicId.trim() && secureUrl.trim()) {
      body.image = { publicId: publicId.trim(), secureUrl: secureUrl.trim() };
    }

    const lp = listPrice === "" ? undefined : Number(listPrice);
    if (listPrice !== "" && !Number.isNaN(lp) && lp >= 0) {
      body.listPrice = lp;
    }

    setSubmitting(true);
    try {
      await updateProductApi(token, id, body);
      navigate("/admin/products", { replace: true });
    } catch (err) {
      setError(err.message || "상품 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-products-page">
      <header className="admin-products-topbar">
        <div className="admin-products-topbar-inner">
          <Link to="/admin/products" className="admin-products-back" aria-label="상품 목록으로">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="admin-products-title">상품 수정</h1>
        </div>
      </header>

      <main className="admin-products-main">
        <nav className="admin-products-tabs" aria-label="상품 관리 구역">
          <Link to="/admin/products" className="admin-products-tab">
            상품 목록
          </Link>
          <span className="admin-products-tab admin-products-tab--active" aria-current="page">
            상품 수정
          </span>
        </nav>

        <section className="product-reg-card" aria-labelledby="product-edit-form-title">
          <h2 id="product-edit-form-title" className="product-reg-form-title">
            상품 수정
          </h2>

          {error ? (
            <p className="product-reg-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="product-reg-form" onSubmit={handleSubmit}>
            <div className="product-reg-columns">
              <div className="product-reg-col">
                <label className="product-reg-label">
                  상품명
                  <input
                    type="text"
                    className="product-reg-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="상품명을 입력하세요"
                    autoComplete="off"
                  />
                </label>

                <div className="product-reg-row2">
                  <label className="product-reg-label">
                    판매가격
                    <input
                      type="number"
                      className="product-reg-input"
                      min={0}
                      step={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className="product-reg-label">
                    정가 (선택)
                    <input
                      type="number"
                      className="product-reg-input"
                      min={0}
                      step={1}
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>

                <label className="product-reg-label">
                  카테고리
                  <select
                    className="product-reg-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-reg-label">
                  사이즈 (쉼표로 구분)
                  <input
                    type="text"
                    className="product-reg-input"
                    value={sizes}
                    onChange={(e) => setSizes(e.target.value)}
                    placeholder="XS, S, M, L, XL"
                    autoComplete="off"
                  />
                </label>

                <label className="product-reg-label">
                  색상 (쉼표로 구분)
                  <input
                    type="text"
                    className="product-reg-input"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="Black, White..."
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="product-reg-col">
                <label className="product-reg-label">
                  상품 설명
                  <textarea
                    className="product-reg-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="상품에 대한 자세한 설명을 입력하세요"
                    rows={10}
                  />
                </label>

                <div className="product-reg-upload-block">
                  <span className="product-reg-label-text">메인 이미지</span>
                  <div className="product-reg-widget-row">
                    <button
                      type="button"
                      className="product-reg-widget-btn"
                      onClick={openUploadWidget}
                      disabled={widgetBusy}
                    >
                      {widgetBusy ? "위젯 준비 중…" : "Cloudinary에서 이미지 변경"}
                    </button>
                    {secureUrl ? (
                      <button
                        type="button"
                        className="product-reg-widget-clear"
                        onClick={clearImage}
                      >
                        이미지 제거
                      </button>
                    ) : null}
                  </div>
                  <p className="product-reg-hint">
                    {isCloudinaryConfigured()
                      ? "버튼을 누르면 Cloudinary 업로드 위젯이 열립니다. 이미지를 변경하지 않으면 기존 이미지가 유지됩니다."
                      : `위젯 사용: ${cloudinaryWidgetEnvHint()} 그 전까지는 아래에 publicId·secureUrl을 직접 입력할 수 있습니다.`}
                  </p>
                  {secureUrl ? (
                    <figure className="product-reg-preview-wrap">
                      <div className="product-reg-preview-frame">
                        <img
                          key={secureUrl}
                          className="product-reg-preview"
                          src={secureUrl}
                          alt={name.trim() ? `${name} 미리보기` : "상품 이미지 미리보기"}
                        />
                      </div>
                      {publicId ? (
                        <figcaption className="product-reg-preview-caption">
                          public_id: <code>{publicId}</code>
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}
                </div>

                <div className="product-reg-manual-img">
                  <span className="product-reg-label-text">
                    Cloudinary 직접 입력 (선택)
                  </span>
                  <input
                    type="text"
                    className="product-reg-input product-reg-input--mono"
                    value={publicId}
                    onChange={(e) => setPublicId(e.target.value)}
                    placeholder="publicId"
                    autoComplete="off"
                  />
                  <input
                    type="url"
                    className="product-reg-input product-reg-input--mono"
                    value={secureUrl}
                    onChange={(e) => setSecureUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="product-reg-actions">
              <Link to="/admin/products" className="product-reg-cancel">
                취소
              </Link>
              <button
                type="submit"
                className="product-reg-submit"
                disabled={submitting || widgetBusy}
              >
                {submitting ? "저장 중…" : "수정 저장"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AdminProductEditPage;
