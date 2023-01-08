using CsvHelper;
using CsvHelper.Configuration;
using HtmlAgilityPack;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;

internal partial class Program
{
    static async Task Main()
    {
        const string typePageUrl = "https://www.arukereso.hu/videokartya-c3142/";
        using var client = new HttpClient();

        var (typesPageContent, typesPageTime) = await Time(getPage(typePageUrl));
        List<Type> types = extractTypes(typesPageContent);
        Console.WriteLine($"Types: \n{string.Join("    \n", types.Select(type => type.Name))}");
        Console.WriteLine($"Fetched types in {typesPageTime}");
        Console.WriteLine();

        var cheapests = new ConcurrentBag<Article>();
        var requestsTime = await Time(Parallel.ForEachAsync(types, async (type, cancellationToken) =>
        {
            Console.WriteLine($"Fetching  {type.Name}...");
            var (pageContent, time) = await Time(getPage(type.Url + "?orderby=1"));
            Console.WriteLine($"Completed {type.Name} in {time}");
            var cheapest = extractCheapest(pageContent);
            cheapest.Type = type.Name;
            cheapests.Add(cheapest);
        }));
        Console.WriteLine($"Took: {requestsTime}");
        Console.WriteLine();
        Console.WriteLine($"Result: {String.Join("\n", cheapests.Select(art => $"{art.Type}:\t{art.Price}"))}");

        writeArticlesToCsv(cheapests.ToList());

        Task<string> getPage(string url)
        {
            return client.GetStringAsync(url);
        }
    }

    private static void writeArticlesToCsv(List<Article> articles)
    {
        var now = DateTime.Now;
        var filename = $"prices-{now:yyyy-MM-dd HH_mm}.csv";
        using var writer = new StreamWriter("./" + filename);
        var conf = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            ShouldQuote = _ => true
        };
        using var csv = new CsvWriter(writer, conf);
        csv.WriteRecords(articles);
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
        return new Article { Price = value, Name = name, Url = url };
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
            return new Type { Name = name, Url = url };
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

record struct Article(string Name, string Url, int Price, string Type);
record struct Type(string Name, string Url);
