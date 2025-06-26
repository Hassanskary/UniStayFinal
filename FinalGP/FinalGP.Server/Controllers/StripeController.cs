using FinalGP.Data;
using FinalGP.DTOs;
using FinalGP.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    
    public class StripeController : ControllerBase
    {
        private readonly ESHContext _context;
        private readonly INotificationRepository _notRepo;

        public StripeController(ESHContext context, INotificationRepository notRepo)
        {
            _context = context;
            _notRepo = notRepo;
        }

        [HttpPost("CreateBookingWithStripe")]
        [Authorize(Roles ="User")]
        public async Task<IActionResult> CreateBookingWithStripe([FromBody] CreateBookingWithStripeDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not found in token" });

            // Validate dates
            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { message = "EndDate must be after StartDate." });

            var today = DateTime.UtcNow.Date;
            if (dto.StartDate.Date <= today)
                return BadRequest(new { message = "StartDate must be after today." });

            var days = (dto.EndDate - dto.StartDate).Days;
            if (days < 1 || days > 30)
                return BadRequest(new { message = "Booking duration must be between 1 and 30 days." });

            // Get room
            var room = await _context.Rooms.FindAsync(dto.RoomId);
            if (room == null)
                return NotFound(new { message = "Room not found." });

            // Get ownerId from room's home
            var home = await _context.Homes.FirstOrDefaultAsync(h => h.Id == room.HomeId);
            if (home == null)
                return NotFound(new { message = "Home not found for this room." });


            // Check for existing booking in the same home for another room
            var existingBookingInHome = await _context.Set<Booking>()
                .Include(b => b.Room) // Include Room to access HomeId
                .Where(b => b.UserId == userId && b.RoomId != dto.RoomId && b.Room.HomeId == room.HomeId &&
                            (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Paid) &&
                            b.EndDate >= DateTime.UtcNow)
                .AnyAsync();

            if (existingBookingInHome)
                throw new InvalidOperationException("You already have an active booking in this home for another room.");


            var ownerId = home.OwnerId;

            // Get user name
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var userName = user?.UserName ?? "Unknown User";

            if (dto.IsRenewal)
            {
                // Check for existing active booking
                var existingBooking = _context.Bookings
                    .Where(b => b.UserId == userId && b.RoomId == dto.RoomId &&
                                (b.Status == BookingStatus.Paid || b.Status == BookingStatus.Confirmed) &&
                                b.EndDate > DateTime.UtcNow)
                    .OrderByDescending(b => b.EndDate)
                    .FirstOrDefault();

                if (existingBooking == null)
                    return BadRequest(new { message = "No active booking found for renewal." });

                // Validate start date for renewal
                if (dto.StartDate <= existingBooking.EndDate)
                    return BadRequest(new { message = "StartDate for renewal must be after the current EndDate." });

                // Calculate total amount from original StartDate to new EndDate
                var totalDays = (dto.EndDate - existingBooking.StartDate).Days;
                var dailyPrice = room.Price / 30m;
                var totalAmount = dailyPrice * totalDays;

                // Calculate amount to charge (difference)
                var daysToCharge = (dto.EndDate - existingBooking.EndDate).Days;
                var amountToCharge = dailyPrice * daysToCharge;
                var amountInCents = (long)(amountToCharge * 100);

                if (amountInCents < 50)
                    return BadRequest(new { message = "Amount to charge must be at least 50 cents." });

                // Create Charge for the difference
                var chargeOptions = new ChargeCreateOptions
                {
                    Amount = amountInCents,
                    Currency = "usd",
                    Source = dto.TokenId,
                    Description = $"Renewal for booking {existingBooking.Id} by user {userId}"
                };
                var chargeService = new ChargeService();
                var charge = await chargeService.CreateAsync(chargeOptions);

                if (charge.Status != "succeeded")
                    return BadRequest(new { message = "Payment failed", detail = charge.FailureMessage });

                // Update existing booking
                existingBooking.EndDate = dto.EndDate;
                existingBooking.Amount = totalAmount; // Total amount from original start
                existingBooking.Status = BookingStatus.Paid;
                existingBooking.CreatedAt = DateTime.UtcNow;
                existingBooking.PaymentReference = charge.Id;

                await _context.SaveChangesAsync();

                // Send notification for renewal
                var renewalMessage = $"Renewal Stripe booking by user {userName} for room {dto.RoomId}";
                await _notRepo.CreateAndSendStripeBookingNotificationAsync(ownerId, userId, renewalMessage);

                return Ok(new { paymentReference = charge.Id });
            }
            else
            {
                // Check if room has available beds
                if (room.NumOfBeds <= 0)
                    return BadRequest(new { message = "No beds available in this room." });

                // Check previous bookings
                var previousBooking = _context.Bookings
                    .Where(b => b.UserId == userId && b.RoomId == dto.RoomId && b.Status == BookingStatus.Paid && b.PaymentMethod == PaymentMethod.Stripe)
                    .OrderByDescending(b => b.EndDate)
                    .FirstOrDefault();

                if (previousBooking != null && dto.StartDate <= previousBooking.EndDate)
                    return BadRequest(new { message = $"StartDate must be after the last booking's EndDate ({previousBooking.EndDate:yyyy-MM-dd})." });

                // Calculate price
                var dailyPrice = room.Price / 30m;
                var amountDecimal = dailyPrice * days;
                var amountInCents = (long)(amountDecimal * 100);

                if (amountInCents < 50)
                    return BadRequest(new { message = "Amount must be at least 50 cents." });

                // Create Charge using tokenId
                var chargeOptions = new ChargeCreateOptions
                {
                    Amount = amountInCents,
                    Currency = "usd",
                    Source = dto.TokenId,
                    Description = $"Booking room {dto.RoomId} by user {userId}"
                };
                var chargeService = new ChargeService();
                var charge = await chargeService.CreateAsync(chargeOptions);

                if (charge.Status != "succeeded")
                    return BadRequest(new { message = "Payment failed", detail = charge.FailureMessage });

                // Create booking
                var booking = new Booking
                {
                    UserId = userId,
                    RoomId = dto.RoomId,
                    OwnerId = ownerId,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    Amount = amountDecimal,
                    PaymentMethod = PaymentMethod.Stripe,
                    Status = BookingStatus.Paid,
                    CreatedAt = DateTime.UtcNow,
                    PaymentReference = charge.Id
                };

                _context.Bookings.Add(booking);

                room.NumOfBeds -= 1;

                if (room.NumOfBeds <= 0)
                {
                    room.IsCompleted = true;
                }

                await _context.SaveChangesAsync();

                // Send notification for new booking
                var newBookingMessage = $"New Stripe booking by user {userName} for room {dto.RoomId}";
                await _notRepo.CreateAndSendStripeBookingNotificationAsync(ownerId, userId, newBookingMessage);

                return Ok(new { paymentReference = charge.Id });
            }
        }
    
        [HttpPost("CreateCheckoutSession")]
        [Authorize]
        public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateBookingWithStripeDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not found in token" });

            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { message = "EndDate must be after StartDate." });

            var today = DateTime.UtcNow.Date;
            if (dto.StartDate.Date <= today)
                return BadRequest(new { message = "StartDate must be after today." });

            var days = (dto.EndDate - dto.StartDate).Days;
            if (days < 1 || days > 30)
                return BadRequest(new { message = "Booking duration must be between 1 and 30 days." });

            var room = await _context.Rooms.FindAsync(dto.RoomId);
            if (room == null)
                return NotFound(new { message = "Room not found." });

            var previousBooking = _context.Bookings
                .Where(b => b.UserId == userId && b.RoomId == dto.RoomId && b.Status == BookingStatus.Paid && b.PaymentMethod == PaymentMethod.Stripe)
                .OrderByDescending(b => b.EndDate)
                .FirstOrDefault();

            if (previousBooking != null && dto.StartDate <= previousBooking.EndDate)
                return BadRequest(new { message = $"StartDate must be after the last booking's EndDate ({previousBooking.EndDate:yyyy-MM-dd})." });

            var dailyPrice = room.Price / 30m;
            var amountDecimal = dailyPrice * days;
            var amountInCents = (long)(amountDecimal * 100);

            if (amountInCents < 50)
                return BadRequest(new { message = "Amount must be at least 50 cents." });

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = new List<string> { "card" },
                Mode = "payment",
                SuccessUrl = $"{dto.BaseUrl}/success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{dto.BaseUrl}/cancel",
                LineItems = new List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            UnitAmount = amountInCents,
                            Currency = "usd",
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = "Room Booking",
                            },
                        },
                        Quantity = 1,
                    },
                },
                Metadata = new Dictionary<string, string>
                {
                    { "roomId", dto.RoomId.ToString() },
                    { "userId", userId },
                    { "startDate", dto.StartDate.ToString("yyyy-MM-dd") },
                    { "endDate", dto.EndDate.ToString("yyyy-MM-dd") },
                },
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options);

            return Ok(new { sessionId = session.Id });
        }

        [HttpPost("CompleteBooking")]
        [Authorize]
        public async Task<IActionResult> CompleteBooking([FromBody] CompleteBookingDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not found in token" });

            var service = new SessionService();
            var session = await service.GetAsync(dto.SessionId);

            if (session.PaymentStatus != "paid")
                return BadRequest(new { message = "Payment not completed" });

            var roomId = int.Parse(session.Metadata["roomId"]);
            var startDate = DateTime.Parse(session.Metadata["startDate"]);
            var endDate = DateTime.Parse(session.Metadata["endDate"]);
            var amountDecimal = session.AmountTotal / 100m;

            var booking = new Booking
            {
                UserId = userId,
                RoomId = roomId,
                StartDate = startDate,
                EndDate = endDate,
                Amount = (decimal)amountDecimal,
                PaymentMethod = PaymentMethod.Stripe,
                Status = BookingStatus.Paid,
                CreatedAt = DateTime.UtcNow,
                PaymentReference = session.PaymentIntentId
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return Ok(new { bookingId = booking.Id });
        }

        [HttpGet("GetLatestPaidBooking")]
        [Authorize(Roles ="User")]
        public async Task<IActionResult> GetLatestPaidBooking(int roomId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not found in token" });

            var latestBooking = _context.Bookings
                .Where(b => b.UserId == userId && b.RoomId == roomId &&
                           (b.Status == BookingStatus.Paid || b.Status == BookingStatus.Confirmed))
                .OrderByDescending(b => b.EndDate)
                .FirstOrDefault();

            if (latestBooking == null)
                return Ok(new { endDate = (string)null, status = (string)null });

            return Ok(new { endDate = latestBooking.EndDate.ToString("yyyy-MM-dd"), status = latestBooking.Status.ToString() });
        }

    }
}