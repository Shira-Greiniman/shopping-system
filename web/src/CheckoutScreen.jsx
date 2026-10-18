import { useState } from "react";
import formatPrice from "./formatPrice";

const initialForm = { firstName: "", lastName: "", address: "", email: "" };
const initialSubmission = { status: "idle", error: "", order: null };

function CheckoutScreen({ isActive, cartItems, itemCount, total, onBack, onOrderSuccess, onNewOrder }) {
  const [form, setForm] = useState(initialForm);
  const [submission, setSubmission] = useState(initialSubmission);

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
      onOrderSuccess();
    } catch (submitError) {
      setSubmission({
        status: "failed",
        error: submitError.message || "שליחת ההזמנה נכשלה. נסו שוב.",
        order: null
      });
    }
  }

  function startNewOrder() {
    setForm(initialForm);
    setSubmission(initialSubmission);
    onNewOrder();
  }

  return (
    <div hidden={!isActive}>
      {submission.status === "succeeded" ? (
        <section className="success-card" aria-live="polite">
          <div className="success-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">ההזמנה התקבלה</p>
          <h1>תודה, {form.firstName}!</h1>
          <p className="muted">ההזמנה שלך נקלטה בהצלחה.</p>
          <p className="success-total">סה״כ לתשלום <strong>{formatPrice(submission.order.total)}</strong></p>
          <button className="primary-button" onClick={startNewOrder}>מתחילים רשימה חדשה</button>
        </section>
      ) : (
        <section className="checkout-layout">
          <div className="checkout-form-panel">
            <button className="back-button" onClick={onBack}>→ חזרה לרשימה</button>
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
    </div>
  );
}

export default CheckoutScreen;
