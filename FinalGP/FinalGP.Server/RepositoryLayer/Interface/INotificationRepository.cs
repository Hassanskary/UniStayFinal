using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.Interface
{
    public interface INotificationRepository : IGenericRepository<Notification>
    {
        Task CreateAndSendNotificationAsync(List<string> ownerId, Home home, string message);
        Task CreateAndSendBookingNotificationAsync(string ownerId, string userId, string message);
        Task CreateAndSendStripeBookingNotificationAsync(string ownerId, string userId, string message);
        Task MarkAsReadedAsync(int notificationId);
        Task<List<Notification>> GetUnreadNotificationsAsync(string userId);
        Task<(List<Notification> Notifications, int TotalCount)> GetPagedUnreadNotificationsAsync(string userId, int page, int pageSize);
        Task CreateAndSendCashBookingNotificationAsync(string ownerId, string userId, string message);
        Task CreateAndSendBookingStatusNotificationAsync(string userId, string ownerName, int roomId, string v, bool wasRenewal);
        Task CreateAndSendReportNotificationAsync(List<string> lst, string userId, int homeId, string message);
        Task CreateAndSendReportResolvedNotificationAsync(List<string> userIdsWhoReported, string adminId, int homeId, string userMessage);
        Task CreateAndSendReportRejectedNotificationAsync(List<string> userIdsWhoReported, string? adminId, int homeId, string userMessage);
        Task MarkAllAsReadAsync(string userId);
        Task<(List<Notification> Notifications, int TotalCount)> GetPagedAllNotificationsAsync(string userId, int page, int pageSize);
    }
}