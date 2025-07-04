using FinalGP.Data;
using FinalGP.DTO;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.Server.DTO.Book;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class BookingRepository : GenericRepository<Booking>, IBookingRepository
    {
        private readonly ESHContext _context;
        private readonly IRoomRepository _roomRepository;
        private readonly INotificationRepository _notificationRepository;

        public BookingRepository(
            ESHContext context,
            IRoomRepository roomRepository, INotificationRepository notificationRepository) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _roomRepository = roomRepository ?? throw new ArgumentNullException(nameof(roomRepository));
            _notificationRepository = notificationRepository;

        }

        public async Task CreateBookingWithCash(string userId, CashBookingDto dto)
        {
            if (string.IsNullOrEmpty(userId) || dto == null)
                throw new ArgumentException("Invalid data");

            if (dto.StartDate == default || dto.EndDate == default)
                throw new ArgumentException("StartDate and EndDate are required");

            var room = await _roomRepository.GetRoomById(dto.RoomId);
            if (room == null)
                throw new InvalidOperationException("Room not found");

            var existingBooking = await _context.Set<Booking>()
                .Where(b => b.UserId == userId && b.RoomId == dto.RoomId &&
                            (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Paid) &&
                            b.EndDate >= DateTime.UtcNow)
                .OrderByDescending(b => b.EndDate)
                .FirstOrDefaultAsync();

            var home = await _context.Homes
                .Include(h => h.Owner)
                .FirstOrDefaultAsync(h => h.Id == room.HomeId);

            // Validate that home and owner exist
            if (home == null || home.Owner == null)
                throw new InvalidOperationException("Home or owner not found for the room");

            if (existingBooking != null)
            {
                // تجديد الحجز الموجود حتى لو الغرفة مكتملة
                existingBooking.EndDate = dto.EndDate;

                var diffTime = existingBooking.EndDate - existingBooking.StartDate;
                var diffDays = (int)diffTime.TotalDays;
                decimal dailyPrice = room.Price / 30;
                existingBooking.Amount = dailyPrice * diffDays;
                existingBooking.CreatedAt = DateTime.UtcNow;
                existingBooking.OwnerId = home.Owner.Id; // Ensure OwnerId is updated during renewal

                Update(existingBooking);
                Save();
                Console.WriteLine($"Booking updated with ID: {existingBooking.Id} for user {userId} and room {dto.RoomId}");
            }
            else
            {
                // إنشاء حجز جديد، بس لو الغرفة مش مكتملة
                if (room.IsCompleted)
                    throw new InvalidOperationException("Room is not available for new bookings");

                var start = dto.StartDate;
                var end = dto.EndDate;
                var diffTime = end - start;
                var diffDays = (int)diffTime.TotalDays;

                decimal amount;
                if (diffDays < 30)
                {
                    decimal dailyPrice = room.Price / 30;
                    amount = dailyPrice * diffDays;
                }
                else
                {
                    amount = room.Price;
                }

                var booking = new Booking
                {
                    UserId = userId,
                    RoomId = dto.RoomId,
                    OwnerId = home.Owner.Id, // Ensure OwnerId is set for new bookings
                    Amount = amount,
                    PaymentMethod = PaymentMethod.CashOnArrival,
                    Status = BookingStatus.Pending,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    CreatedAt = DateTime.UtcNow
                };

                try
                {
                    Insert(booking);
                    Save();
                    Console.WriteLine($"Booking created with ID: {booking.Id} for user {userId} and room {dto.RoomId}");
                }
                catch (Exception)
                {
                    throw;
                }
            }

            _roomRepository.Update(room);
            _roomRepository.Save();
        }

        private async Task UpdateExpiredBookings()
        {
            try
            {
                var now = DateTime.UtcNow;
                var bookingsToUpdate = await _context.Set<Booking>()
                    .Where(b => b.Status == BookingStatus.Pending && b.CreatedAt.AddDays(2) <= now)
                    .ToListAsync();

                if (bookingsToUpdate.Count > 0)
                {
                    foreach (var booking in bookingsToUpdate)
                    {
                        booking.Status = BookingStatus.Expired;
                        Update(booking);
                        Console.WriteLine($"Booking {booking.Id} has been updated to Expired.");
                    }
                    Save();
                }
            }
            catch (Exception)
            {
            }
        }

        public async Task<Booking> GetLatestBooking(string userId, int roomId)
        {
            await UpdateExpiredBookings();

            Console.WriteLine($"Fetching latest booking for user {userId} and room {roomId}");
            var booking = await _context.Set<Booking>()
                .Include(b => b.Room)
                .Where(b => b.UserId == userId && b.RoomId == roomId)
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            if (booking == null)
            {
                Console.WriteLine($"No booking found for user {userId} and room {roomId}");
                return null;
            }

            Console.WriteLine($"Booking found: ID {booking.Id}, Status {booking.Status}");
            return booking;
        }

        public async Task<List<Booking>> GetUserBookings(string userId)
        {
            await UpdateExpiredBookings();

            Console.WriteLine($"Fetching bookings for user {userId}");
            var bookings = await _context.Set<Booking>()
                .Include(b => b.Room)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            if (bookings.Count == 0)
            {
                Console.WriteLine($"No bookings found for user {userId}");
                return new List<Booking>();
            }

            Console.WriteLine($"Found {bookings.Count} bookings for user {userId}");
            return bookings;
        }

        public async Task<List<Booking>> GetPendingBookingsForOwner(string ownerId)
        {
            await UpdateExpiredBookings();

            Console.WriteLine($"Fetching pending bookings for owner {ownerId}");

            var bookings = await _context.Set<Booking>()
                .Include(b => b.User)
                .Include(b => b.Room)
                .Where(b => b.OwnerId == ownerId &&
                            (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Renewed))
                .ToListAsync();

            if (bookings.Count == 0)
            {
                Console.WriteLine($"No pending bookings found for owner {ownerId}");
                return new List<Booking>();
            }

            Console.WriteLine($"Found {bookings.Count} pending bookings for owner {ownerId}");
            return bookings;
        }

        public async Task ConfirmBooking(Guid bookingId)
        {
            var booking = await _context.Set<Booking>()
                .Include(b => b.Room)
                .Include(b => b.User)
                .Include(b => b.Owner)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null)
                throw new InvalidOperationException("Booking not found");

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Renewed)
                throw new InvalidOperationException("Only pending or renewed bookings can be confirmed");

            if (booking.Status == BookingStatus.Pending && booking.Room != null)
            {
                booking.Room.NumOfBeds -= 1;
                if (booking.Room.NumOfBeds <= 0)
                {
                    booking.Room.IsCompleted = true;
                }
                _roomRepository.Update(booking.Room);
            }

            var wasRenewal = booking.Status == BookingStatus.Renewed; // Store before changing status
            booking.Status = BookingStatus.Confirmed;
            Update(booking);
            await SaveAsync();
            Console.WriteLine($"Booking {bookingId} has been confirmed successfully.");

            // Send notification to the user
            var ownerName = booking.Owner?.UserName ?? "Unknown Owner";
            await _notificationRepository.CreateAndSendBookingStatusNotificationAsync(
                booking.UserId,
                ownerName,
                booking.RoomId,
                "Confirmed",
                wasRenewal
            );
        }


        public async Task CancelBooking(Guid bookingId)
        {
            var booking = await _context.Set<Booking>()
                .Include(b => b.User)
                .Include(b => b.Owner)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null)
                throw new InvalidOperationException("Booking not found");

            if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Renewed)
                throw new InvalidOperationException("Only pending or renewed bookings can be cancelled");

            var wasRenewal = booking.Status == BookingStatus.Renewed; // Store before changing status
            booking.Status = BookingStatus.Cancelled;
            Update(booking);
            await SaveAsync();
            Console.WriteLine($"Booking {bookingId} has been cancelled successfully.");

            // Send notification to the user
            var ownerName = booking.Owner?.UserName ?? "Unknown Owner";
            await _notificationRepository.CreateAndSendBookingStatusNotificationAsync(
                booking.UserId,
                ownerName,
                booking.RoomId,
                "Canceled",
                wasRenewal
            );
        }

        public async Task SaveAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}