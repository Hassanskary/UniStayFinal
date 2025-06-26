using FinalGP.Data;
using FinalGP.Server.DTO;
using FinalGP.Server.Hubs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace FinalGP.Server.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class RatingController : ControllerBase
	{
			private readonly ESHContext _context;
			private readonly IHubContext<RatingHub> _hubContext;

			public RatingController(ESHContext context, IHubContext<RatingHub> hubContext)
			{
				_context = context;
				_hubContext = hubContext;
			}

		// ✅ إضافة أو تحديث التقييم
		[HttpPost]
		public async Task<IActionResult> AddOrUpdateRating([FromBody] RatingDto ratingDto)
		{
			if (!ModelState.IsValid)
				return BadRequest(ModelState);

			var existingRating = await _context.Ratings
				.FirstOrDefaultAsync(r => r.HomeId == ratingDto.HomeId && r.UserId == ratingDto.UserId);

			if (existingRating != null)
			{
				existingRating.Score = ratingDto.Score;
				existingRating.Date = DateTime.Now;
			}
			else
			{
				var rating = new Rating
				{
					HomeId = ratingDto.HomeId,
					UserId = ratingDto.UserId,
					Score = ratingDto.Score,
					Date = DateTime.Now
				};
				_context.Ratings.Add(rating);
			}

			await _context.SaveChangesAsync();

			// ✅ إصلاح خطأ AverageAsync
			var ratings = await _context.Ratings
				.Where(r => r.HomeId == ratingDto.HomeId)
				.Select(r => r.Score)
				.ToListAsync();

			var avgRating = ratings.Any() ? ratings.Average() : 0;

			await _hubContext.Clients.All.SendAsync("ReceiveRatingUpdate", ratingDto.HomeId, avgRating);

			return Ok(new { message = "Rating updated successfully", avgRating });
		}

        [HttpGet("user/{userId}/home/{homeId}")]
        public async Task<IActionResult> GetUserRating(string userId, int homeId)
        {
            var rating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.UserId == userId && r.HomeId == homeId);

            if (rating == null)
            {
                return NotFound(new { message = "لم يتم العثور على تقييم لهذا المستخدم لهذا المنزل" });
            }

            return Ok(new
            {
                userId = rating.UserId,
                homeId = rating.HomeId,
                score = rating.Score,
                date = rating.Date
            });
        }

        // ✅ جلب متوسط التقييم فقط
        [HttpGet("average/{homeId}")]
		public async Task<IActionResult> GetAverageRating(int homeId)
		{
			var ratings = _context.Ratings.Where(r => r.HomeId == homeId);

			var averageRating = ratings.Any() ? ratings.Average(r => r.Score) : 0;

			return Ok(new { homeId, averageRating });
		}

	}
}


