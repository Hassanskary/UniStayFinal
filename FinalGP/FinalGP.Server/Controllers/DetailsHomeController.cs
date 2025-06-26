using FinalGP.Data;
using FinalGP.RepositoryLayer.Interface;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace FinalGP.Server.Controllers
{
    public class PhotoDto
    {
        public string Url { get; set; }
    }

    public class HomeDetailsDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public List<string> Facilities { get; set; }
        public string Address { get; set; }
        public string LocationDescription { get; set; }
        public string OwnerPhoneNumber { get; set; }
        public string OwnerId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int Floor { get; set; } // Added Floor
        public DateTime CreatedAt { get; set; } // Added CreatedAt
    }

    [Route("api/[controller]")]
    [ApiController]
    public class DetailsHomeController : ControllerBase
    {
        private readonly IHomeRepository _homeRepo;
        private readonly ESHContext _context;

        public DetailsHomeController(IHomeRepository homeRepo, ESHContext context)
        {
            _homeRepo = homeRepo;
            _context = context;
        }

        [HttpGet("photos/{homeId}")]
        public async Task<IActionResult> GetTopPhotos(int homeId)
        {
            var home = await _homeRepo.GetByIdAsync(homeId);
            if (home == null)
                return NotFound();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var top5 = home.Photos
                .Take(5)
                .Select(p => new PhotoDto
                {
                    Url = $"{baseUrl}{p.PhotoUrl}"
                })
                .ToList();

            return Ok(top5);
        }

        [HttpGet("photos/all/{homeId}")]
        public async Task<IActionResult> GetAllPhotos(int homeId)
        {
            var home = await _homeRepo.GetByIdAsync(homeId);
            if (home == null)
                return NotFound();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var all = home.Photos
                .Select(p => new PhotoDto
                {
                    Url = $"{baseUrl}{p.PhotoUrl}"
                })
                .ToList();

            return Ok(all);
        }

        [HttpGet("{homeId}")]
        public async Task<IActionResult> GetHomeDetails(int homeId)
        {
            var home = await _context.Homes
                .Include(h => h.FacilityHomes).ThenInclude(fh => fh.Facility)
                .Include(h => h.Owner)
                .FirstOrDefaultAsync(h => h.Id == homeId);

            if (home == null)
                return NotFound();

            var dto = new HomeDetailsDto
            {
                Title = home.Title ?? "No title available",
                Description = home.Description ?? "No description available",
                Facilities = home.FacilityHomes?.Select(fh => fh.Facility.Name).ToList() ?? new List<string>(),
                Address = home.City != null && home.LocationDetails != null ? $"{home.City}, {home.LocationDetails}" : "No address available",
                LocationDescription = home.LocationDetails ?? "No location details available",
                OwnerPhoneNumber = home.Owner?.PhoneNumber ?? "No phone number available",
                OwnerId = home.Owner?.Id ?? "",
                Latitude = home.Latitude,
                Longitude = home.Longitude,
                Floor = home.Floor, // Set Floor from Home model
                CreatedAt = home.CreatedAt // Set CreatedAt from Home model
            };

            return Ok(dto);
        }
    }
}