using System.Runtime.Serialization;

namespace gpuScraper
{
    [Serializable]
    internal class ConfigurationValueNotFoundException : Exception
    {
        public ConfigurationValueNotFoundException()
        {
        }

        public ConfigurationValueNotFoundException(string? message) : base(message)
        {
        }

        public ConfigurationValueNotFoundException(string? message, Exception? innerException) : base(message, innerException)
        {
        }

        protected ConfigurationValueNotFoundException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}