using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using static gpuScraper.Utility;

namespace gpuScraper;

internal partial class App
{
    private static async Task Main() => await new App().Run();

    private const string TypePageUrl = "https://www.arukereso.hu/videokartya-c3142/";

    private readonly ScraperContext _db = new();
    private readonly HttpClient _client = new();

    public async Task Run()
    {
        await InsertArticlesToDb(await GetCheapestArticlesOfTypes(await FetchAndExtractTypes()));
    }

    private async Task InsertArticlesToDb(ConcurrentBag<Article> cheapests)
    {
        // Note: This sample requires the database to be created before running.
        Console.WriteLine($"Database path: {ScraperContext.DbPath}");

        Console.WriteLine("Inserting articles");
        await _db.Articles.AddRangeAsync(cheapests.ToList());
        await _db.SaveChangesAsync();
    }

    private async Task<ConcurrentBag<Article>> GetCheapestArticlesOfTypes(List<Type> types)
    {
        var parallelOptions = new ParallelOptions();
        var cheapests = new ConcurrentBag<Article>();
        var requestsTime = await Time(Parallel.ForEachAsync(types, parallelOptions, async (type, _) =>
        {
            var cheapest = await GetCheapestArticleOfType(type);
            if (cheapest != null)
                cheapests.Add(cheapest);
        }));
        Console.WriteLine($"Took: {requestsTime}");
        Console.WriteLine();
        Console.WriteLine($"Result:\n{string.Join("\n", cheapests.Select(art => $"{art.Type}:\t{art.Price}"))}");
        Console.WriteLine();
        return cheapests;
    }

    private async Task<Article?> GetCheapestArticleOfType(Type type)
    {
        Console.WriteLine($"Fetching  {type.Name}...");
        var (pageContent, time) = await Time(GetPage(type.Url + "?orderby=1"));
        Console.WriteLine($"Completed {type.Name} in {time}");
        var cheapest = ExtractCheapest(pageContent);
        if (cheapest == null) return null;
        cheapest.Type = type.Name;
        if (cheapest.Name == null)
            cheapest.Name = type.Name;
        return cheapest;
    }

    private async Task<List<Type>> FetchAndExtractTypes()
    {
        var (typesPageContent, typesPageTime) = await Time(GetPage(TypePageUrl));
        var types = ExtractTypes(typesPageContent).ToList();
        Console.WriteLine($"Types:\n{string.Join("\n", types.Select(type => type.Name))}");
        Console.WriteLine($"Fetched types in {typesPageTime}");
        Console.WriteLine();
        return types;
    }

    private Task<string> GetPage(string url) => _client.GetStringAsync(url);

    private static Article? ExtractCheapest(string pageContent)
    {
        try
        {
            HtmlDocument doc = new();
            doc.LoadHtml(pageContent);
            var articleNode = doc.DocumentNode.SelectSingleNode(@"//div[@class=""price""]/../..");
            var valueNode = articleNode.SelectSingleNode(@".//div[@class=""price""]");
            var valueStr = MatchNonNumber().Replace(valueNode.InnerText.Replace(" ", ""), "");
            var value = int.Parse(valueStr);
            var nameNode = articleNode.SelectSingleNode(@"div[contains(@class, 'name')]//a");
            var name = nameNode.InnerText;
            var url = nameNode.GetAttributeValue("href", "");
            return new Article() { Name = name, Url = url, Price = value };
        }
        catch (Exception _)
        {
            return null;
        }
    }

    private static List<Type> ExtractTypes(string typesPageContent)
    {
        const int typeCategoryIndex = 6;
        HtmlDocument doc = new();
        doc.LoadHtml(typesPageContent);
        var nodes = doc.DocumentNode.SelectNodes(@$"//div[contains(@class, 'property-box')][{typeCategoryIndex}]//li/@data-akvalue");
        return nodes.Select(node =>
        {
            var name = node.GetAttributeValue(@"data-akvalue", null);
            var url = node.SelectSingleNode(@".//a/@href").GetAttributeValue("href", null);
            return new Type(name, url);
        }).ToList();
    }

    [GeneratedRegex("[^0-9]*")]
    private static partial Regex MatchNonNumber();
}

public static class Utility
{
    public static async Task<(T result, TimeSpan time)> Time<T>(Task<T> task)
    {
        var stopwatch = Stopwatch.StartNew();
        return (await task, stopwatch.Elapsed);
    }

    public static async Task<TimeSpan> Time(Task task)
    {
        var stopwatch = Stopwatch.StartNew();
        await task;
        return stopwatch.Elapsed;
    }
}

public class Article
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }
    public string Type { get; set; }
    public int Price { get; set; }
    public DateTime InsertTime { get; set; } = DateTime.Now;

    public override string ToString() => $"{nameof(Id)}: {Id}, {nameof(Name)}: {Name}, {nameof(Url)}: {Url}, {nameof(Type)}: {Type}, {nameof(Price)}: {Price}, {nameof(InsertTime)}: {InsertTime}";
}

public class GpuModel
{
    [Key]
    public string Type { get; set; }
    public string Name { get; set; }
}

public class Benchmark
{
    public string Id { get; set; }
    public GpuModel Model { get; set; }
    public string Type { get; set; }
    public int Value { get; set; }
}

public record Type(string Name, string Url);
