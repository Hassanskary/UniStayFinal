using FinalGP.DTO.Facility;
using FinalGP.DTO.Home;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.Server.DTO.HomePage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomePageController : ControllerBase
    {
        private readonly IHomeRepository _homeRepository;

        public HomePageController(IHomeRepository homeRepository)
        {
            _homeRepository = homeRepository;
        }
        [HttpGet("HomeApproved")]
        public IActionResult ShowApprovedHomes([FromQuery] int skip = 0, [FromQuery] int take = 12)
        {
            var approvedHomes = _homeRepository.Query()
                .Where(h => h.Status == HomeApprovalStatus.Approved)
                .Where(h => h.Rooms.Any()) // Check if there are any rooms directly in the query
                .Include(h => h.Photos)
                .Include(h => h.Ratings)
                .OrderBy(h => h.Id) // ترتيب ثابت لضمان اتساق الـ Pagination
                .Skip(skip)
                .Take(take)
                .Select(h => new ShowHomesDTO
                {
                    Id = h.Id,
                    Title = h.Title,
                    City = h.City.ToString(),
                    rate = h.Ratings.Any() ? h.Ratings.Average(r => r.Score) : 0, // Calculate average rate
                    Photos = h.Photos.Select(p => $"{Request.Scheme}://{Request.Host}{p.PhotoUrl}").ToList()
                })
                .ToList();

            return Ok(approvedHomes);
        }

        [HttpGet("HomeApprovedCount")]
        public IActionResult GetApprovedHomesCount()
        {
            var count = _homeRepository.Query()
                .Count(h => h.Status == HomeApprovalStatus.Approved);
            return Ok(count);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchHomes([FromQuery] string Search)
        {
            var homes = await _homeRepository.SearchHomesAsync(Search);
            if (homes == null || !homes.Any())
                return BadRequest("No Match Result");

            var result = homes.Select(home => new
            {
                Title = home.Title,
                City = home.City.ToString(),
                Rate = home.Rate, // Use the Rate property directly
                Photos = home.Photos.Select(p => $"{Request.Scheme}://{Request.Host}{p}").ToList()
            }).ToList();

            return Ok(result);
        }

        [HttpGet("suggestions")]
        public async Task<IActionResult> GetSuggestions([FromQuery] string Search)
        {
            if (string.IsNullOrWhiteSpace(Search))
            {
                return Ok(new string[0]);
            }

            // Filtered for only approved homes
            var query = _homeRepository.Query()
                .Where(h => h.Status == HomeApprovalStatus.Approved);

            var titleSuggestions = await query
                .Where(h => h.Title.Contains(Search))
                .Select(h => h.Title)
                .Distinct()
                .ToListAsync();

            var descriptionSuggestions = await query
                .Where(h => h.Description != null && h.Description.Contains(Search))
                .Select(h => h.Description)
                .Distinct()
                .ToListAsync();

            var suggestions = titleSuggestions
                .Union(descriptionSuggestions)
                .Take(10)
                .ToList();

            return Ok(suggestions);
        }
    }
}