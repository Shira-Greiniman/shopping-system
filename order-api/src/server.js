import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@elastic/elasticsearch";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const elasticsearchUrl = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const catalogApiUrl = process.env.CATALOG_API_URL ?? "http://localhost:5081";
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

const elasticsearch = new Client({ node: elasticsearchUrl });
const mappingPath = new URL("../elasticsearch/orders.mapping.json", import.meta.url);
const mappings = JSON.parse(await readFile(fileURLToPath(mappingPath), "utf8"));

async function initializeElasticsearch() {
  const maxAttempts = 12;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await elasticsearch.ping();
      const exists = await elasticsearch.indices.exists({ index: "orders" });
      if (!exists) {
        await elasticsearch.indices.create({ index: "orders", mappings });
      }
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Could not initialize Elasticsearch: ${error.message}`, { cause: error });
      }
      console.warn(`Elasticsearch initialization attempt ${attempt} failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

await initializeElasticsearch();
const app = createApp({ elasticsearch, catalogApiUrl });
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Order API listening on port ${port}`);
});

function shutdown() {
  server.close(async error => {
    if (error) {
      console.error("Order API shutdown failed:", error.message);
      process.exitCode = 1;
    }
    await elasticsearch.close();
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
