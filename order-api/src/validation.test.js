import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderDocument, validateOrderInput } from "./validation.js";

test("validates and normalizes customer and item input", () => {
  const result = validateOrderInput({
    firstName: "  דנה ",
    lastName: "כהן",
    address: "רחוב הרצל 1, תל אביב",
    email: "DANA@example.com",
    items: [{ productId: 3, quantity: 2 }]
  });

  assert.equal(result.value.firstName, "דנה");
  assert.equal(result.value.email, "dana@example.com");
});

test("rejects malformed email, duplicate products, and invalid quantities", () => {
  const base = {
    firstName: "דנה",
    lastName: "כהן",
    address: "רחוב הרצל 1",
    email: "not-an-email",
    items: [{ productId: 3, quantity: 2 }]
  };
  assert.ok(validateOrderInput(base).error);
  assert.ok(validateOrderInput({ ...base, email: "dana@example.com", items: [
    { productId: 3, quantity: 1 }, { productId: 3, quantity: 2 }
  ] }).error);
  assert.ok(validateOrderInput({ ...base, email: "dana@example.com", items: [
    { productId: 3, quantity: 0 }
  ] }).error);
});

test("calculates order totals from authoritative catalog prices", () => {
  const input = {
    firstName: "דנה",
    lastName: "כהן",
    address: "רחוב הרצל 1",
    email: "dana@example.com",
    items: [{ productId: 3, quantity: 2 }]
  };
  const order = buildOrderDocument(input, [
    { id: 3, name: "תפוחים", categoryName: "פירות וירקות", price: 12.9 }
  ], "order-1", "2026-10-17T00:00:00.000Z");

  assert.equal(order.total, 25.8);
  assert.equal(order.items[0].lineTotal, 25.8);
  assert.equal(order.customer.fullName, "דנה כהן");
});
