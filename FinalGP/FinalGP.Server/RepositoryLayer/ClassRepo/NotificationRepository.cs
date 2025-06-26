using FinalGP.Data;
using FinalGP.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class NotificationRepository : GenericRepository<Notification>, INotificationRepository
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ESHContext _context;

    public NotificationRepository(ESHContext context, IHubContext<NotificationHub> hubContext)
        : base(context)
    {
        _hubContext = hubContext;
        _context = context;
    }

    public async Task CreateAndSendNotificationAsync(List<string> adminIds, Home home, string message)
    {
        if (adminIds == null || adminIds.Count == 0)
        {
            Console.WriteLine("No admin IDs provided.");
            return;
        }

        var validAdminIds = await _context.Admins
            .Where(a => adminIds.Contains(a.Id))
            .Select(a => a.Id)
            .ToListAsync();
        Console.WriteLine($"Valid Admin IDs: {string.Join(", ", validAdminIds)}");

        if (!validAdminIds.Any())
        {
            Console.WriteLine("No valid admins found.");
            return;
        }

        foreach (var adminId in validAdminIds)
        {
            var n = new Notification
            {
                UserId = adminId,
                Message = message,
                OwnerId = home.OwnerId,
                Date = DateTime.UtcNow,
                IsRead = false
            };
            Insert(n);
        }

        try
        {
            await SaveAsync();
            Console.WriteLine("Notifications saved to database.");

            foreach (var adminId in validAdminIds)
            {
                await _hubContext.Clients.Group(adminId)
                    .SendAsync("ReceiveHomeAddedNotification", new
                    {
                        Message = message,
                        HomeId = home.Id,
                        OwnerId = home.OwnerId,
                        Submitted = home.CreatedAt
                    });
                Console.WriteLine($"Notification sent via SignalR to group {adminId}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending notification: {ex.Message}");
            throw;
        }
    }

    public async Task CreateAndSendBookingNotificationAsync(string ownerId, string userId, string message)
    {
        if (string.IsNullOrEmpty(ownerId))
            return;

        var notification = new Notification
        {
            UserId = ownerId,
            Message = message,
            OwnerId = userId,
            Date = DateTime.UtcNow,
            IsRead = false
        };

        Insert(notification);
        Save();

        try
        {
            await _hubContext.Clients.Group(ownerId)
                .SendAsync("ReceiveBookingNotification", notification);
        }
        catch
        {
            // Log if needed, but don't throw
        }
    }

    public async Task CreateAndSendStripeBookingNotificationAsync(string ownerId, string userId, string message)
    {
        if (string.IsNullOrEmpty(ownerId))
            return;

        var notification = new Notification
        {
            UserId = ownerId,
            Message = message,
            OwnerId = userId,
            Date = DateTime.UtcNow,
            IsRead = false
        };

        Insert(notification);
        await SaveAsync();

        try
        {
            await _hubContext.Clients.Group(ownerId)
                .SendAsync("ReceiveBookingNotification", notification);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending Stripe booking notification: {ex.Message}");
        }
    }

    public async Task CreateAndSendCashBookingNotificationAsync(string ownerId, string userId, string message)
    {
        if (string.IsNullOrEmpty(ownerId))
        {
            Console.WriteLine("OwnerId is null or empty, skipping cash notification.");
            return;
        }

        var notification = new Notification
        {
            UserId = ownerId,
            Message = message,
            OwnerId = userId,
            Date = DateTime.UtcNow,
            IsRead = false
        };

        Insert(notification);
        await SaveAsync();
        Console.WriteLine($"Cash notification saved for ownerId: {ownerId}, userId: {userId}, message: {message}");

        const int maxRetries = 3;
        const int delayMs = 2000; // 2-second delay between retries

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                Console.WriteLine($"Attempt {attempt}: Sending cash notification via SignalR to group {ownerId}");
                await _hubContext.Clients.Group(ownerId)
                    .SendAsync("ReceiveBookingNotification", new
                    {
                        id = notification.Id,
                        message = notification.Message,
                        time = notification.Date.ToString("o") // ISO 8601 format
                    });
                Console.WriteLine($"Successfully sent cash notification via SignalR to group {ownerId}");
                return; // Success, exit retry loop
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Attempt {attempt} failed: Error sending cash notification to group {ownerId}: {ex.Message}");
                if (attempt == maxRetries)
                {
                    Console.WriteLine($"Failed to send cash notification to group {ownerId} after {maxRetries} attempts.");
                    return; // Log failure and exit
                }
                await Task.Delay(delayMs); // Wait before retrying
            }
        }
    }

    public async Task CreateAndSendBookingStatusNotificationAsync(string userId, string ownerName, int roomId, string status, bool isRenewal)
    {
        if (string.IsNullOrEmpty(userId))
        {
            Console.WriteLine("UserId is null or empty, skipping booking status notification.");
            return;
        }

        string message = isRenewal
            ? status == "Confirmed"
                ? $"Your renewal booking for room {roomId} has been confirmed by owner {ownerName}."
                : $"Your renewal booking for room {roomId} has been canceled by owner {ownerName}."
            : status == "Confirmed"
                ? $"Your booking for room {roomId} has been confirmed by owner {ownerName}."
                : $"Your booking for room {roomId} has been canceled by owner {ownerName}.";

        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            Date = DateTime.UtcNow,
            IsRead = false
        };

        Insert(notification);
        await SaveAsync();
        Console.WriteLine($"Booking status notification saved for userId: {userId}, message: {message}");

        const int maxRetries = 3;
        const int delayMs = 2000; // 2-second delay between retries

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                Console.WriteLine($"Attempt {attempt}: Sending booking status notification via SignalR to group {userId}");
                await _hubContext.Clients.Group(userId)
                    .SendAsync("ReceiveBookingStatusNotification", new
                    {
                        id = notification.Id,
                        message = notification.Message,
                        time = notification.Date.ToString("o") // ISO 8601 format
                    });
                Console.WriteLine($"Successfully sent booking status notification via SignalR to group {userId}");
                return; // Success, exit retry loop
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Attempt {attempt} failed: Error sending booking status notification to group {userId}: {ex.Message}");
                if (attempt == maxRetries)
                {
                    Console.WriteLine($"Failed to send booking status notification to group {userId} after {maxRetries} attempts.");
                    return; // Log failure and exit
                }
                await Task.Delay(delayMs); // Wait before retrying
            }
        }
    }

    public async Task MarkAsReadedAsync(int notificationId)
    {
        var notif = await _context.Notifications.FindAsync(notificationId);
        if (notif == null)
            throw new KeyNotFoundException($"Notification {notificationId} not found.");

        if (!notif.IsRead)
        {
            notif.IsRead = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(string userId)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        if (unreadNotifications.Any())
        {
            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<Notification>> GetUnreadNotificationsAsync(string userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.Date)
            .ToListAsync();
    }

    public async Task<(List<Notification> Notifications, int TotalCount)> GetPagedUnreadNotificationsAsync(string userId, int page, int pageSize)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.Date);

        var totalCount = await query.CountAsync();
        var notifications = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (notifications, totalCount);
    }

    public async Task<(List<Notification> Notifications, int TotalCount)> GetPagedAllNotificationsAsync(string userId, int page, int pageSize)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.Date);

        var totalCount = await query.CountAsync();
        var notifications = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (notifications, totalCount);
    }

    public async Task CreateAndSendReportNotificationAsync(List<string> targetIds, string senderId, int homeId, string message)
    {
        if (targetIds == null || targetIds.Count == 0)
            return;

        foreach (var targetId in targetIds)
        {
            var notification = new Notification
            {
                UserId = targetId,
                Message = message,
                OwnerId = senderId,
                Date = DateTime.UtcNow,
                IsRead = false
            };
            Insert(notification);
        }
        await SaveAsync();

        try
        {
            await _hubContext.Clients.Groups(targetIds)
                .SendAsync("ReceiveReportNotification", new
                {
                    Message = message,
                    HomeId = homeId,
                    SenderId = senderId,
                    Time = DateTime.UtcNow.ToString("o")
                });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending report notification: {ex.Message}");
        }
    }

    public async Task CreateAndSendReportResolvedNotificationAsync(List<string> targetIds, string adminId, int homeId, string message)
    {
        if (targetIds == null || targetIds.Count == 0)
            return;

        foreach (var targetId in targetIds)
        {
            var notification = new Notification
            {
                UserId = targetId,
                Message = message,
                OwnerId = adminId,
                Date = DateTime.UtcNow,
                IsRead = false
            };
            Insert(notification);
        }
        await SaveAsync();

        try
        {
            await _hubContext.Clients.Groups(targetIds)
                .SendAsync("ReceiveReportResolvedNotification", new
                {
                    Message = message,
                    HomeId = homeId,
                    AdminId = adminId,
                    Time = DateTime.UtcNow.ToString("o")
                });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending report resolved notification: {ex.Message}");
        }
    }

    public async Task CreateAndSendReportRejectedNotificationAsync(List<string> targetIds, string adminId, int homeId, string message)
    {
        if (targetIds == null || targetIds.Count == 0)
            return;

        foreach (var targetId in targetIds)
        {
            var notification = new Notification
            {
                UserId = targetId,
                Message = message,
                OwnerId = adminId,
                Date = DateTime.UtcNow,
                IsRead = false
            };
            Insert(notification);
        }
        await SaveAsync();

        try
        {
            await _hubContext.Clients.Groups(targetIds)
                .SendAsync("ReceiveReportRejectedNotification", new
                {
                    Message = message,
                    HomeId = homeId,
                    AdminId = adminId,
                    Time = DateTime.UtcNow.ToString("o")
                });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending report rejected notification: {ex.Message}");
        }
    }

    private async Task SaveAsync()
    {
        await _context.SaveChangesAsync();
    }
}