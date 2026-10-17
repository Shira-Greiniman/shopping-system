import express from "express";
import { randomUUID } from "node:crypto";
import { buildOrderDocument, validateOrderInput } from "./validation.js";

export function createApp({ elasticsearch, catalogApiUrl, fetchImpl = fetch }) {
  const app = express();
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", async (_request, response) => {
    try {
      await elasticsearch.ping();
      response.json({ status: "healthy" });
    } catch (error) {
      console.error("Health check failed:", error.message);
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.post("/api/orders", async (request, response) => {
    const validation = validateOrderInput(request.body);
    if (validation.error) {
      return response.status(400).json({ error: validation.error });
    }

    try {
      const ids = validation.value.items.map(item => item.productId).join(",");
      const catalogResponse = await fetchImpl(
        `${catalogApiUrl}/api/products?ids=${encodeURIComponent(ids)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!catalogResponse.ok) {
        console.error("Catalog API rejected order validation:", catalogResponse.status);
        return response.status(502).json({ error: "לא ניתן לאמת את המוצרים כרגע. נסו שוב." });
      }

      const catalogProducts = await catalogResponse.json();
      let order;
      try {
        order = buildOrderDocument(validation.value, catalogProducts, randomUUID(), new Date().toISOString());
      } catch {
        return response.status(400).json({ error: "אחד מהמוצרים שנבחרו אינו זמין. רעננו את הרשימה ונסו שוב." });
      }

      await elasticsearch.index({
        index: "orders",
        id: order.orderId,
        document: order,
        refresh: "wait_for"
      });
      return response.status(201).json({
        orderId: order.orderId,
        createdAt: order.createdAt,
        total: order.total
      });
    } catch (error) {
      console.error("Order submission failed:", error.message);
      return response.status(503).json({ error: "לא ניתן לשמור את ההזמנה כרגע. נסו שוב." });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      return response.status(400).json({ error: "בקשת ההזמנה אינה תקינה." });
    }
    console.error("Unhandled request error:", error.message);
    return response.status(500).json({ error: "אירעה שגיאה לא צפויה." });
  });

  return app;
}
