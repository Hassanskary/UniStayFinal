using Microsoft.AspNetCore.Mvc;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.Models;
using FinalGP.Server.DTO.Filter;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using FinalGP.Data;
using System;

namespace FinalGP.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FilterController : ControllerBase
    {
        private readonly IHomeRepository _homeRepository;
        private readonly ESHContext _context;
        private readonly ILogger<FilterController> _logger;

        public FilterController(IHomeRepository homeRepository, ESHContext context, ILogger<FilterController> logger)
        {
            _homeRepository = homeRepository;
            _context = context;
            _logger = logger;
        }

        [HttpGet("facilities")]
        public async Task<IActionResult> GetFacilities()
        {
            try
            {
                _logger.LogInformation("GetFacilities called");
                var facilities = await _context.Facilities.ToListAsync();
                var facilityDtos = facilities.Select(f => new FacilityDtoo
                {
                    Id = f.Id,
                    Name = f.Name
                }).ToList();
                _logger.LogInformation("GetFacilities: Returning {Count} facilities", facilityDtos.Count);
                return Ok(facilityDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in GetFacilities");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("homes")]
        public async Task<IActionResult> FilterHomes([FromBody] HomeFilterRequestDto request, [FromQuery] string search = "", [FromQuery] int skip = 0, [FromQuery] int take = 12)
        {
            try
            {
                _logger.LogInformation("FilterHomes called with request: {@Request}, search: {Search}, skip: {Skip}, take: {Take}", request, search, skip, take);

                if (request == null)
                {
                    _logger.LogWarning("Request body is null");
                    return BadRequest("Request body cannot be null");
                }

                // بناء الـ query مع التأكد من تحميل البيانات المرتبطة
                var query = _homeRepository.Query()
                    .Include(h => h.Photos)
                    .Include(h => h.Ratings)
                    .Include(h => h.FacilityHomes)
                    .Include(h => h.Rooms)
                    .Where(h => h.Status == HomeApprovalStatus.Approved);
                _logger.LogInformation("FilterHomes: Initial query built");

                // إضافة شرط للتأكد من وجود غرف على الأقل
                query = query.Where(h => h.Rooms != null && h.Rooms.Any());

                if (!string.IsNullOrEmpty(search))
                {
                    _logger.LogInformation("FilterHomes: Applying search filter: {Search}", search);
                    query = query.Where(h => h.Title.Contains(search) || (h.Description != null && h.Description.Contains(search)));
                    _logger.LogInformation("FilterHomes: After search filter");
                }

                if (request.FacilityIds != null && request.FacilityIds.Any())
                {
                    _logger.LogInformation("FilterHomes: Applying facility filter with {Count} facility IDs", request.FacilityIds.Count);
                    var facilityIds = request.FacilityIds;
                    var facilityCount = facilityIds.Count;
                    query = query.Where(h => h.FacilityHomes != null && h.FacilityHomes
                        .Where(fh => facilityIds.Contains(fh.FacilityId))
                        .Select(fh => fh.FacilityId)
                        .Distinct()
                        .Count() == facilityCount);
                    _logger.LogInformation("FilterHomes: After facility filter");
                }

                // Parse enum values if provided
                HomeType? homeTypeFilter = null;
                Gender? genderFilter = null;
                City? cityFilter = null;

                if (!string.IsNullOrEmpty(request.HomeType) && Enum.TryParse<HomeType>(request.HomeType, true, out var parsedHomeType))
                {
                    homeTypeFilter = parsedHomeType;
                    _logger.LogInformation("FilterHomes: Parsed HomeType: {HomeType}", homeTypeFilter);
                }

                if (!string.IsNullOrEmpty(request.Gender) && Enum.TryParse<Gender>(request.Gender, true, out var parsedGender))
                {
                    genderFilter = parsedGender;
                    _logger.LogInformation("FilterHomes: Parsed Gender: {Gender}", genderFilter);
                }

                if (!string.IsNullOrEmpty(request.City) && Enum.TryParse<City>(request.City, true, out var parsedCity))
                {
                    cityFilter = parsedCity;
                    _logger.LogInformation("FilterHomes: Parsed City: {City}", cityFilter);
                }

                // Apply filters
                if (request.MinPrice.HasValue || request.MaxPrice.HasValue || request.MinBeds.HasValue || request.MaxBeds.HasValue ||
                    request.MinFloor.HasValue || request.MaxFloor.HasValue || homeTypeFilter.HasValue || genderFilter.HasValue || cityFilter.HasValue)
                {
                    _logger.LogInformation("FilterHomes: Applying additional filters");
                    query = query.Where(h =>
                        (!request.MinFloor.HasValue || h.Floor >= request.MinFloor.Value) &&
                        (!request.MaxFloor.HasValue || h.Floor <= request.MaxFloor.Value) &&
                        (!homeTypeFilter.HasValue || h.Type == homeTypeFilter.Value) &&
                        (!genderFilter.HasValue || h.Gender == genderFilter.Value) &&
                        (!cityFilter.HasValue || h.City == cityFilter.Value) &&
                        h.Rooms.Any(r =>
                            (!request.MinPrice.HasValue || r.Price >= request.MinPrice.Value) &&
                            (!request.MaxPrice.HasValue || r.Price <= request.MaxPrice.Value) &&
                            (!request.MinBeds.HasValue || r.NumOfBeds >= request.MinBeds.Value) &&
                            (!request.MaxBeds.HasValue || r.NumOfBeds <= request.MaxBeds.Value)
                        ));
                    _logger.LogInformation("FilterHomes: After additional filters");
                }

                if (request.Latitude.HasValue && request.Longitude.HasValue && request.Radius.HasValue)
                {
                    _logger.LogInformation("FilterHomes: Applying location filter with lat: {Latitude}, lng: {Longitude}, radius: {Radius}", request.Latitude, request.Longitude, request.Radius);
                    double lat = request.Latitude.Value;
                    double lng = request.Longitude.Value;
                    double radius = request.Radius.Value;

                    query = query.Where(h =>
                        6371 * 2 * Math.Asin(Math.Sqrt(
                            Math.Pow(Math.Sin((h.Latitude - lat) * Math.PI / 180 / 2), 2) +
                            Math.Cos(h.Latitude * Math.PI / 180) * Math.Cos(lat * Math.PI / 180) *
                            Math.Pow(Math.Sin((h.Longitude - lng) * Math.PI / 180 / 2), 2)
                        )) <= radius);
                    _logger.LogInformation("FilterHomes: After location filter");
                }

                // جلب النتايج للـ client-side وبعدين نعمل الـ sorting
                var homes = await query.ToListAsync();
                _logger.LogInformation("FilterHomes: Data fetched from database, applying sorting");

                // تطبيق الـ sorting على الـ in-memory collection
                switch (request.SortOption?.ToLower())
                {
                    case "photos_desc":
                        _logger.LogInformation("Sorting by photos_desc");
                        homes = homes.OrderByDescending(h => h.Photos != null && h.Photos.Any() ? h.Photos.Count() : 0).ToList();
                        break;
                    case "floor_asc":
                        _logger.LogInformation("Sorting by floor_asc");
                        homes = homes.OrderBy(h => h.Floor).ToList();
                        break;
                    case "price_high":
                        _logger.LogInformation("Sorting by price_high");
                        homes = homes.OrderByDescending(h => h.Rooms != null && h.Rooms.Any() ? h.Rooms.Max(r => r.Price) : 0).ToList();
                        break;
                    case "price_low":
                        _logger.LogInformation("Sorting by price_low");
                        homes = homes.OrderBy(h => h.Rooms != null && h.Rooms.Any() ? h.Rooms.Min(r => r.Price) : decimal.MaxValue).ToList();
                        break;
                    case "date_desc":
                        _logger.LogInformation("Sorting by date_desc");
                        homes = homes.OrderByDescending(h => h.CreatedAt).ToList();
                        break;
                    default:
                        _logger.LogInformation("Sorting by default (Id)");
                        homes = homes.OrderBy(h => h.Id).ToList(); // ترتيب افتراضي
                        break;
                }

                // جلب الـ homes بعد الـ filter والـ sort مع الـ pagination
                var pagedHomes = homes
                    .Skip(skip)
                    .Take(take)
                    .Select(h => new FilteredHomeDto
                    {
                        Id = h.Id,
                        Title = h.Title,
                        City = h.City.ToString(),
                        Rate = h.Ratings != null && h.Ratings.Any() ? h.Ratings.Average(r => r.Score) : 0,
                        Photos = h.Photos != null && h.Photos.Any() ? h.Photos.Select(p => $"{Request.Scheme}://{Request.Host}{p.PhotoUrl}").ToList() : new List<string>()
                    })
                    .ToList();
                _logger.LogInformation("FilterHomes: Query executed, returning {Count} homes", pagedHomes.Count);

                return Ok(pagedHomes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in FilterHomes with request: {@Request}, search: {Search}, skip: {Skip}, take: {Take}", request, search, skip, take);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("homes/count")]
        public async Task<IActionResult> GetFilteredHomesCount([FromBody] HomeFilterRequestDto request, [FromQuery] string search = "")
        {
            try
            {
                _logger.LogInformation("GetFilteredHomesCount called with request: {@Request}, search: {Search}", request, search);

                if (request == null)
                {
                    _logger.LogWarning("Request body is null");
                    return BadRequest("Request body cannot be null");
                }

                var query = _homeRepository.Query()
                    .Where(h => h.Status == HomeApprovalStatus.Approved);
                _logger.LogInformation("GetFilteredHomesCount: Initial query built");

                if (!string.IsNullOrEmpty(search))
                {
                    _logger.LogInformation("GetFilteredHomesCount: Applying search filter: {Search}", search);
                    query = query.Where(h => h.Title.Contains(search) || (h.Description != null && h.Description.Contains(search)));
                    _logger.LogInformation("GetFilteredHomesCount: After search filter");
                }

                if (request.FacilityIds != null && request.FacilityIds.Any())
                {
                    _logger.LogInformation("GetFilteredHomesCount: Applying facility filter with {Count} facility IDs", request.FacilityIds.Count);
                    var facilityIds = request.FacilityIds;
                    var facilityCount = facilityIds.Count;
                    query = query.Where(h => h.FacilityHomes != null && h.FacilityHomes
                        .Where(fh => facilityIds.Contains(fh.FacilityId))
                        .Select(fh => fh.FacilityId)
                        .Distinct()
                        .Count() == facilityCount);
                    _logger.LogInformation("GetFilteredHomesCount: After facility filter");
                }

                // Parse enum values if provided
                HomeType? homeTypeFilter = null;
                Gender? genderFilter = null;
                City? cityFilter = null;

                if (!string.IsNullOrEmpty(request.HomeType) && Enum.TryParse<HomeType>(request.HomeType, true, out var parsedHomeType))
                {
                    homeTypeFilter = parsedHomeType;
                    _logger.LogInformation("GetFilteredHomesCount: Parsed HomeType: {HomeType}", homeTypeFilter);
                }

                if (!string.IsNullOrEmpty(request.Gender) && Enum.TryParse<Gender>(request.Gender, true, out var parsedGender))
                {
                    genderFilter = parsedGender;
                    _logger.LogInformation("GetFilteredHomesCount: Parsed Gender: {Gender}", genderFilter);
                }

                if (!string.IsNullOrEmpty(request.City) && Enum.TryParse<City>(request.City, true, out var parsedCity))
                {
                    cityFilter = parsedCity;
                    _logger.LogInformation("GetFilteredHomesCount: Parsed City: {City}", cityFilter);
                }

                // Apply filters
                if (request.MinPrice.HasValue || request.MaxPrice.HasValue || request.MinBeds.HasValue || request.MaxBeds.HasValue ||
                    request.MinFloor.HasValue || request.MaxFloor.HasValue || homeTypeFilter.HasValue || genderFilter.HasValue || cityFilter.HasValue)
                {
                    _logger.LogInformation("GetFilteredHomesCount: Applying additional filters");
                    query = query.Where(h =>
                        (!request.MinFloor.HasValue || h.Floor >= request.MinFloor.Value) &&
                        (!request.MaxFloor.HasValue || h.Floor <= request.MaxFloor.Value) &&
                        (!homeTypeFilter.HasValue || h.Type == homeTypeFilter.Value) &&
                        (!genderFilter.HasValue || h.Gender == genderFilter.Value) &&
                        (!cityFilter.HasValue || h.City == cityFilter.Value) &&
                        (h.Rooms == null || !h.Rooms.Any() || h.Rooms.Any(r =>
                            (!request.MinPrice.HasValue || r.Price >= request.MinPrice.Value) &&
                            (!request.MaxPrice.HasValue || r.Price <= request.MaxPrice.Value) &&
                            (!request.MinBeds.HasValue || r.NumOfBeds >= request.MinBeds.Value) &&
                            (!request.MaxBeds.HasValue || r.NumOfBeds <= request.MaxBeds.Value)
                        )));
                    _logger.LogInformation("GetFilteredHomesCount: After additional filters");
                }

                if (request.Latitude.HasValue && request.Longitude.HasValue && request.Radius.HasValue)
                {
                    _logger.LogInformation("GetFilteredHomesCount: Applying location filter with lat: {Latitude}, lng: {Longitude}, radius: {Radius}", request.Latitude, request.Longitude, request.Radius);
                    double lat = request.Latitude.Value;
                    double lng = request.Longitude.Value;
                    double radius = request.Radius.Value;

                    query = query.Where(h =>
                        6371 * 2 * Math.Asin(Math.Sqrt(
                            Math.Pow(Math.Sin((h.Latitude - lat) * Math.PI / 180 / 2), 2) +
                            Math.Cos(h.Latitude * Math.PI / 180) * Math.Cos(lat * Math.PI / 180) *
                            Math.Pow(Math.Sin((h.Longitude - lng) * Math.PI / 180 / 2), 2)
                        )) <= radius);
                    _logger.LogInformation("GetFilteredHomesCount: After location filter");
                }

                var totalCount = await query.CountAsync();
                _logger.LogInformation("GetFilteredHomesCount: Query executed, returning count: {Count}", totalCount);
                return Ok(totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in GetFilteredHomesCount with request: {@Request}, search: {Search}", request, search);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}