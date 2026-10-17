const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 100;

function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function validateOrderInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "פרטי ההזמנה אינם תקינים." };
  }

  const { firstName, lastName, address, email, items } = body;
  if (!isNonEmptyString(firstName, 80) ||
      !isNonEmptyString(lastName, 80) ||
      !isNonEmptyString(address, 300) ||
      !isNonEmptyString(email, 254) ||
      !EMAIL_PATTERN.test(email.trim())) {
    return { error: "יש למלא שם, כתובת מלאה וכתובת דוא״ל תקינה." };
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return { error: `ההזמנה חייבת לכלול בין 1 ל-${MAX_ITEMS} מוצרים.` };
  }

  const seenProductIds = new Set();
  const normalizedItems = [];
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.productId) || item.productId <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
        seenProductIds.has(item.productId)) {
      return { error: "רשימת המוצרים או הכמויות אינה תקינה." };
    }

    seenProductIds.add(item.productId);
    normalizedItems.push({ productId: item.productId, quantity: item.quantity });
  }

  return {
    value: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: address.trim(),
      email: email.trim().toLowerCase(),
      items: normalizedItems
    }
  };
}

export function buildOrderDocument(input, catalogProducts, orderId, createdAt) {
  const productsById = new Map(catalogProducts.map(product => [product.id, product]));
  if (productsById.size !== input.items.length) {
    throw new Error("One or more selected products are no longer available.");
  }

  const items = input.items.map(item => {
    const product = productsById.get(item.productId);
    if (!product || !Number.isFinite(product.price) || product.price < 0) {
      throw new Error("One or more selected products are no longer available.");
    }

    const unitPrice = Number(product.price.toFixed(2));
    return {
      productId: product.id,
      name: product.name,
      categoryName: product.categoryName,
      quantity: item.quantity,
      unitPrice,
      lineTotal: Number((unitPrice * item.quantity).toFixed(2))
    };
  });

  const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const fullName = `${input.firstName} ${input.lastName}`;

  return {
    orderId,
    createdAt,
    customer: {
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      address: input.address,
      email: input.email
    },
    items,
    total
  };
}
