using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinalGP.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationRepository _notificationRepo;

        public NotificationController(INotificationRepository notificationRepository)
        {
            _notificationRepo = notificationRepository;
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                await _notificationRepo.MarkAsReadedAsync(id);
                return Ok(new { Message = "Notification marked as read." });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { Error = "Notification not found." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = "Unable to mark notification as read.", Details = ex.Message });
            }
        }

        [HttpPost("MarkAllAsRead")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            await _notificationRepo.MarkAllAsReadAsync(userId);
            return Ok(new { Message = "All notifications marked as read." });
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnread([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Console.WriteLine($"UserId from Token in GetUnread: {userId}");
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            Console.WriteLine($"Fetching unread notifications for userId: {userId}, Page: {page}, PageSize: {pageSize}");
            var (notifications, totalCount) = await _notificationRepo.GetPagedUnreadNotificationsAsync(userId, page, pageSize);
            return Ok(new { Notifications = notifications, TotalCount = totalCount });
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            var (notifications, totalCount) = await _notificationRepo.GetPagedAllNotificationsAsync(userId, page, pageSize);
            return Ok(new { Notifications = notifications, TotalCount = totalCount });
        }
    }
}