using Catalog.Api.Data;
using Catalog.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Catalog");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:Catalog must be configured.");
}

builder.Services.AddDbContext<CatalogDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.MapGet("/api/categories", async (CatalogDbContext db, CancellationToken cancellationToken) =>
{
    var categories = await db.Categories
        .AsNoTracking()
        .OrderBy(category => category.Name)
        .Select(category => new CategoryDto(
            category.Id,
            category.Name,
            category.Products
                .OrderBy(product => product.Name)
                .Select(product => new ProductDto(product.Id, product.Name, product.Price, category.Name))
                .ToList()))
        .ToListAsync(cancellationToken);

    return Results.Ok(categories);
});

app.MapGet("/api/products", async (
    string? ids,
    CatalogDbContext db,
    CancellationToken cancellationToken) =>
{
    var query = db.Products.AsNoTracking().Include(product => product.Category).AsQueryable();
    if (!string.IsNullOrWhiteSpace(ids))
    {
        var parsedIds = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => int.TryParse(value, out var id) ? id : (int?)null)
            .ToArray();
        if (parsedIds.Length == 0 || parsedIds.Any(id => id is null) || parsedIds.Length > 100)
        {
            return Results.BadRequest(new { error = "Provide between 1 and 100 valid product IDs." });
        }

        var requestedIds = parsedIds.Select(id => id!.Value).Distinct().ToArray();
        query = query.Where(product => requestedIds.Contains(product.Id));
    }

    var products = await query
        .OrderBy(product => product.Name)
        .Select(product => new ProductDto(product.Id, product.Name, product.Price, product.Category.Name))
        .ToListAsync(cancellationToken);

    return Results.Ok(products);
});

await InitializeDatabaseAsync(app);
app.Run();

static async Task InitializeDatabaseAsync(WebApplication app)
{
    const int maxAttempts = 12;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            await db.Database.EnsureCreatedAsync();
            await SeedAsync(db);
            return;
        }
        catch (Exception exception) when (attempt < maxAttempts)
        {
            app.Logger.LogWarning(exception, "Database initialization attempt {Attempt} failed.", attempt);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }

    throw new InvalidOperationException("Could not initialize the catalog database after multiple attempts.");
}

static async Task SeedAsync(CatalogDbContext db)
{
    if (await db.Categories.AnyAsync())
    {
        return;
    }

    var categories = new[]
    {
        new Category { Name = "פירות וירקות" },
        new Category { Name = "מוצרי חלב וביצים" },
        new Category { Name = "מאפייה" },
        new Category { Name = "מזווה" }
    };

    var products = new[]
    {
        new Product { Category = categories[0], Name = "עגבניות", Price = 8.90m },
        new Product { Category = categories[0], Name = "מלפפונים", Price = 7.90m },
        new Product { Category = categories[0], Name = "תפוחים", Price = 12.90m },
        new Product { Category = categories[1], Name = "חלב 3%", Price = 6.90m },
        new Product { Category = categories[1], Name = "ביצים L (תריסר)", Price = 14.90m },
        new Product { Category = categories[1], Name = "גבינה לבנה", Price = 8.50m },
        new Product { Category = categories[2], Name = "לחם מחמצת", Price = 18.00m },
        new Product { Category = categories[2], Name = "לחמניות (6 יח׳)", Price = 12.00m },
        new Product { Category = categories[3], Name = "שמן זית", Price = 32.90m },
        new Product { Category = categories[3], Name = "פסטה", Price = 7.50m }
    };

    db.Categories.AddRange(categories);
    db.Products.AddRange(products);
    await db.SaveChangesAsync();
}

record CategoryDto(int Id, string Name, List<ProductDto> Products);
record ProductDto(int Id, string Name, decimal Price, string CategoryName);
