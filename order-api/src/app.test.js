import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "./app.js";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

const validOrder = {
  firstName: "דנה",
  lastName: "כהן",
  address: "רחוב הרצל 1, תל אביב",
  email: "dana@example.com",
  items: [{ productId: 3, quantity: 2 }]
};

test("persists an order with catalog prices, not client-supplied prices", async () => {
  let saved;
  const app = createApp({
    elasticsearch: { ping: async () => {}, index: async document => { saved = document.document; } },
    catalogApiUrl: "http://catalog.test",
    fetchImpl: async url => {
      assert.match(url, /api\/products\?ids=3$/);
      return new Response(JSON.stringify([
        { id: 3, name: "תפוחים", categoryName: "פירות וירקות", price: 12.9 }
      ]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validOrder, price: 0.01 })
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.total, 25.8);
    assert.equal(saved.total, 25.8);
    assert.equal(saved.items[0].unitPrice, 12.9);
  });
});

test("rejects invalid orders without contacting dependencies", async () => {
  let dependencyCalled = false;
  const app = createApp({
    elasticsearch: { ping: async () => {}, index: async () => { dependencyCalled = true; } },
    catalogApiUrl: "http://catalog.test",
    fetchImpl: async () => { dependencyCalled = true; throw new Error("unexpected catalog request"); }
  });

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validOrder, email: "not-an-email" })
    });
    assert.equal(response.status, 400);
    assert.equal(dependencyCalled, false);
  });
});
