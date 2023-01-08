using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;

public class ScraperContext : DbContext
{
    public DbSet<Article> Articles { get; set; }

    public string DbPath { get; } = "archive.db";
    
    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite($"Data Source={DbPath}");
    }
}