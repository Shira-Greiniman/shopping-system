const formatPrice = amount => new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS"
}).format(amount);

export default formatPrice;
