using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace gpuScraper
{
    struct WatchEntry
    {
        [JsonPropertyName("address")] public string Address { get; set; }
        [JsonPropertyName("enabled")] public bool Enabled { get; set; }
        [JsonPropertyName("watchlist")] public List<Watch> Watchlist { get; set; }
    }

    struct Watch
    {
        [JsonPropertyName("product")] public string Product { get; set; }
        [JsonPropertyName("price")] public int Price { get; set; }
    }
}
