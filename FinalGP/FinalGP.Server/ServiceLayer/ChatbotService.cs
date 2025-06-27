
using FinalGP.Data;
using FinalGP.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace FinalGP.Services
{
	public interface IChatbotService
	{
		Task<string> ProcessMessageAsync(string message);
		Task<List<Home>> SearchHomesAsync(ChatbotSearchCriteria criteria);
		Task<List<Facility>> GetAllFacilitiesAsync();
		ChatbotSearchCriteria ExtractCriteriaFromMessage(string message);
	}

	public class ChatbotService : IChatbotService
	{
		private readonly ESHContext _context;

		public ChatbotService(ESHContext context)
		{
			_context = context;
		}

		public async Task<string> ProcessMessageAsync(string message)
		{
			message = message.ToLower().Trim();

			// التحقق من نوع الاستفسار
			if (IsGreeting(message))
			{
				return GetRandomGreeting();
			}

			if (IsFacilityInquiry(message))
			{
				return await GetFacilitiesResponseAsync();
			}

			// التحقق من الأسئلة العامة
			if (IsGeneralQuestion(message))
			{
				return HandleGeneralQuestion(message);
			}

			// التحقق من أسئلة المساعدة
			if (IsHelpRequest(message))
			{
				return GetHelpResponse();
			}

			// التحقق من أسئلة حول الخدمة
			if (IsServiceInquiry(message))
			{
				return GetServiceInfo();
			}

			// استخراج معايير البحث من الرسالة
			var criteria = ExtractCriteriaFromMessage(message);

			if (HasSearchCriteria(criteria))
			{
				return await GetSearchResponseAsync(criteria);
			}

			// إذا لم تكن الرسالة واضحة، اطرح أسئلة توضيحية
			return GetSmartClarificationResponse(message);
		}

		public ChatbotSearchCriteria ExtractCriteriaFromMessage(string message)
		{
			var criteria = new ChatbotSearchCriteria();
			message = message.ToLower();

			// استخراج الجنس
			if (message.Contains("بنت") || message.Contains("فتاة") || message.Contains("أنثى") || message.Contains("female") || message.Contains("عايزة") || message.Contains("عايزه") || message.Contains("طالبة") || message.Contains("بنات"))
			{
				criteria.Gender = Gender.Female;
			}
			else if (message.Contains("ولد") || message.Contains("شاب") || message.Contains("ذكر") || message.Contains("male") || message.Contains("عايز") || message.Contains("طالب") || message.Contains("شاب") || message.Contains("ولاد"))
			{
				criteria.Gender = Gender.Male;
			}

			// استخراج المدينة
			criteria.City = ExtractCityFromMessage(message);

			// استخراج السعر
			criteria.MaxPrice = ExtractPriceFromMessage(message);
			criteria.MinPrice = ExtractMinPriceFromMessage(message);

			// استخراج نوع السكن
			if (message.Contains("مشترك") || message.Contains("shared"))
			{
				criteria.HomeType = HomeType.Shared;
			}
			else if (message.Contains("خاص") || message.Contains("private"))
			{
				criteria.HomeType = HomeType.Private;
			}

			// استخراج المرافق المطلوبة
			criteria.RequiredFacilities = ExtractFacilitiesFromMessage(message);

			// استخراج التقييم المطلوب
			criteria.MinRating = ExtractRatingFromMessage(message);

			// استخراج المسافة من الجامعة
			criteria.MaxDistanceFromUniversity = ExtractDistanceFromMessage(message);

			// استخراج عدد الغرف
			criteria.MinRooms = ExtractMinRoomsFromMessage(message);
			criteria.MaxRooms = ExtractMaxRoomsFromMessage(message);

			// استخراج الطابق
			criteria.MaxFloor = ExtractMaxFloorFromMessage(message);

			return criteria;
		}

		public async Task<List<Home>> SearchHomesAsync(ChatbotSearchCriteria criteria)
		{
			var query = _context.Homes
				.Include(h => h.Rooms)
				.Include(h => h.FacilityHomes)
				.ThenInclude(fh => fh.Facility)
				.Include(h => h.Ratings)
				.Where(h => h.Status == HomeApprovalStatus.Approved);

			// فلترة بناء على الجنس
			if (criteria.Gender.HasValue)
			{
				query = query.Where(h => h.Gender == criteria.Gender.Value);
			}

			// فلترة بناء على المدينة
			if (criteria.City.HasValue && criteria.City.Value != City.General)
			{
				query = query.Where(h => h.City == criteria.City.Value);
			}

			// فلترة بناء على نوع السكن
			if (criteria.HomeType.HasValue)
			{
				query = query.Where(h => h.Type == criteria.HomeType.Value);
			}

			// فلترة بناء على السعر الأقصى
			if (criteria.MaxPrice.HasValue)
			{
				query = query.Where(h => h.Rooms.Any(r => r.Price <= criteria.MaxPrice.Value));
			}

			// فلترة بناء على السعر الأدنى
			if (criteria.MinPrice.HasValue)
			{
				query = query.Where(h => h.Rooms.Any(r => r.Price >= criteria.MinPrice.Value));
			}

			// فلترة بناء على المسافة من الجامعة
			if (criteria.MaxDistanceFromUniversity.HasValue)
			{
				query = query.Where(h => h.DistanceFromUniversity <= criteria.MaxDistanceFromUniversity.Value);
			}

			// فلترة بناء على عدد الغرف
			if (criteria.MinRooms.HasValue)
			{
				query = query.Where(h => h.NumOfRooms >= criteria.MinRooms.Value);
			}

			if (criteria.MaxRooms.HasValue)
			{
				query = query.Where(h => h.NumOfRooms <= criteria.MaxRooms.Value);
			}

			// فلترة بناء على الطابق
			if (criteria.MaxFloor.HasValue)
			{
				query = query.Where(h => h.Floor <= criteria.MaxFloor.Value);
			}

			var homes = await query.ToListAsync();

			// فلترة بناء على المرافق المطلوبة - الأسلوب الأكثر قوة
			if (criteria.RequiredFacilities?.Any() == true)
			{
				homes = homes.Where(h =>
					criteria.RequiredFacilities.All(requiredFacility =>
					{
						// التحقق من وجود FacilityHomes
						if (h.FacilityHomes == null || !h.FacilityHomes.Any())
							return false;

						// البحث عن المرفق المطلوب
						return h.FacilityHomes.Any(fh =>
							fh.Facility != null &&
							!string.IsNullOrEmpty(fh.Facility.Name) &&
							fh.Facility.Name.ToLower().Contains(requiredFacility.ToLower())
						);
					})
				).ToList();
			}

			// فلترة بناء على التقييم
			if (criteria.MinRating.HasValue)
			{
				homes = homes.Where(h =>
				{
					if (h.Ratings?.Any() != true) return false;
					var avgRating = h.Ratings.Average(r => r.Score);
					return avgRating >= criteria.MinRating.Value;
				}).ToList();
			}

			return homes.Take(5).ToList(); // أول 5 نتائج
		}

		public async Task<List<Facility>> GetAllFacilitiesAsync()
		{
			return await _context.Facilities.ToListAsync();
		}

		private bool IsGreeting(string message)
		{
			var greetings = new[] { "مرحبا", "أهلا", "السلام", "hello", "hi", "hey", "صباح", "مساء" };
			return greetings.Any(g => message.Contains(g));
		}

		private bool IsFacilityInquiry(string message)
		{
			var facilityKeywords = new[] { "مرافق", "خدمات", "facilities", "amenities", "ايه المتاح", "إيه المتاح", "مميزات" };
			return facilityKeywords.Any(k => message.Contains(k));
		}

		private bool IsGeneralQuestion(string message)
		{
			var locationQuestions = new[] { "فين", "أين", "where", "موقع", "مكان" };
			var timeQuestions = new[] { "امتى", "متى", "when", "وقت" };
			var howQuestions = new[] { "ازاي", "إزاي", "كيف", "how" };

			return locationQuestions.Any(q => message.Contains(q)) ||
				   timeQuestions.Any(q => message.Contains(q)) ||
				   howQuestions.Any(q => message.Contains(q));
		}

		private bool IsHelpRequest(string message)
		{
			var helpKeywords = new[] { "مساعدة", "help", "ساعدني", "محتاج مساعدة", "مش فاهم", "مش عارف" };
			return helpKeywords.Any(k => message.Contains(k));
		}

		private bool IsServiceInquiry(string message)
		{
			var serviceKeywords = new[] { "ايه الخدمة", "إيه الخدمة", "what service", "تعملوا ايه", "تعملوا إيه" };
			return serviceKeywords.Any(k => message.Contains(k));
		}

		private string GetRandomGreeting()
		{
			var greetings = new[]
			{
				"أهلاً وسهلاً! 😊 أنا هنا لمساعدتك في العثور على السكن المثالي. كيف يمكنني مساعدتك؟",
				"مرحباً بك! 🏠 أنا مساعدك الذكي للسكن الطلابي. ما الذي تبحث عنه اليوم؟",
				"أهلاً! سعيد بوجودك هنا. دعني أساعدك في إيجاد السكن المناسب لك.",
				"مرحباً! 👋 أنا هنا لأجعل بحثك عن السكن أسهل وأسرع. كيف يمكنني خدمتك؟"
			};

			var random = new Random();
			return greetings[random.Next(greetings.Length)];
		}

		private string GetHelpResponse()
		{
			return "بالطبع! أنا هنا لمساعدتك. 😊\n\n" +
				   "يمكنني مساعدتك في:\n" +
				   "🔍 البحث عن سكن مناسب لك\n" +
				   "📋 معرفة المرافق المتاحة\n" +
				   "💰 العثور على سكن في حدود ميزانيتك\n" +
				   "📍 البحث في مدينة معينة\n" +
				   "⭐ العثور على سكن بتقييم عالي\n\n" +
				   "فقط أخبرني ما تحتاجه وسأساعدك فوراً!";
		}

		private string GetServiceInfo()
		{
			return "نحن منصة متخصصة في مساعدة الطلاب للعثور على السكن المناسب! 🎓\n\n" +
				   "خدماتنا تشمل:\n" +
				   "🏠 قاعدة بيانات شاملة للسكنات الطلابية\n" +
				   "🔍 بحث ذكي بناءً على تفضيلاتك\n" +
				   "⭐ تقييمات حقيقية من الطلاب\n" +
				   "📱 واجهة سهلة الاستخدام\n" +
				   "💬 دعم فوري عبر الشات\n\n" +
				   "هدفنا جعل رحلة البحث عن السكن سهلة وممتعة لك!";
		}

		private string HandleGeneralQuestion(string message)
		{
			// أسئلة الموقع
			if (message.Contains("مكة") && (message.Contains("فين") || message.Contains("أين")))
			{
				return "مكة المكرمة تقع في المملكة العربية السعودية، وهي المدينة المقدسة التي تضم الكعبة المشرفة والمسجد الحرام. 🕋";
			}

			if (message.Contains("القاهرة") && (message.Contains("فين") || message.Contains("أين")))
			{
				return "القاهرة هي عاصمة جمهورية مصر العربية وأكبر مدنها، وتقع على ضفاف نهر النيل في شمال مصر. 🏛️";
			}

			if (message.Contains("الإسكندرية") && (message.Contains("فين") || message.Contains("أين")))
			{
				return "الإسكندرية تقع على ساحل البحر الأبيض المتوسط في شمال مصر، وهي ثاني أكبر مدن مصر وتُعرف بعروس البحر المتوسط. 🌊";
			}

			// أسئلة الوقت
			if (message.Contains("امتى") || message.Contains("متى"))
			{
				if (message.Contains("أفضل وقت") || message.Contains("أحسن وقت"))
				{
					return "أفضل وقت للبحث عن السكن الطلابي هو قبل بداية العام الدراسي بشهرين على الأقل، عادة في يونيو ويوليو. 📅";
				}
			}

			// أسئلة الكيفية
			if (message.Contains("ازاي") || message.Contains("إزاي") || message.Contains("كيف"))
			{
				if (message.Contains("أبحث") || message.Contains("أدور"))
				{
					return "يمكنك البحث عن السكن بسهولة! فقط أخبرني بتفضيلاتك مثل:\n" +
						   "• المدينة المطلوبة\n" +
						   "• الميزانية\n" +
						   "• الجنس (ذكر/أنثى)\n" +
						   "• المرافق المطلوبة\n" +
						   "وسأعرض عليك أفضل الخيارات المتاحة! 🔍";
				}
			}

			// رد عام للأسئلة غير المحددة
			return "سؤال جيد! 🤔 يمكنني مساعدتك بشكل أفضل إذا كان سؤالك متعلقاً بالسكن الطلابي. هل تريد البحث عن سكن معين؟";
		}

		private async Task<string> GetFacilitiesResponseAsync()
		{
			var facilities = await GetAllFacilitiesAsync();
			if (!facilities.Any())
			{
				return "عذراً، لا توجد معلومات عن المرافق حالياً. 😔";
			}

			var response = "المرافق المتاحة في السكنات: ✨\n\n";
			foreach (var facility in facilities)
			{
				response += $"🔹 {TranslateFacility(facility.Name)}\n";
			}
			response += "\nيمكنك طلب أي من هذه المرافق عند البحث عن السكن!";
			return response;
		}

		private string TranslateFacility(string englishName)
		{
			var translations = new Dictionary<string, string>
			{
				{ "WiFi", "واي فاي" },
				{ "Parking", "موقف سيارات" },
				{ "Gym", "صالة رياضية" },
				{ "Swimming Pool", "مسبح" },
				{ "Laundry", "غسالة ملابس" },
				{ "Security", "أمن" },
				{ "AC", "تكييف" },
				{ "Elevator", "مصعد" },
				{ "Kitchen", "مطبخ" },
				{ "Private Bathroom", "حمام خاص" }
			};
			return translations.TryGetValue(englishName, out var arabicName) ? arabicName : englishName;
		}


		private async Task<string> GetSearchResponseAsync(ChatbotSearchCriteria criteria)
		{
			var homes = await SearchHomesAsync(criteria);

			if (!homes.Any())
			{
				return "عذراً، لم أجد سكنات تطابق معاييرك حالياً. 😔\n\n" +
					   "يمكنك:\n" +
					   "• تجربة معايير أخرى\n" +
					   "• توسيع نطاق البحث\n" +
					   "• التواصل معنا للمساعدة\n\n" +
					   "هل تريد تعديل معايير البحث؟";
			}

			var response = $"رائع! وجدت {homes.Count} سكن مناسب لك: 🎉\n\n";

			foreach (var home in homes)
			{
				var minPrice = home.Rooms?.Min(r => r.Price) ?? 0;
				var maxPrice = home.Rooms?.Max(r => r.Price) ?? 0;
				var avgRating = home.Ratings?.Any() == true ? home.Ratings.Average(r => r.Score) : 0;

				response += $"🏠 **{home.Title}**\n";
				response += $"📍 {home.City} - {home.LocationDetails}\n";
				response += $"💰 السعر: {minPrice:F0}";
				if (minPrice != maxPrice)
				{
					response += $" - {maxPrice:F0}";
				}
				response += " جنيه\n";
				response += $"🚻 {(home.Gender == Gender.Male ? "ذكور" : "إناث")}\n";
				response += $"🏢 {(home.Type == HomeType.Shared ? "مشترك" : "خاص")}\n";
				response += $"🏠 عدد الغرف: {home.NumOfRooms}\n";
				response += $"🏢 الطابق: {home.Floor}\n";
				response += $"📏 المسافة من الجامعة: {home.DistanceFromUniversity:F1} كم\n";

				if (avgRating > 0)
				{
					response += $"⭐ التقييم: {avgRating:F1}/5\n";
				}

				if (home.FacilityHomes?.Any() == true)
				{
					response += "🔧 المرافق: ";
					response += string.Join(", ", home.FacilityHomes.Select(fh => fh.Facility?.Name));
					response += "\n";
				}

				response += $"🔗 [عرض التفاصيل الكاملة](/detailsH/{home.Id})\n\n";
			}

			response += "💡 هل تريد المزيد من التفاصيل عن أي من هذه السكنات؟";
			return response;
		}

		private bool HasSearchCriteria(ChatbotSearchCriteria criteria)
		{
			return criteria.Gender.HasValue ||
				   criteria.City.HasValue ||
				   criteria.MaxPrice.HasValue ||
				   criteria.MinPrice.HasValue ||
				   criteria.HomeType.HasValue ||
				   criteria.RequiredFacilities?.Any() == true ||
				   criteria.MinRating.HasValue ||
				   criteria.MaxDistanceFromUniversity.HasValue ||
				   criteria.MinRooms.HasValue ||
				   criteria.MaxRooms.HasValue ||
				   criteria.MaxFloor.HasValue;
		}

		private string GetSmartClarificationResponse(string message)
		{
			// تحليل ذكي للرسالة لتقديم رد مناسب
			if (message.Contains("شكرا") || message.Contains("thanks"))
			{
				return "العفو! 😊 أنا سعيد لمساعدتك. هل تحتاج أي شيء آخر؟";
			}

			if (message.Contains("لا") || message.Contains("no"))
			{
				return "لا مشكلة! إذا احتجت أي مساعدة في المستقبل، أنا هنا دائماً. 😊";
			}

			if (message.Contains("نعم") || message.Contains("yes") || message.Contains("أيوة"))
			{
				return "ممتاز! كيف يمكنني مساعدتك؟ 😊";
			}

			// رد ذكي للرسائل غير الواضحة
			return "أعتذر، لم أفهم طلبك بوضوح. 🤔\n\n" +
				   "لمساعدتك بشكل أفضل، يمكنك:\n" +
				   "💬 إخباري بما تبحث عنه بوضوح\n" +
				   "🏠 طلب البحث عن سكن معين\n" +
				   "❓ سؤالي عن المرافق المتاحة\n" +
				   "📞 طلب المساعدة\n\n" +
				   "مثال: \"أبحث عن سكن للبنات في القاهرة بميزانية 2000 جنيه\"";
		}

		// باقي الدوال كما هي...
		private City? ExtractCityFromMessage(string message)
		{
			var cityMappings = new Dictionary<string, City>
	{
		{ @"\b(أس[يـ]وط|اسيوط|asyut)\b", City.Asyut },
		{ @"\b(القاهرة|القاهره|cairo)\b", City.Cairo },
		{ @"\b(الإسكندرية|اسكندرية|alexandria)\b", City.Alexandria },
		{ @"\b(الجيزة|جيزة|giza)\b", City.Giza },
		{ @"\b(أسوان|aswan)\b", City.Aswan },
		{ @"\b(بني سويف|beni suef)\b", City.BeniSuef },
		{ @"\b(الدقهلية|دقهلية|dakahlia)\b", City.Dakahlia },
		{ @"\b(دمياط|damietta)\b", City.Damietta },
		{ @"\b(الفيوم|فيوم|faiyum)\b", City.Faiyum },
		{ @"\b(الغربية|غربية|gharbia)\b", City.Gharbia },
		{ @"\b(الإسماعيلية|إسماعيلية|ismailia)\b", City.Ismailia },
		{ @"\b(كفر الشيخ|كفر الشيخ|kafr elsheikh)\b", City.KafrElSheikh },
		{ @"\b(الأقصر|اقصر|luxor)\b", City.Luxor },
		{ @"\b(مطروح|matruh)\b", City.Matruh },
		{ @"\b(المنيا|منيا|minya)\b", City.Minya },
		{ @"\b(المنوفية|منوفية|monufia)\b", City.Monufia },
		{ @"\b(الوادي الجديد|وادي جديد|new valley)\b", City.NewValley },
		{ @"\b(شمال سيناء|سيناء شمال|north sinai)\b", City.NorthSinai },
		{ @"\b(بورسعيد|بور سعيد|port said)\b", City.PortSaid },
		{ @"\b(القليوبية|قليوبية|qalyubia)\b", City.Qalyubia },
		{ @"\b(قنا|qena)\b", City.Qena },
		{ @"\b(البحر الأحمر|بحر أحمر|red sea)\b", City.RedSea },
		{ @"\b(الشرقية|شرقية|sharqia)\b", City.Sharqia },
		{ @"\b(سوهاج|sohag)\b", City.Sohag },
		{ @"\b(جنوب سيناء|سيناء جنوب|south sinai)\b", City.SouthSinai },
		{ @"\b(السويس|suez)\b", City.Suez },
		{ @"\b(البحيرة|بحيرة|beheira)\b", City.Beheira }
	};

			foreach (var mapping in cityMappings)
			{
				if (Regex.IsMatch(message, mapping.Key, RegexOptions.IgnoreCase | RegexOptions.RightToLeft))
				{
					return mapping.Value;
				}
			}

			return null;
		}

		private decimal? ExtractPriceFromMessage(string message)
		{
			// البحث عن الأرقام في الرسالة مع كلمات تدل على السعر الأقصى
			var maxPricePattern = @"(أقل من|حتى|لا يزيد عن|بحد أقصى|ميزانية)\s*(\d+)\s*(جنيه|pound|egp|le)?";
			var matches = Regex.Matches(message, maxPricePattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (decimal.TryParse(matches[0].Groups[2].Value, out decimal price))
				{
					return price;
				}
			}

			// البحث عن الأرقام العامة
			var generalPricePattern = @"(\d+)\s*(جنيه|pound|egp|le)?";
			matches = Regex.Matches(message, generalPricePattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (decimal.TryParse(matches[0].Groups[1].Value, out decimal price))
				{
					return price;
				}
			}

			return null;
		}

		private decimal? ExtractMinPriceFromMessage(string message)
		{
			var minPricePattern = @"(أكثر من|من|بداية من|لا يقل عن)\s*(\d+)\s*(جنيه|pound|egp|le)?";
			var matches = Regex.Matches(message, minPricePattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (decimal.TryParse(matches[0].Groups[2].Value, out decimal price))
				{
					return price;
				}
			}

			return null;
		}

		private List<string> ExtractFacilitiesFromMessage(string message)
		{
			var facilities = new List<string>();
			var facilityMappings = new Dictionary<string, string>
			{
				{ "واي فاي", "واي فاي" },
				{ "wifi", "واي فاي" },
				{ "انترنت", "واي فاي" },
				{ "مكيف", "مكيف" },
				{ "تكييف", "مكيف" },
				{ "ac", "مكيف" },
				{ "مصعد", "مصعد" },
				{ "elevator", "مصعد" },
				{ "موقف", "موقف سيارات" },
				{ "جراج", "موقف سيارات" },
				{ "parking", "موقف سيارات" },
				{ "أمن", "أمن" },
				{ "حارس", "أمن" },
				{ "security", "أمن" },
				{ "غسالة", "غسالة" },
				{ "washing", "غسالة" },
				{ "مطبخ", "مطبخ" },
				{ "kitchen", "مطبخ" },
				{ "حمام", "حمام خاص" },
				{ "bathroom", "حمام خاص" }
			};

			foreach (var mapping in facilityMappings)
			{
				if (message.Contains(mapping.Key))
				{
					if (!facilities.Contains(mapping.Value))
					{
						facilities.Add(mapping.Value);
					}
				}
			}

			return facilities;
		}

		private double? ExtractRatingFromMessage(string message)
		{
			var ratingPattern = @"(تقييم|rating)\s*(أكثر من|أعلى من|فوق|من)?\s*(\d+(?:\.\d+)?)\s*(نجوم?|stars?)?";
			var matches = Regex.Matches(message, ratingPattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (double.TryParse(matches[0].Groups[3].Value, out double rating))
				{
					return Math.Min(rating, 5.0); // الحد الأقصى 5 نجوم
				}
			}

			return null;
		}

		private double? ExtractDistanceFromMessage(string message)
		{
			var distancePattern = @"(مسافة|بعد|distance)\s*(أقل من|حتى|لا تزيد عن)?\s*(\d+(?:\.\d+)?)\s*(كم|km|كيلو)";
			var matches = Regex.Matches(message, distancePattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (double.TryParse(matches[0].Groups[3].Value, out double distance))
				{
					return distance;
				}
			}

			return null;
		}

		private int? ExtractMinRoomsFromMessage(string message)
		{
			var roomsPattern = @"(أكثر من|من|بداية من|لا يقل عن)\s*(\d+)\s*(غرف?|rooms?)";
			var matches = Regex.Matches(message, roomsPattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (int.TryParse(matches[0].Groups[2].Value, out int rooms))
				{
					return rooms;
				}
			}

			return null;
		}

		private int? ExtractMaxRoomsFromMessage(string message)
		{
			var roomsPattern = @"(أقل من|حتى|لا يزيد عن|بحد أقصى)\s*(\d+)\s*(غرف?|rooms?)";
			var matches = Regex.Matches(message, roomsPattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (int.TryParse(matches[0].Groups[2].Value, out int rooms))
				{
					return rooms;
				}
			}

			// البحث عن عدد الغرف العام
			var generalRoomsPattern = @"(\d+)\s*(غرف?|rooms?)";
			matches = Regex.Matches(message, generalRoomsPattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (int.TryParse(matches[0].Groups[1].Value, out int rooms))
				{
					return rooms;
				}
			}

			return null;
		}

		private int? ExtractMaxFloorFromMessage(string message)
		{
			var floorPattern = @"(طابق|floor)\s*(أقل من|حتى|لا يزيد عن)?\s*(\d+)";
			var matches = Regex.Matches(message, floorPattern, RegexOptions.IgnoreCase);

			if (matches.Count > 0)
			{
				if (int.TryParse(matches[0].Groups[3].Value, out int floor))
				{
					return floor;
				}
			}

			return null;
		}
	}

	public class ChatbotSearchCriteria
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



