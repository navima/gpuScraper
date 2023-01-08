using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.RegularExpressions;

internal partial class Program
{
    private static async Task Main()
    {
        const string typePageUrl = "https://www.arukereso.hu/videokartya-c3142/";
        using var client = new HttpClient();

        var (typesPageContent, typesPageTime) = await Time(GetPage(typePageUrl, client));
        var types = extractTypes(typesPageContent).ToList();
        Console.WriteLine($"Types:\n{string.Join("\n", types.Select(type => type.Name))}");
        Console.WriteLine($"Fetched types in {typesPageTime}");
        Console.WriteLine();

        var cheapests = new ConcurrentBag<Article>();
        var requestsTime = await Time(Parallel.ForEachAsync(types, async (type, _) =>
        {
            Console.WriteLine($"Fetching  {type.Name}...");
            var (pageContent, time) = await Time(GetPage(type.Url + "?orderby=1", client));
            Console.WriteLine($"Completed {type.Name} in {time}");
            var cheapest = extractCheapest(pageContent);
            cheapest.Type = type.Name;
            cheapests.Add(cheapest);
        }));
        Console.WriteLine($"Took: {requestsTime}");
        Console.WriteLine();
        Console.WriteLine($"Result:\n{string.Join("\n", cheapests.Select(art => $"{art.Type}:\t{art.Price}"))}");
        Console.WriteLine();

        await using var db = new ScraperContext();
        // Note: This sample requires the database to be created before running.
        Console.WriteLine($"Database path: {db.DbPath}");

        Console.WriteLine("Inserting articles");
        await db.Articles.AddRangeAsync(cheapests.ToList());
        db.SaveChanges();

        Console.WriteLine("Querying for articles");
        var articles = db.Articles
            .OrderByDescending(a => a.InsertTime);

        await articles.ForEachAsync(Console.WriteLine);
    }

    private static Task<string> GetPage(string url, HttpClient client)
    {
        return client.GetStringAsync(url);
    }
    
    static Article extractCheapest(string pageContent)
    {
        HtmlDocument doc = new();
        doc.LoadHtml(pageContent);
        var articleNode = doc.DocumentNode.SelectSingleNode(@"//div[@class=""price""]/../..");
        var valueStr = MatchNonNumber().Replace(articleNode.SelectSingleNode(@".//div[@class=""price""]").InnerText.Replace(" ", ""), "");
        var value = int.Parse(valueStr);
        var nameNode = articleNode.SelectSingleNode(@"div[contains(@class, 'name')]//a");
        var name = nameNode.InnerText;
        var url = nameNode.GetAttributeValue("href", "");
        return new Article() { Name = name, Url = url, Price = value };
    }

    static List<Type> extractTypes(string typesPageContent)
    {
        const int typeCategoryIndex = 6;
        HtmlDocument doc = new();
        doc.LoadHtml(typesPageContent);
        var nodes = doc.DocumentNode.SelectNodes(@$"//div[contains(@class, 'property-box')][{typeCategoryIndex}]//li/@data-akvalue");
        return nodes.Select(node =>
        {
            var name = node.GetAttributeValue(@"data-akvalue", null);
            var url = node.SelectSingleNode(@".//a/@href").GetAttributeValue("href", null);
            return new Type() { Name = name, Url = url };
        }).ToList();
    }

    static async Task<(T result, TimeSpan time)> Time<T>(Task<T> task)
    {
        var stopwatch = Stopwatch.StartNew();
        return (await task, stopwatch.Elapsed);
    }

    static async Task<TimeSpan> Time(Task task)
    {
        var stopwatch = Stopwatch.StartNew();
        await task;
        return stopwatch.Elapsed;
    }

    [GeneratedRegex("[^0-9]*")]
    private static partial Regex MatchNonNumber();
}

public class Article
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }
    public string Type { get; set; }
    public int Price { get; set; }
    public DateTime InsertTime { get; set; } = DateTime.Now;

    public override string ToString()
    {
        return $"{nameof(Id)}: {Id}, {nameof(Name)}: {Name}, {nameof(Url)}: {Url}, {nameof(Type)}: {Type}, {nameof(Price)}: {Price}, {nameof(InsertTime)}: {InsertTime}";
    }
}

public class Type
{
    public string Name { get; set; }
    public string Url { get; set; }
}
