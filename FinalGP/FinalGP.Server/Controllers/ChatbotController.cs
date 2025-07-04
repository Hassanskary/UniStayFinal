using FinalGP.Server.Models;
using FinalGP.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace FinalGP.Server.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public class ChatbotController : ControllerBase
	{
		private readonly IHttpClientFactory _httpClientFactory;
		private readonly IChatbotService _chatbotService;

		public ChatbotController(IHttpClientFactory httpClientFactory, IChatbotService chatbotService)
		{
			_httpClientFactory = httpClientFactory;
			_chatbotService = chatbotService;
		}

		[HttpPost]
		public async Task<IActionResult> Post([FromBody] ChatRequest request)
		{
			try
			{
				// معالجة الرسالة بالذكاء الاصطناعي المحلي أولاً
				var localResponse = await _chatbotService.ProcessMessageAsync(request.Message);

				// إذا كانت الاستجابة المحلية مفيدة، أرسلها مباشرة
				if (IsLocalResponseSufficient(localResponse))
				{
					return Ok(new
					{
						id = Guid.NewGuid().ToString(),
						@object = "chat.completion",
						created = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
						model = "local-chatbot",
						choices = new[]
						{
							new
							{
								index = 0,
								message = new
								{
									role = "assistant",
									content = localResponse
								},
								finish_reason = "stop"
							}
						}
					});
				}

				// إذا لم تكن الاستجابة المحلية كافية، استخدم الذكاء الاصطناعي الخارجي
				return await GetAIResponse(request, localResponse);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { error = "حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى." });
			}
		}

		private bool IsLocalResponseSufficient(string response)
		{
			// إذا كانت الاستجابة تحتوي على معلومات محددة عن السكن أو المرافق أو إجابات عامة
			return response.Contains("وجدت") ||
				   response.Contains("المرافق المتاحة") ||
				   response.Contains("أهلاً وسهلاً") ||
				   response.Contains("لمساعدتك في إيجاد السكن") ||
				   response.Contains("تقع في") ||
				   response.Contains("يمكنني مساعدتك")||
                   !string.IsNullOrEmpty(response);
		}

		private async Task<IActionResult> GetAIResponse(ChatRequest request, string localContext = null)
		{
			var client = _httpClientFactory.CreateClient();
			client.DefaultRequestHeaders.Add("Authorization", "Bearer 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");

			// إنشاء رسالة محسنة للذكاء الاصطناعي
			var enhancedMessage = CreateEnhancedMessage(request.Message, localContext);

			var payload = new
			{
				messages = new[]
				{
					new {
						role = "system",
						content = "أنت مساعد ذكي ودود مصري الجنسية، تجيب باللغة العربية بطريقة طبيعية ومفيدة. لست مقيداً بموضوع السكن فقط، يمكنك الإجابة على أي سؤال بطريقة مناسبة وودودة."
                    },
					new { role = "user", content = enhancedMessage }
				},
				model = "deepseek/deepseek-v3-0324",
				stream = false
			};

			var jsonPayload = JsonSerializer.Serialize(payload);
			var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

			var response = await client.PostAsync("https://router.huggingface.co/novita/v3/openai/chat/completions", content);

			if (!response.IsSuccessStatusCode)
			{
				var error = await response.Content.ReadAsStringAsync();
				return StatusCode((int)response.StatusCode, error);
			}

			var responseBody = await response.Content.ReadAsStringAsync();
			return Ok(JsonDocument.Parse(responseBody));
		}

		private string CreateEnhancedMessage(string originalMessage, string localContext)
		{
			if (string.IsNullOrEmpty(localContext))
			{
				return originalMessage;
			}

			return $"المستخدم يسأل: {originalMessage}\n\nمعلومات إضافية من قاعدة البيانات: {localContext}\n\nيرجى تقديم رد مفيد ومناسب.";
		}

		[HttpGet("facilities")]
		public async Task<IActionResult> GetFacilities()
		{
			try
			{
				var facilities = await _chatbotService.GetAllFacilitiesAsync();
				return Ok(facilities);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { error = "حدث خطأ في جلب المرافق." });
			}
		}

		[HttpPost("search")]
		public async Task<IActionResult> SearchHomes([FromBody] ChatbotSearchRequest request)
		{
			try
			{
				var criteria = new ChatbotSearchCriteria
				{
					Gender = request.Gender,
					City = request.City,
					MaxPrice = request.MaxPrice,
					MinPrice = request.MinPrice,
					HomeType = request.HomeType,
					RequiredFacilities = request.RequiredFacilities,
					MinRating = request.MinRating,
					MaxDistanceFromUniversity = request.MaxDistanceFromUniversity,
					MinRooms = request.MinRooms,
					MaxRooms = request.MaxRooms,
					MaxFloor = request.MaxFloor
				};

				var homes = await _chatbotService.SearchHomesAsync(criteria);
				return Ok(homes);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { error = "حدث خطأ في البحث." });
			}
		}
	}

	public class ChatbotSearchRequest
	{
		public Gender? Gender { get; set; }
		public City? City { get; set; }
		public decimal? MaxPrice { get; set; }
		public decimal? MinPrice { get; set; }
		public HomeType? HomeType { get; set; }
		public List<string>? RequiredFacilities { get; set; }
		public double? MinRating { get; set; }
		public double? MaxDistanceFromUniversity { get; set; }
		public int? MinRooms { get; set; }
		public int? MaxRooms { get; set; }
		public int? MaxFloor { get; set; }
	}
}

