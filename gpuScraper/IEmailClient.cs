using Microsoft.Extensions.Configuration;

namespace gpuScraper
{
    public interface IEmailClient
    {
        public Task SendEmail(string address, Email email);
    }

    public class MailgunEmailClient : IEmailClient
    {
        private readonly HttpClient _client;
        private readonly MailgunConfiguration _config;

        public MailgunEmailClient(IConfiguration configuration)
        {
            _config = new MailgunConfiguration();
            configuration.GetSection("mailgun").Bind(_config);
            _client = new();
        }

        public async Task SendEmail(string address, Email email)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, _config.BaseUrl)
            {
                Content = new FormUrlEncodedContent(new List<KeyValuePair<string, string>>()
                {
                    new("from", _config.From),
                    new("to", address),
                    new("subject", email.Subject),
                    new("html", email.Body)
                })
            };
            var authenticationString = $"{_config.User}:{_config.Secret}";
            var base64EncodedAuthenticationString = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(authenticationString));
            request.Headers.Add("Authorization", "Basic " + base64EncodedAuthenticationString);
            var res = await _client.SendAsync(request);
            Console.WriteLine(res.StatusCode);
        }
    }

    public class NoopEmailClient : IEmailClient
    {
        public async Task SendEmail(string address, Email email) => Console.WriteLine($"Received request to send email to {address[..3]} of length {email.Body.Length} {email}");
    }

    public record struct Email(string Subject, string Body);

    internal class MailgunConfiguration
    {
        [ConfigurationKeyName("user")] public string User { get; set; }
        [ConfigurationKeyName("secret")] public string Secret { get; set; }
        [ConfigurationKeyName("base-url")] public Uri BaseUrl { get; set; }
        [ConfigurationKeyName("from")] public string From { get; set; }
    }
}
