import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CatalogScreen from "./CatalogScreen";
import CheckoutScreen from "./CheckoutScreen";
import { clearCart } from "./store";

function App() {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const [screen, setScreen] = useState("catalog");
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

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

      <CatalogScreen
        isActive={screen === "catalog"}
        cartItems={cartItems}
        itemCount={itemCount}
        total={total}
        onCheckout={() => setScreen("checkout")}
      />
      <CheckoutScreen
        isActive={screen === "checkout"}
        cartItems={cartItems}
        itemCount={itemCount}
        total={total}
        onBack={() => setScreen("catalog")}
        onOrderSuccess={() => dispatch(clearCart())}
        onNewOrder={() => setScreen("catalog")}
      />

      <footer>קניות קטנות, יום קצת יותר טוב <span>✳</span></footer>
    </main>
  );
}

export default App;
