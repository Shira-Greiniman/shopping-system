# Shopping Cart - Home Assignment

A complete Hebrew, right-to-left shopping application:

- **Web:** React and Redux Toolkit; category-based catalog with locally served product photos, shopping cart, checkout summary, and customer form.
- **Catalog API:** .NET 10 Minimal API, Entity Framework Core, and SQL Server.
- **Order API:** Node.js, Express, and Elasticsearch. Before saving an order, the service verifies product availability and prices against the Catalog API.
- **Infrastructure:** Docker Compose, an explicit Elasticsearch mapping, and persistent data volumes.

## Requirements

- Docker Desktop with Docker Compose for the recommended run mode.
- .NET 10 SDK and Node.js 20 or later only if using the local development mode.

## Start the full application with Docker

Run these commands in PowerShell from the project root:

1. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Open `.env` and set `MSSQL_SA_PASSWORD` to a strong local development password. SQL Server requires at least eight characters, including uppercase and lowercase letters, a number, and a symbol. Use the same password if you later run the services locally.

3. Build and start all services:

   ```powershell
   docker compose up --build
   ```

   The first build downloads the service images and dependencies and may take several minutes. Keep this PowerShell window open.

4. Open [http://localhost:8080](http://localhost:8080). The application is ready when the shopping page appears and its categories and products have loaded. On first startup, SQL Server and Elasticsearch may need a minute or two to become ready. The sample catalog is created automatically.

## Verify that the application is running

Open a second PowerShell window in the project root while `docker compose up --build` is still running.

1. Check that all five services are running:

   ```powershell
   docker compose ps
   ```

   `web`, `catalog-api`, `order-api`, `sqlserver`, and `elasticsearch` should show as running. SQL Server and Elasticsearch should eventually show as healthy.

2. Check the Catalog API through the web proxy:

   ```powershell
   Invoke-RestMethod http://localhost:8080/catalog-api/health
   Invoke-RestMethod http://localhost:8080/catalog-api/api/categories
   ```

   The first command should return `status: healthy`. The second should return categories, each containing a list of products.

3. Check the Order API:

   ```powershell
   Invoke-RestMethod http://localhost:8080/orders-api/health
   ```

   It should return `status: healthy`. This check also confirms that the Order API can reach Elasticsearch.

4. Check Elasticsearch:

   ```powershell
   Invoke-RestMethod http://localhost:9200/_cluster/health
   ```

   The response should include a cluster status of `yellow` or `green`.

5. Verify the complete shopping flow in the browser:

   - Choose a category and add one or more products. Try increasing and decreasing quantities and removing an item.
   - Select **Continue to checkout** (shown in Hebrew in the interface).
   - Enter a first name, last name, full address, and valid email address. Confirm that the order summary lists the products and quantities you selected.
   - Select **Confirm order**. A successful submission displays a confirmation and an order ID. The cart is cleared after the order is saved.

6. Confirm that the order was saved in Elasticsearch:

   ```powershell
   Invoke-RestMethod "http://localhost:9200/orders/_count"
   ```

   The `count` value should be at least `1` after a successful order.

If a health check fails, inspect the service logs:

```powershell
docker compose logs --tail 100 catalog-api order-api sqlserver elasticsearch web
```

## Stop the application

In the PowerShell window running `docker compose up --build`, press **Ctrl+C**, then run:

```powershell
docker compose down
```

This stops the containers but keeps the SQL Server and Elasticsearch data volumes. To remove those local development databases as well, explicitly remove the Compose volumes:

```powershell
docker compose down --volumes
```

This permanently deletes the local database data.

## Local development mode

Use this mode when you want to run the application services directly on your machine instead of building all services in Docker. Docker is still used to run SQL Server and Elasticsearch.

1. Follow steps 1 and 2 in **Start the full application with Docker** to create `.env` and set the SQL Server password. Start only the databases:

   ```powershell
   docker compose up -d sqlserver elasticsearch
   ```

   Wait until these checks succeed:

   ```powershell
   Invoke-RestMethod http://localhost:9200/_cluster/health
   docker compose ps
   ```

   Make sure ports `1433` and `9200` are available.

2. In a first PowerShell window, from the project root, set the SQL Server password to the exact value in `.env`, then start the Catalog API:

   ```powershell
   $env:ASPNETCORE_URLS = "http://localhost:5081"
   $env:ConnectionStrings__Catalog = "Server=localhost,1433;Database=ShoppingCatalog;User Id=sa;Password=ChangeThis!Password2026;Encrypt=True;TrustServerCertificate=True"
   dotnet run --project .\catalog-api\Catalog.Api.csproj
   ```

   Replace `ChangeThis!Password2026` with the password you set in `.env`. Keep this window open.

3. In a second PowerShell window, start the Order API:

   ```powershell
   Set-Location .\order-api
   npm install
   $env:ELASTICSEARCH_URL = "http://localhost:9200"
   $env:CATALOG_API_URL = "http://localhost:5081"
   $env:PORT = "5082"
   npm run dev
   ```

   Keep this window open.

4. In a third PowerShell window, start the web application:

   ```powershell
   Set-Location .\web
   npm install
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173). Vite forwards API requests to the local services.

6. In another PowerShell window, verify the APIs directly:

   ```powershell
   Invoke-RestMethod http://localhost:5081/health
   Invoke-RestMethod http://localhost:5081/api/categories
   Invoke-RestMethod http://localhost:5082/health
   ```

   The health checks should return `status: healthy`. Complete the browser shopping flow described above to verify order submission.

## API

| Service | Endpoint | Description |
|---|---|---|
| Catalog | `GET /api/categories` | Categories and their products for the initial page load |
| Catalog | `GET /api/products?ids=1,2` | Current product details and prices for order validation |
| Order | `POST /api/orders` | Validate and save an order in Elasticsearch |
| Both APIs | `GET /health` | Service health check |

`POST /api/orders` accepts a first name, last name, address, email, and an array of `{ productId, quantity }` items. The Order API does not trust prices supplied by the browser: it fetches current product prices from the Catalog API and saves the validated prices with the order.

## Elasticsearch mapping

The mapping is in [order-api/elasticsearch/orders.mapping.json](./order-api/elasticsearch/orders.mapping.json). The Order API creates the `orders` index at startup with `dynamic: strict` and a `nested` `items` field.

## Tests

Run the Order API tests:

```powershell
Set-Location .\order-api
npm install
npm test
```

Create a production build of the web application:

```powershell
Set-Location .\web
npm install
npm run build
```

Build the Catalog API with the .NET 10 SDK:

```powershell
dotnet build .\catalog-api\Catalog.Api.csproj
```

## Notes

- The Docker build uses the official .NET 10 image for the Catalog API. The .NET 10 SDK is also required for local development.
- `EnsureCreated` is suitable for quickly setting up this assignment. A production system should use EF Core migrations and a managed deployment process.
- The `.env` password is for local development only. Do not use it in production or commit `.env` to Git.
- Product photos are stored in `web/public/images` and served by the application, so the catalog does not depend on an external image service at runtime. The photos were sourced from [Unsplash](https://unsplash.com/license).
