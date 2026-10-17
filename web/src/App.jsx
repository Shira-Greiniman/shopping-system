import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addProduct,
  clearCart,
  fetchCategories,
  removeProduct,
  setQuantity
} from "./store";

const formatPrice = amount => new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS"
}).format(amount);

const productImages = {
  "עגבניות": "/images/tomatoes.jpg",
  "מלפפונים": "/images/cucumbers.jpg",
  "תפוחים": "/images/apples.jpg",
  "חלב 3%": "/images/milk.jpg",
  "ביצים L (תריסר)": "/images/eggs.jpg",
  "גבינה לבנה": "/images/white-cheese.jpg",
  "לחם מחמצת": "/images/sourdough.jpg",
  "לחמניות (6 יח׳)": "/images/rolls.jpg",
  "שמן זית": "/images/olive-oil.jpg",
  "פסטה": "/images/pasta.jpg"
};

function App() {
  const dispatch = useDispatch();
  const { categories, status, error } = useSelector(state => state.catalog);
  const cartItems = useSelector(state => state.cart.items);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setProductQuantity] = useState(1);
  const [screen, setScreen] = useState("catalog");
  const [form, setForm] = useState({ firstName: "", lastName: "", address: "", email: "" });
  const [submission, setSubmission] = useState({ status: "idle", error: "", order: null });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!categories.length) return;
    const categoryExists = categories.some(category => category.id === selectedCategoryId);
    if (!categoryExists) setSelectedCategoryId(categories[0].id);
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find(category => category.id === selectedCategoryId);
  const selectedProduct = selectedCategory?.products.find(product => product.id === Number(selectedProductId));
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  function addSelectedProduct() {
    if (!selectedProduct) return;
    dispatch(addProduct({ product: selectedProduct, quantity: Number(quantity) }));
    setSelectedProductId("");
    setProductQuantity(1);
  }

  function updateForm(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    setSubmission({ status: "loading", error: "", order: null });
    try {
      const response = await fetch("/orders-api/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity }))
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "לא ניתן לאשר את ההזמנה.");
      }
      setSubmission({ status: "succeeded", error: "", order: result });
      dispatch(clearCart());
    } catch (submitError) {
      setSubmission({
        status: "failed",
        error: submitError.message || "שליחת ההזמנה נכשלה. נסו שוב.",
        order: null
      });
    }
  }

  function startNewOrder() {
    setScreen("catalog");
    setForm({ firstName: "", lastName: "", address: "", email: "" });
    setSubmission({ status: "idle", error: "", order: null });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="סל, לעמוד הראשי">
          <span className="brand-mark" aria-hidden="true">ס</span>
          <span>סל<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> הקנייה השבועית, קצת יותר פשוטה</div>
        <div className="step-indicator" aria-label={screen === "catalog" ? "שלב 1 מתוך 2" : "שלב 2 מתוך 2"}>
          <span className={screen === "catalog" ? "step active" : "step complete"}>01</span>
          <span className="step-line" />
          <span className={screen === "checkout" ? "step active" : "step"}>02</span>
        </div>
      </header>

      {submission.status === "succeeded" ? (
        <section className="success-card" aria-live="polite">
          <div className="success-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">ההזמנה התקבלה</p>
          <h1>תודה, {form.firstName}!</h1>
          <p className="muted">ההזמנה שלך נקלטה בהצלחה.</p>
          <p className="success-total">סה״כ לתשלום <strong>{formatPrice(submission.order.total)}</strong></p>
          <button className="primary-button" onClick={startNewOrder}>מתחילים רשימה חדשה</button>
        </section>
      ) : screen === "catalog" ? (
        <>
          <section className="page-heading">
            <p className="eyebrow">הקנייה מתחילה כאן</p>
            <h1>מה נכנס לסל <span>היום?</span></h1>
            <p className="muted">מוצרים טובים, רשימה מסודרת, בלי לשכוח כלום.</p>
          </section>

          {status === "loading" && <div className="notice">טוענים את המוצרים…</div>}
          {status === "failed" && (
            <div className="notice error-notice" role="alert">
              <span>{error}</span>
              <button className="text-button" onClick={() => dispatch(fetchCategories())}>לנסות שוב</button>
            </div>
          )}

          {status === "succeeded" && (
            <div className="catalog-layout">
              <section className="catalog-panel" aria-label="בחירת מוצרים">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">הקטלוג שלנו</p>
                    <h2>בוחרים מה צריך</h2>
                  </div>
                  <span className="item-count">{categories.reduce((n, category) => n + category.products.length, 0)} מוצרים</span>
                </div>

                <div className="category-list" role="tablist" aria-label="קטגוריות">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      role="tab"
                      aria-selected={category.id === selectedCategoryId}
                      className={`category-tab ${category.id === selectedCategoryId ? "selected" : ""}`}
                      onClick={() => { setSelectedCategoryId(category.id); setSelectedProductId(""); }}
                    >
                      {category.name}
                      <span>{category.products.length}</span>
                    </button>
                  ))}
                </div>

                <div className="product-grid">
                  {(selectedCategory?.products ?? []).map((product, index) => (
                    <article className="product-card" key={product.id}>
                      <div className={`product-art art-${index % 4}`} aria-hidden="true">
                        <img src={productImages[product.name]} alt="" loading="lazy" decoding="async" />
                      </div>
                      <h3>{product.name}</h3>
                      <p>{formatPrice(product.price)}</p>
                      <button
                        className="add-button"
                        onClick={() => dispatch(addProduct({ product, quantity: 1 }))}
                        aria-label={`הוסף ${product.name} לסל`}
                      >+</button>
                    </article>
                  ))}
                </div>

                <div className="quick-add">
                  <label>
                    מוצר
                    <select value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)}>
                      <option value="">בחירת מוצר מהקטגוריה</option>
                      {(selectedCategory?.products ?? []).map(product => (
                        <option key={product.id} value={product.id}>{product.name} · {formatPrice(product.price)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="quantity-field">
                    כמות
                    <input type="number" min="1" max="99" value={quantity}
                      onChange={event => setProductQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} />
                  </label>
                  <button className="primary-button quick-add-button" disabled={!selectedProduct} onClick={addSelectedProduct}>
                    הוספה לסל <span aria-hidden="true">＋</span>
                  </button>
                </div>
              </section>

              <aside className="cart-panel" aria-label="סל הקניות">
                <div className="panel-heading cart-heading">
                  <div>
                    <p className="eyebrow">הרשימה שלך</p>
                    <h2>סל הקניות</h2>
                  </div>
                  <span className="cart-badge">{itemCount}</span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="empty-cart">
                    <div className="empty-basket" aria-hidden="true">⌑</div>
                    <p>הסל עוד ריק</p>
                    <span>הוסיפו מוצרים כדי להתחיל</span>
                  </div>
                ) : (
                  <ul className="cart-list">
                    {cartItems.map(item => (
                      <li className="cart-item" key={item.id}>
                        <div className="cart-item-main">
                          <div><strong>{item.name}</strong><span>{formatPrice(item.price)} ליחידה</span></div>
                          <button className="remove-button" onClick={() => dispatch(removeProduct(item.id))}
                            aria-label={`הסר ${item.name} מהסל`}>×</button>
                        </div>
                        <div className="cart-item-bottom">
                          <div className="quantity-control" aria-label={`כמות ${item.name}`}>
                            <button onClick={() => item.quantity === 1
                              ? dispatch(removeProduct(item.id))
                              : dispatch(setQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                              aria-label="הפחת כמות">−</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => dispatch(setQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                              aria-label="הגדל כמות" disabled={item.quantity >= 99}>＋</button>
                          </div>
                          <strong>{formatPrice(item.price * item.quantity)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="cart-summary">
                  <div><span>סכום ביניים</span><span>{formatPrice(total)}</span></div>
                  <div className="total-line"><strong>סה״כ</strong><strong>{formatPrice(total)}</strong></div>
                  <button className="primary-button checkout-button" disabled={!cartItems.length}
                    onClick={() => { setSubmission({ status: "idle", error: "", order: null }); setScreen("checkout"); }}>
                    ממשיכים להזמנה <span aria-hidden="true">←</span>
                  </button>
                  <p className="secure-note">הפרטים שלך משמשים לעיבוד ההזמנה בלבד</p>
                </div>
              </aside>
            </div>
          )}
        </>
      ) : (
        <section className="checkout-layout">
          <div className="checkout-form-panel">
            <button className="back-button" onClick={() => setScreen("catalog")}>→ חזרה לרשימה</button>
            <p className="eyebrow">עוד רגע וזה אצלך</p>
            <h1>פרטי ההזמנה</h1>
            <p className="muted">נשאר רק למלא את הפרטים ולאשר.</p>
            <form className="customer-form" onSubmit={submitOrder}>
              <div className="form-row">
                <label>שם פרטי
                  <input name="firstName" autoComplete="given-name" required maxLength="80" value={form.firstName} onChange={updateForm} />
                </label>
                <label>שם משפחה
                  <input name="lastName" autoComplete="family-name" required maxLength="80" value={form.lastName} onChange={updateForm} />
                </label>
              </div>
              <label>כתובת מלאה
                <input name="address" autoComplete="street-address" required maxLength="300"
                  placeholder="רחוב, מספר בית, עיר" value={form.address} onChange={updateForm} />
              </label>
              <label>כתובת דוא״ל
                <input name="email" type="email" autoComplete="email" required maxLength="254"
                  placeholder="name@example.com" value={form.email} onChange={updateForm} />
              </label>
              {submission.status === "failed" && <p className="form-error" role="alert">{submission.error}</p>}
              <button className="primary-button confirm-button" type="submit" disabled={submission.status === "loading"}>
                {submission.status === "loading" ? "שולחים את ההזמנה…" : "אישור הזמנה"}
              </button>
            </form>
          </div>
          <aside className="checkout-summary">
            <p className="eyebrow">הסל שלך</p>
            <h2>סיכום ההזמנה <span className="item-count">{itemCount} פריטים</span></h2>
            <ul className="summary-items">
              {cartItems.map(item => (
                <li key={item.id}>
                  <span className="summary-quantity">{item.quantity}</span>
                  <span className="summary-name">{item.name}</span>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            <div className="total-line summary-total"><strong>סה״כ לתשלום</strong><strong>{formatPrice(total)}</strong></div>
            <p className="secure-note">המחירים מעודכנים ומאומתים בעת אישור ההזמנה</p>
          </aside>
        </section>
      )}
      <footer>קניות קטנות, יום קצת יותר טוב <span>✳</span></footer>
    </main>
  );
}

export default App;
