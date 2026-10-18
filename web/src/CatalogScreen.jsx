import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addProduct,
  fetchCategories,
  removeProduct,
  setQuantity
} from "./store";
import formatPrice from "./formatPrice";

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

function CatalogScreen({ isActive, cartItems, itemCount, total, onCheckout }) {
  const dispatch = useDispatch();
  const { categories, status, error } = useSelector(state => state.catalog);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setProductQuantity] = useState(1);

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

  function addSelectedProduct() {
    if (!selectedProduct) return;
    dispatch(addProduct({ product: selectedProduct, quantity: Number(quantity) }));
    setSelectedProductId("");
    setProductQuantity(1);
  }

  return (
    <div hidden={!isActive}>
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
              <button className="primary-button checkout-button" disabled={!cartItems.length} onClick={onCheckout}>
                ממשיכים להזמנה <span aria-hidden="true">←</span>
              </button>
              <p className="secure-note">הפרטים שלך משמשים לעיבוד ההזמנה בלבד</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default CatalogScreen;
