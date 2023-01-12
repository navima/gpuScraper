namespace gpuScraper;

public static class Extensions
{
    public static IEnumerable<T> NotNull<T>(this IEnumerable<T> source)
    {
        return source.Where(element => element != null);
    }
}
