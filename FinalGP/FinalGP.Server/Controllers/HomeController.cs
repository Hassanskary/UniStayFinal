using FinalGP.Data;
using FinalGP.DTO.Facility;
using FinalGP.DTO.Home;
using FinalGP.Hubs;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomeController : ControllerBase
    {
        private readonly IHomeRepository homeRepo;
        private readonly IGenericRepository<Facility> _facilityRepo;
        private readonly IServiceHome _homeservice;
        private readonly ESHContext _context; // Added to fetch owner's name
        private readonly IBookingRepository _bookRepo;

        private readonly INotificationRepository _notificationRepo;
        private readonly IAdminRepository _adminRepo;
        public HomeController(IHomeRepository homeRepo, IGenericRepository<Facility> FacilityRepo, IServiceHome homeservice,
            IBookingRepository bookRepo,
            IHubContext<NotificationHub> hubContext, IAdminRepository adminRepo, INotificationRepository notificationRepository, ESHContext context)
        {
            
            this.homeRepo = homeRepo;
            _facilityRepo = FacilityRepo;
            _homeservice = homeservice;
            _bookRepo = bookRepo;
            _notificationRepo = notificationRepository;
            _adminRepo = adminRepo;
            _context = context;
        }
        [HttpPost("Add")]
       [Authorize(Roles = "Owner")]
        public async Task<IActionResult> Add([FromForm] AddHome homeDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Where(ms => ms.Value.Errors.Count > 0)
                                       .ToDictionary(
                                           kvp => kvp.Key,
                                           kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                                       );
                return BadRequest(new { errors });
            }

            var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(ownerId))
            {
                return Unauthorized("Invalid owner authentication.");
            }

            if (homeDto.ContractFile == null || homeDto.PhotoFiles == null || homeDto.PhotoFiles.Count == 0)
            {
                return BadRequest(new { errors = new { ContractFile = new[] { "Contract photo and at least one property photo are required." } } });
            }

            var contractResult = await homeRepo.SaveContractPhoto(homeDto.ContractFile);
            if (!contractResult.success)
            {
                return BadRequest(new { errors = new { ContractFile = new[] { contractResult.errorMessage } } });
            }

            var photoUrls = await homeRepo.SavePropertyPhotos(homeDto.PhotoFiles);
            if (!photoUrls.Any())
            {
                return BadRequest(new { errors = new { PhotoFiles = new[] { "Error while saving property photos." } } });
            }

            var home = new Home
            {
                Title = homeDto.Title,
                Description = homeDto.Description,
                City = homeDto.City,
                LocationDetails = homeDto.LocationDetails,
                DistanceFromUniversity = homeDto.DistanceFromUniversity,
                Gender = homeDto.Gender,
                Floor = homeDto.Floor,
                Type = homeDto.Type,
                ContractPhoto = contractResult.fileUrl,
                OwnerId = ownerId,
                Photos = photoUrls.Select(url => new Photo { PhotoUrl = url }).ToList(),
                NumOfRooms = 0,
                Latitude = homeDto.Latitude,
                Longitude = homeDto.Longitude
            };

            homeRepo.Insert(home);
            homeRepo.Save();

            var owner = await _context.Users
                .Where(u => u.Id == ownerId)
                .Select(u => u.UserName)
                .FirstOrDefaultAsync();
            var ownerName = owner ?? "Unknown Owner";

            var admins = _adminRepo.GetAll();
            var adminIds = admins.Select(a => a.Id).ToList();
            Console.WriteLine($"Admin IDs fetched: {string.Join(", ", adminIds)}"); // سجل للتحقق

            await _notificationRepo.CreateAndSendNotificationAsync(
                adminIds,
                home,
                $"Owner {ownerName} has added New Home {home.Id}"
            );
            Console.WriteLine("Notification sent to SignalR for admins."); // سجل للتأكد من الإرسال

            return Ok(new { Message = "Home added successfully!", HomeId = home.Id });
        }

        [HttpPut("Update/{id}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> Update(int id, [FromForm] AddHome homeDto)
        {
            if (!ModelState.IsValid)
            {
                var errorList = ModelState
                    .Where(ms => ms.Value.Errors.Any())
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                    );
                return BadRequest(new { Message = "Invalid data provided.", Errors = errorList });
            }

            try
            {
                var existingHome = homeRepo.GetById(id);
                if (existingHome == null)
                {
                    return NotFound(new { Message = "Home not found." });
                }

                // تحقق من ملكية الـ Home
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token." });
                }

                if (existingHome.OwnerId != userId)
                {
                    return Problem("You do not own this home.", statusCode: 403);
                }

                // Update basic fields
                existingHome.Title = homeDto.Title;
                existingHome.Description = homeDto.Description;
                existingHome.City = homeDto.City;
                existingHome.LocationDetails = homeDto.LocationDetails;
                existingHome.DistanceFromUniversity = homeDto.DistanceFromUniversity;
                existingHome.Gender = homeDto.Gender;
                existingHome.Floor = homeDto.Floor;
                existingHome.Type = homeDto.Type;

                // Update latitude and longitude
                existingHome.Latitude = homeDto.Latitude;
                existingHome.Longitude = homeDto.Longitude;

                // Handle contract file update (if provided)
                if (homeDto.ContractFile != null)
                {
                    if (!string.IsNullOrEmpty(existingHome.ContractPhoto))
                    {
                        var oldContractFileName = Path.GetFileName(existingHome.ContractPhoto);
                        await homeRepo.DeleteImage(oldContractFileName, "ContractPhoto");
                    }
                    var contractResult = await homeRepo.SaveContractPhoto(homeDto.ContractFile);
                    if (!contractResult.success)
                    {
                        return BadRequest(new { Message = "Contract update failed.", Errors = new { ContractPhoto = new[] { contractResult.errorMessage } } });
                    }
                    existingHome.ContractPhoto = contractResult.fileUrl;
                }

                // Handle photo files update
                if (homeDto.PhotoFiles != null && homeDto.PhotoFiles.Count > 0)
                {
                    foreach (var photo in existingHome.Photos.ToList())
                    {
                        var oldFileName = Path.GetFileName(photo.PhotoUrl);
                        await homeRepo.DeleteImage(oldFileName, "HomePhotos");
                        existingHome.Photos.Remove(photo);
                    }
                    var newPhotoUrls = await homeRepo.SavePropertyPhotos(homeDto.PhotoFiles);
                    foreach (var url in newPhotoUrls)
                    {
                        existingHome.Photos.Add(new Photo { PhotoUrl = url });
                    }
                }

                homeRepo.Update(existingHome);
                homeRepo.Save();

                return Ok(new
                {
                    Message = "Home updated successfully!",
                    HomeId = existingHome.Id,
                    ContractPhoto = existingHome.ContractPhoto,
                    Photos = existingHome.Photos.Select(p => p.PhotoUrl)
                });
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = "Concurrency error occurred while updating the home." });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = "An error occurred while updating the home.", Error = ex.Message });
            }
        }

        [HttpGet("AddFacilities/{homeId}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> AddFacilities(int homeId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var home = homeRepo.Query()
                .Include(h => h.FacilityHomes)
                .ThenInclude(fh => fh.Facility)
                .FirstOrDefault(h => h.Id == homeId);

            if (home == null)
            {
                return NotFound(new { Message = "Home not found." });
            }

            if (home.OwnerId != userId)
            {
                return Problem("You do not own this home.", statusCode: 403);
            }

            var allFacilities = _facilityRepo.Query().ToList();

            var facilities = allFacilities.Select(f => new
            {
                f.Id,
                f.Name,
                IsSelected = home.FacilityHomes.Any(fh => fh.FacilityId == f.Id)
            }).ToList();

            return Ok(new
            {
                HomeId = homeId,
                Facilities = facilities
            });
        }


        [HttpPost("SaveFacilities/{homeId}")]
        [Authorize(Roles = "Owner")]

        public async Task<IActionResult> SaveFacilities(int homeId, [FromBody] List<int> selectedFacilityIds)
        {
            if (selectedFacilityIds == null)
            {
                return BadRequest(new { Message = "Invalid facility selection." });
            }

            var home = homeRepo.Query()
                .Include(h => h.FacilityHomes)
                .FirstOrDefault(h => h.Id == homeId);

            if (home == null)
            {
                return NotFound(new { Message = "Home not found." });
            }

            home.FacilityHomes.Clear();

            foreach (var facilityId in selectedFacilityIds)
            {
                home.FacilityHomes.Add(new FacilityHome { HomeId = homeId, FacilityId = facilityId });
            }

            homeRepo.Update(home);
            homeRepo.Save(); // Ensure changes are saved

            return Ok(new { Message = "Facilities saved successfully!" });
        }

        [HttpGet("GetSelectedFacilities/{homeId}")]
        [Authorize(Roles = "Admin,Owner")]
        public IActionResult GetSelectedFacilities(int homeId)
        {

            //var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            //if (string.IsNullOrEmpty(userId))
            //{
            //    return Unauthorized(new { message = "User ID not found in token." });
            //}


            var home = homeRepo.Query()
                .Include(h => h.FacilityHomes)
                    .ThenInclude(fh => fh.Facility)
                .FirstOrDefault(h => h.Id == homeId);

            if (home == null)
                return NotFound(new { Message = "Home not found." });

            //if (home.OwnerId != userId)
            //{
            //    return Problem("You do not own this home.", statusCode: 403);
            //}

            var selectedFacilities = home.FacilityHomes
                .Select(fh => new { id = fh.FacilityId, name = fh.Facility.Name })
                .ToList();

            return Ok(new { facilities = selectedFacilities });
        }



        [HttpGet("GetHomesByOwner/{ownerId}")]
        [Authorize(Roles = "Owner")]
        public IActionResult GetHomesByOwner(string ownerId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            if (ownerId != userId)
            {
                return Problem("You do not own these homes.", statusCode: 403);
            }

            var homes = homeRepo.GetAll()
                .Where(h => h.OwnerId == ownerId)
                .Select(h => new HomeDto
                {
                    Id = h.Id,
                    Title = h.Title,
                    City = h.City.ToString(),
                    NumOfRooms = h.NumOfRooms,
                    ContractPhoto = !string.IsNullOrEmpty(h.ContractPhoto)
                        ? $"{Request.Scheme}://{Request.Host}/ContractPhoto/{Path.GetFileName(h.ContractPhoto)}"
                        : null,
                    FirstPhoto = (h.Photos != null && h.Photos.Any() && !string.IsNullOrEmpty(h.Photos.First().PhotoUrl))
                        ? $"{Request.Scheme}://{Request.Host}/HomePhotos/{Path.GetFileName(h.Photos.First().PhotoUrl)}"
                        : $"{Request.Scheme}://{Request.Host}/default-home.jpg",
                    CreatedAt = h.CreatedAt.ToString("yyyy-MM-dd"),
                    Status = h.Status.ToString(),
                    Type = h.Type.ToString(),
                    Gender = h.Gender.ToString()
                })
                .ToList();

            return Ok(homes);
        }

        [HttpGet("GetHome/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> GetHome(int id)
        {
            var home = homeRepo.GetById(id);
            if (home == null)
                return NotFound("Home not found.");

            var homeDetails = new HomeDetailsDto
            {
                Id = home.Id,
                Title = home.Title,
                Description = home.Description,
                City = home.City,
                LocationDetails = home.LocationDetails,
                DistanceFromUniversity = home.DistanceFromUniversity,
                Gender = home.Gender,
                Floor = home.Floor,
                Type = home.Type,
                homeApprovalStatus = home.Status,
                ContractPhoto = home.ContractPhoto,
                Photos = home.Photos.Select(p => p.PhotoUrl).ToList(),
                NumOfRooms = home.NumOfRooms,
                Facilities = home.Facilities?.Select(f => new FacilityDto
                {
                    Id = f.Id,
                    Name = f.Name
                }).ToList() ?? new List<FacilityDto>(),
                ShowRoomsUrl = $"{Request.Scheme}://{Request.Host}/api/Room/GetRoomsByHome/{home.Id}",
                Latitude = home.Latitude,
                Longitude = home.Longitude
            };

            return Ok(homeDetails);
        }


        [HttpDelete("DeleteHome/{id}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> DeleteHome(int id)
        {
            var home = homeRepo.GetById(id);
            if (home == null)
                return NotFound("Home not found.");

            if (!string.IsNullOrEmpty(home.ContractPhoto))
            {
                var oldContractFileName = Path.GetFileName(home.ContractPhoto);
                await homeRepo.DeleteImage(oldContractFileName, "ContractPhoto");
            }

            foreach (var photo in home.Photos.ToList())
            {
                var oldFileName = Path.GetFileName(photo.PhotoUrl);
                await homeRepo.DeleteImage(oldFileName, "HomePhotos");
            }

            homeRepo.Delete(home.Id);
            homeRepo.Save();

            return Ok(new { Message = "Home deleted successfully!" });
        }


        [HttpGet("GetPendingHomes")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingHomes()
        {
            var pendingHomes = homeRepo.GetAll()
                 .Where(h => h.Status == HomeApprovalStatus.PendingApproval)
                 .Select(h => new HomeDto
                 {
                     Id = h.Id,
                     Title = h.Title,
                     City = h.City.ToString(),
                     NumOfRooms = h.NumOfRooms,
                     ContractPhoto = !string.IsNullOrEmpty(h.ContractPhoto)
                         ? $"{Request.Scheme}://{Request.Host}/ContractPhoto/{Path.GetFileName(h.ContractPhoto)}"
                         : null,
                     FirstPhoto = (h.Photos != null && h.Photos.Any() && !string.IsNullOrEmpty(h.Photos.First().PhotoUrl))
                         ? $"{Request.Scheme}://{Request.Host}/HomePhotos/{Path.GetFileName(h.Photos.First().PhotoUrl)}"
                         : $"{Request.Scheme}://{Request.Host}/default-home.jpg",
                     CreatedAt = h.CreatedAt.ToString("yyyy-MM-dd"),
                     Status = h.Status.ToString(),
                     Type = h.Type.ToString(),
                     Gender = h.Gender.ToString()
                 })
                 .ToList();

            if (!pendingHomes.Any())
                return NotFound("No Homes Found!");
            else
                return Ok(pendingHomes);
        }


         [Authorize(Roles = "Admin")]
        [HttpPut("UpdateHomeStatus/{id}")]
        public async Task<IActionResult> UpdateHomeStatus(int id, [FromBody] string status)
        {
            var home = homeRepo.GetById(id);
            if (home == null)
                return NotFound(new { message = "Home not found" });

            if (status != "Accepted" && status != "Rejected")
                return BadRequest(new { message = "Invalid status. Use 'Accepted' or 'Rejected'." });
            else if (status == "Accepted")
            {
                home.Status = HomeApprovalStatus.Approved;
            }
            else
            {
                home.Status = HomeApprovalStatus.Rejected;

            }
            homeRepo.Update(home);
            homeRepo.Save();
            await _notificationRepo.CreateAndSendBookingNotificationAsync(home.OwnerId, home.AdminId, $"Admin was update home status and {status} This Home {home.Id}");


            return Ok(new { message = $"Home status updated to {status}.", home });
        }
    }
}