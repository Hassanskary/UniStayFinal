using Microsoft.AspNetCore.SignalR;

namespace FinalGP.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly INotificationRepository notificationRepository;

        public NotificationHub(INotificationRepository notrepo)
        {
            notificationRepository = notrepo;
        }

        // Method to associate the connection with the userId and add to a group
        public async Task SetUserId(string userId)
        {
            // Log the association
            Console.WriteLine($"UserId {userId} connected with ConnectionId {Context.ConnectionId}");
            // Add the user to a group based on their userId
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            Console.WriteLine($"UserId {userId} added to group {userId}");
        }

        public override Task OnConnectedAsync()
        {
            Console.WriteLine($"Client connected: {Context.ConnectionId}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }
    }
}