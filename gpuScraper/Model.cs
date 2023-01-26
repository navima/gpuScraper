using Microsoft.EntityFrameworkCore;

namespace gpuScraper;

public class ScraperContext : DbContext
{
    public DbSet<Article> Articles { get; set; }
    public DbSet<GpuModel> Models { get; set; }
    public DbSet<Benchmark> Benchmarks { get; set; }

    public static string DbPath => "archive.db";

    protected override void OnConfiguring(DbContextOptionsBuilder options) => options.UseSqlite($"Data Source={DbPath}");
}
