using Microsoft.AspNetCore.Mvc;
using FinalGP.Models;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.IO;
using FinalGP.DTO.Room;
using Microsoft.AspNetCore.Authorization;
using FinalGP.ServiceLayer;
using FinalGP.RepositoryLayer.Interface;
using System.Security.Claims;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly IServiceRoom _roomserv;
        private readonly IHomeRepository _homeRepository;

        public RoomController(IServiceRoom roomserv, IHomeRepository homeRepository)
        {
            this._roomserv = roomserv;
            this._homeRepository = homeRepository;
        }

        [HttpGet("GetRoomsByHome/{homeId}")]
        public async Task<IActionResult> GetRoomsByHome(int homeId)
        {
            var rooms = _roomserv.GetAll().Where(r => r.HomeId == homeId).ToList();

            if (!rooms.Any())
                return NotFound(new { message = "No rooms found for this home" });

            var home = await _homeRepository.GetByIdAsync(homeId);
            if (home == null)
                return NotFound(new { message = "Home not found" });

            // تحقق من الملكية إذا كان فيه token
            //var userId = User?.Identity?.IsAuthenticated == true ? User.FindFirst(ClaimTypes.NameIdentifier)?.Value : null;
            //if (userId != null && home.OwnerId != userId)
            //{
            //    return Problem("You do not own this home.", statusCode: 403);
            //}
            var baseUrl = $"{Request.Scheme}://{Request.Host}/RoomPhotos/";

            var responseDto = new
            {
                Title = home.Title,
                Rooms = rooms.Select(room => new RoomDto
                {
                    Id = room.Id,
                    Number = room.Number,
                    NumOfBeds = room.NumOfBeds,
                    Price = room.Price,
                    IsCompleted = room.IsCompleted,
                    HomeId = room.HomeId ?? 0,
                    Photo = !string.IsNullOrEmpty(room.Photo) ? $"{baseUrl}{room.Photo}" : null
                }).ToList()
            };

            return Ok(responseDto);
        }

        [HttpGet("GetRoom/{Id}")]
        public async Task<IActionResult> GetRoom(int Id)
        {
            var room = _roomserv.GetById(Id);
            if (room == null)
                return NotFound(new { message = "Room not found" });

            // جلب بيانات الـ Home المرتبط بالـ Room للحصول على OwnerId
            var home = await _homeRepository.GetByIdAsync(room.HomeId ?? 0);
            if (home == null)
                return NotFound(new { message = "Home not found for this room" });

            var baseUrl = $"{Request.Scheme}://{Request.Host}/RoomPhotos/";

            var roomWithImagePath = new
            {
                room.Id,
                room.Number,
                room.NumOfBeds,
                room.Price,
                room.IsCompleted, // إضافة حقل isCompleted
                room.HomeId,
                OwnerId = home.OwnerId, // إضافة OwnerId من الـ Home
                Photo = !string.IsNullOrEmpty(room.Photo) ? $"{baseUrl}{room.Photo}" : null
            };

            return Ok(roomWithImagePath);
        }

            [HttpPost("Add")]
            [Authorize(Roles = "Owner")]
            public async Task<IActionResult> AddRoom([FromForm] RoomCreateModel roomm, [Required] IFormFile RoomPhoto)
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (RoomPhoto == null || RoomPhoto.Length == 0)
                    return BadRequest(new { message = "Photo is required" });

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // استخدام الطريقة الموحدة
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token." });
                }

                var home = _homeRepository.GetById(roomm.HomeId);
                if (home == null)
                    return NotFound(new { message = "Home not found for adding room." });

                if (home.OwnerId != userId)
                    return Problem("You do not own this home.", statusCode: 403);

                try
                {
                    string fileName = await _roomserv.UploadRoomImage(RoomPhoto);
                    if (string.IsNullOrEmpty(fileName))
                        return BadRequest(new { message = "Failed to upload room image." });

                    Room newRoom = await _roomserv.MapToRoom(roomm, fileName);
                    if (newRoom == null)
                        return BadRequest(new { message = "Failed to map room data." });

                    _roomserv.Insert(newRoom);
                    _roomserv.Save();

                    home.NumOfRooms += 1;
                    home.Rooms.Add(newRoom);

                    _homeRepository.Update(home);
                    _homeRepository.Save();

                    return Ok(new { message = "Room created successfully", newRoom });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in AddRoom: {ex.Message}");
                    return StatusCode(500, new { message = "An internal error occurred while adding the room." });
                }
            }

        [HttpPut("Update/{Id}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> UpdateRoom(int Id, [FromForm] RoomCreateModel roomm, IFormFile? RoomPhoto)
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

            var existingRoom = _roomserv.GetById(Id);
            if (existingRoom == null)
                return NotFound(new { message = "Room not found" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            if (!existingRoom.HomeId.HasValue)
            {
                return NotFound(new { message = "Room has no associated home." });
            }

            var home = _homeRepository.GetById(existingRoom.HomeId.Value); // Use Value to get int from nullable
            if (home == null)
            {
                return NotFound(new { message = "Home not found." });
            }

            if (home.OwnerId != userId)
            {
                return Problem("You do not own this room.", statusCode: 403);
            }

            if (RoomPhoto != null)
            {
                _roomserv.RemoveRoomImage(existingRoom.Photo);
                string newFileName = await _roomserv.UploadRoomImage(RoomPhoto);
                existingRoom.Photo = newFileName;
            }

            existingRoom.Number = roomm.Number;
            existingRoom.NumOfBeds = roomm.NumOfBeds;
            existingRoom.Price = roomm.Price;
            existingRoom.IsCompleted = roomm.IsCompleted;
            existingRoom.HomeId = roomm.HomeId;

            _roomserv.Update(existingRoom);
            _roomserv.Save();

            var baseUrl = $"{Request.Scheme}://{Request.Host}/RoomPhotos/";
            var updatedRoomWithImage = new
            {
                existingRoom.Id,
                existingRoom.Number,
                existingRoom.NumOfBeds,
                existingRoom.Price,
                existingRoom.IsCompleted,
                existingRoom.HomeId,
                Photo = !string.IsNullOrEmpty(existingRoom.Photo) ? $"{baseUrl}{existingRoom.Photo}" : null
            };

            return Ok(new { message = "Room updated successfully", updatedRoomWithImage });
        }
        [HttpGet("CheckOwnership")]
        [Authorize(Roles = "Owner")]
        public IActionResult CheckOwnership(int homeId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var home = _homeRepository.GetById(homeId);
            if (home == null)
            {
                return NotFound(new { message = "Home not found." });
            }

            if (home.OwnerId != userId)
            {
                return Problem("You do not own this home.", statusCode: 403);
            }

            return Ok(new { message = "Ownership verified." });
        }

        [HttpGet("CheckRoomOwnership/{roomId}")]
        [Authorize(Roles = "Owner")]
        public IActionResult CheckRoomOwnership(int roomId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var room = _roomserv.GetById(roomId);
            if (room == null)
            {
                return NotFound(new { message = "Room not found." });
            }

            if (!room.HomeId.HasValue) // Check if HomeId is null
            {
                return NotFound(new { message = "Room has no associated home." });
            }

            var home = _homeRepository.GetById(room.HomeId.Value); // Use Value to get int from nullable
            if (home == null)
            {
                return NotFound(new { message = "Home not found." });
            }

            if (home.OwnerId != userId)
            {
                return Problem("You do not own this room.", statusCode: 403);
            }

            return Ok(new { message = "Ownership verified." });
        }

        [HttpDelete("Remove/{Id}")]
        [Authorize(Roles = "Owner")]

        public async Task<IActionResult> RemoveRoom(int Id)
        {
            var room = _roomserv.GetById(Id);
            if (room == null)
                return NotFound(new { message = "Room not found" });

            bool isDeleted = _roomserv.RemoveRoomImage(room.Photo);
            var home = _homeRepository.GetById((int)room.HomeId);
            home.NumOfRooms--;
            _roomserv.Delete(Id);
            _roomserv.Save();

            return Ok(new { message = "Room deleted successfully", imageDeleted = isDeleted });
        }
    }
}