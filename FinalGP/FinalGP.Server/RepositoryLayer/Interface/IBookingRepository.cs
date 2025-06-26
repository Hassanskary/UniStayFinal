using FinalGP.DTO;
using FinalGP.Models;
using FinalGP.Server.DTO.Book;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.Interface
{
    public interface IBookingRepository : IGenericRepository<Booking>
    {
        Task CreateBookingWithCash(string userId, CashBookingDto dto);
        Task<Booking> GetLatestBooking(string userId, int roomId);
        Task<List<Booking>> GetUserBookings(string userId);
        Task<List<Booking>> GetPendingBookingsForOwner(string ownerId);
        Task ConfirmBooking(Guid bookingId);
        Task CancelBooking(Guid bookingId);
        Task SaveAsync(); // تأكد إنها public
    }
}