using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using FinalGP.DTO;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.Server.DTO.Book;
using Microsoft.EntityFrameworkCore;
using FinalGP.Data;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BookingController : ControllerBase
    {
        private readonly IBookingRepository _bookingRepository;
        private readonly IUserRepository _userRepository;
        private readonly ESHContext _context;
        private readonly INotificationRepository _notificationRepo;

        public BookingController(
            IBookingRepository bookingRepository,
            IUserRepository userRepository,
            ESHContext context,
            INotificationRepository notificationRepo)
        {
            _bookingRepository = bookingRepository ?? throw new ArgumentNullException(nameof(bookingRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _notificationRepo = notificationRepo ?? throw new ArgumentNullException(nameof(notificationRepo));
        }

        [HttpPost("CreateBookingWithCash")]
        public async Task<IActionResult> CreateBookingWithCash([FromBody] CashBookingDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            await _bookingRepository.CreateBookingWithCash(userId, dto);

            // Get room to find ownerId
            var room = await _context.Rooms.FindAsync(dto.RoomId);
            if (room == null)
                return NotFound(new { message = "Room not found." });

            var home = await _context.Homes.FirstOrDefaultAsync(h => h.Id == room.HomeId);
            if (home == null)
                return NotFound(new { message = "Home not found for this room." });

            var ownerId = home.OwnerId;

            // Get user name
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var userName = user?.UserName ?? "Unknown User";

            // Determine if it's a new booking or renewal
            var existingBooking = await _context.Set<Booking>()
                .Where(b => b.UserId == userId && b.RoomId == dto.RoomId &&
                            (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Paid) &&
                            b.EndDate >= DateTime.UtcNow)
                .OrderByDescending(b => b.EndDate)
                .FirstOrDefaultAsync();

            string message;
            if (existingBooking != null)
            {
                existingBooking.Status = BookingStatus.Renewed;
                message = $"Renewal Cash booking by user {userName} for room {dto.RoomId}";
                await _notificationRepo.CreateAndSendCashBookingNotificationAsync(ownerId, userId, message);
            }
            else
            {
                message = $"New Cash booking by user {userName} for room {dto.RoomId}";
                await _notificationRepo.CreateAndSendCashBookingNotificationAsync(ownerId, userId, message);
            }

            return Ok();
        }

        [HttpGet("GetLatestBooking/{userId}/{roomId}")]
        public async Task<IActionResult> GetLatestBooking(string userId, int roomId)
        {
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            var booking = await _bookingRepository.GetLatestBooking(userId, roomId);
            if (booking == null)
                return NotFound("No booking found");

            var response = new
            {
                Id = booking.Id,
                UserId = booking.UserId,
                RoomId = booking.RoomId,
                Room = booking.Room != null ? new
                {
                    Id = booking.Room.Id,
                    Number = booking.Room.Number,
                    NumOfBeds = booking.Room.NumOfBeds,
                    Price = booking.Room.Price,
                    IsCompleted = booking.Room.IsCompleted,
                    HomeId = booking.Room.HomeId,
                    Photo = booking.Room.Photo
                } : null,
                StartDate = booking.StartDate,
                EndDate = booking.EndDate,
                Amount = booking.Amount,
                PaymentMethod = booking.PaymentMethod.ToString(),
                Status = booking.Status.ToString(),
                CreatedAt = booking.CreatedAt,
                PaymentReference = booking.PaymentReference
            };

            return Ok(response);
        }

        [HttpGet("GetUserBookings/{userId}")]
        [Authorize(Roles ="User")]
        public async Task<IActionResult> GetUserBookings(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            var bookings = await _bookingRepository.GetUserBookings(userId);
            if (bookings.Count == 0)
                return NotFound("No bookings found for this user");

            var response = bookings.Select(booking => new
            {
                Id = booking.Id,
                UserId = booking.UserId,
                RoomId = booking.RoomId,
                Room = booking.Room != null ? new
                {
                    Id = booking.Room.Id,
                    Number = booking.Room.Number,
                    NumOfBeds = booking.Room.NumOfBeds,
                    Price = booking.Room.Price,
                    IsCompleted = booking.Room.IsCompleted,
                    HomeId = booking.Room.HomeId,
                    Photo = booking.Room.Photo
                } : null,
                StartDate = booking.StartDate,
                EndDate = booking.EndDate,
                Amount = booking.Amount,
                PaymentMethod = booking.PaymentMethod.ToString(),
                Status = booking.Status.ToString(),
                CreatedAt = booking.CreatedAt,
                PaymentReference = booking.PaymentReference
            });

            return Ok(response);
        }

        [HttpGet("GetPendingBookingsForOwner/{ownerId}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> GetPendingBookingsForOwner(string ownerId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || userId != ownerId)
                return Unauthorized("User is not authorized");

            var bookings = await _bookingRepository.GetPendingBookingsForOwner(ownerId);
            if (bookings.Count == 0)
                return NotFound("No pending bookings found for this owner");

            var response = bookings.Select(booking => new
            {
                Id = booking.Id,
                UserName = booking.User?.UserName,
                RoomId = booking.RoomId,
                Room = booking.Room != null ? new
                {
                    Id = booking.Room.Id,
                    Number = booking.Room.Number,
                    HomeId = booking.Room.HomeId,
                    IsCompleted = booking.Room.IsCompleted
                } : null,
                Status = booking.Status.ToString(),
                CreatedAt = booking.CreatedAt,
                Start=booking.StartDate,
                End=booking.EndDate,
            });

            return Ok(response);
        }

        [HttpPost("ConfirmBooking/{bookingId}")]
        [Authorize(Roles = "Owner")]

        public async Task<IActionResult> ConfirmBooking(Guid bookingId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            await _bookingRepository.ConfirmBooking(bookingId);

            var booking = await _context.Set<Booking>()
                .Include(b => b.Room)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            return Ok(new
            {
                message = "Booking confirmed successfully",
                RoomId = booking.RoomId,
                IsCompleted = booking.Room?.IsCompleted ?? false
            });
        }

        [HttpPost("CancelBooking/{bookingId}")]
        [Authorize(Roles = "Owner")]

        public async Task<IActionResult> CancelBooking(Guid bookingId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            await _bookingRepository.CancelBooking(bookingId);
            return Ok(new { message = "Booking cancelled successfully" });
        }

        [HttpGet("CheckRenewalEligibility/{userId}/{roomId}")]
        public async Task<IActionResult> CheckRenewalEligibility(string userId, int roomId)
        {
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User is not authorized");

            var now = DateTime.UtcNow;
            var booking = await _context.Set<Booking>()
                .Where(b => b.UserId == userId && b.RoomId == roomId &&
                            (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Paid) &&
                            b.EndDate > now)
                .OrderByDescending(b => b.EndDate)
                .FirstOrDefaultAsync();

            if (booking != null)
            {
                return Ok(new { canRenew = true });
            }
            else
            {
                return Ok(new { canRenew = false, message = "You cannot renew this room because you don't have an active booking." });
            }
        }

        // New endpoint to check ownership
        [HttpGet("CheckBookingOwnership/{ownerId}")]
        [Authorize(Roles = "Owner,User")]
        public IActionResult CheckBookingOwnership(string ownerId)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            if (userId != ownerId)
                return Unauthorized("You are not authorized to view this owner's bookings.");

            return Ok(new { message = "Ownership verified." });
        }
    }
}