using Microsoft.AspNetCore.SignalR;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Interface;
using System.Collections.Concurrent;
using System;
using Microsoft.AspNetCore.Identity;
using FinalGP.Server.Controllers;
using System.Threading.Tasks;
using System.Linq;

namespace FinalGP.Server.Hubs
{
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<string, string> OnlineUsers
            = new ConcurrentDictionary<string, string>();

        private readonly IChatRepository _chatRepo;
        private readonly UserManager<ApplicationUser> _userMgr;

        public ChatHub(IChatRepository repo, UserManager<ApplicationUser> userMgr)
        {
            _chatRepo = repo;
            _userMgr = userMgr;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            Console.WriteLine($"User connected: ConnectionId={Context.ConnectionId}, UserId={userId}");
            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers[Context.ConnectionId] = userId;
                await Clients.All.SendAsync("UserOnlineStatus", userId, true);
                await MarkMessagesAsDelivered(userId);
                // إرسال العداد الأولي لعدد المرسلين المختلفين عند الاتصال
                await UpdateChatCounter(userId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception ex)
        {
            if (OnlineUsers.TryRemove(Context.ConnectionId, out var userId))
            {
                Console.WriteLine($"User disconnected: ConnectionId={Context.ConnectionId}, UserId={userId}");
                await Clients.All.SendAsync("UserOnlineStatus", userId, false);
            }
            await base.OnDisconnectedAsync(ex);
        }

        public async Task SendMessage(Chat message)
        {
            try
            {
                Console.WriteLine($"SendMessage: SenderId={message.SenderId}, ReceiverId={message.ReceiverId}, Message={message.Message}");
                message.Timestamp = DateTime.UtcNow;
                message.Status = MessageStatus.Sent;

                await _chatRepo.SaveMessageAsync(message);
                await Clients.Caller.SendAsync("ReceiveMessage", message);

                if (OnlineUsers.Values.Contains(message.ReceiverId))
                {
                    message.Status = MessageStatus.Delivered;
                    await _chatRepo.UpdateMessageStatusAsync(message.Id, MessageStatus.Delivered);
                    await Clients.User(message.ReceiverId).SendAsync("ReceiveMessage", message);
                    await Clients.User(message.SenderId).SendAsync("MessageStatusUpdated", message.Id, (int)MessageStatus.Delivered);
                }

                // حساب عدد الرسائل غير المقروءة للمستلم
                var receiverMessages = await _chatRepo.GetMessagesAsync(message.SenderId, message.ReceiverId);
                int receiverUnreadCount = receiverMessages.Count(m => m.ReceiverId == message.ReceiverId && m.Status != MessageStatus.Read);

                // حساب عدد الرسائل غير المقروءة للمرسل
                var senderMessages = await _chatRepo.GetMessagesAsync(message.ReceiverId, message.SenderId);
                int senderUnreadCount = senderMessages.Count(m => m.ReceiverId == message.SenderId && m.Status != MessageStatus.Read);

                // إنشاء DTO للمرسل والمستلم
                var senderDto = new ChatConversationDto
                {
                    OtherUserId = message.ReceiverId,
                    OtherUserName = (await _userMgr.FindByIdAsync(message.ReceiverId))?.UserName,
                    LastMessage = message.Message,
                    Timestamp = message.Timestamp,
                    UnreadCount = senderUnreadCount,
                    UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.SenderId)
                };

                var receiverDto = new ChatConversationDto
                {
                    OtherUserId = message.SenderId,
                    OtherUserName = (await _userMgr.FindByIdAsync(message.SenderId))?.UserName,
                    LastMessage = message.Message,
                    Timestamp = message.Timestamp,
                    UnreadCount = receiverUnreadCount,
                    UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.ReceiverId)
                };

                await Clients.User(message.SenderId).SendAsync("UpdateChatList", senderDto);
                await Clients.User(message.ReceiverId).SendAsync("UpdateChatList", receiverDto);

                // تحديث العداد لكل من المرسل والمستلم
                await UpdateChatCounter(message.SenderId);
                await UpdateChatCounter(message.ReceiverId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SendMessage: {ex.Message}\n{ex.StackTrace}");
            }
        }

        public async Task MarkAsRead(int messageId, string userId)
        {
            var message = await _chatRepo.GetMessageByIdAsync(messageId);
            if (message != null && message.ReceiverId == userId && message.Status != MessageStatus.Read)
            {
                message.Status = MessageStatus.Read;
                await _chatRepo.UpdateMessageStatusAsync(messageId, MessageStatus.Read);
                await Clients.User(message.SenderId).SendAsync("MessageStatusUpdated", messageId, (int)MessageStatus.Read);
                await Clients.User(message.ReceiverId).SendAsync("MessageStatusUpdated", messageId, (int)MessageStatus.Read);

                // تحديث عدد الرسائل غير المقروءة
                var messages = await _chatRepo.GetMessagesAsync(message.SenderId, message.ReceiverId);
                int unreadCount = messages.Count(m => m.ReceiverId == userId && m.Status != MessageStatus.Read);

                var updatedDto = new ChatConversationDto
                {
                    OtherUserId = message.SenderId,
                    OtherUserName = (await _userMgr.FindByIdAsync(message.SenderId))?.UserName,
                    LastMessage = messages.OrderByDescending(m => m.Timestamp).FirstOrDefault()?.Message,
                    Timestamp = messages.OrderByDescending(m => m.Timestamp).FirstOrDefault()?.Timestamp ?? DateTime.UtcNow,
                    UnreadCount = unreadCount,
                    UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(userId)
                };

                await Clients.User(userId).SendAsync("UpdateChatList", updatedDto);

                // تحديث العداد بعد قراءة الرسالة
                await UpdateChatCounter(userId);
            }
        }

        private async Task MarkMessagesAsDelivered(string userId)
        {
            var messages = await _chatRepo.GetUnreadMessagesAsync(userId);
            foreach (var message in messages)
            {
                message.Status = MessageStatus.Delivered;
                await _chatRepo.UpdateMessageStatusAsync(message.Id, MessageStatus.Delivered);
                await Clients.User(message.SenderId).SendAsync("MessageStatusUpdated", message.Id, (int)MessageStatus.Delivered);
            }
            // تحديث العداد بعد التسليم
            await UpdateChatCounter(userId);
        }

        // دالة لتحديث العداد وإرساله للـ frontend
        private async Task UpdateChatCounter(string userId)
        {
            int uniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(userId);
            await Clients.User(userId).SendAsync("UpdateChatCounter", uniqueSendersCount);
        }

        // دالة لإعادة تعيين العداد لما اليوزر يدخل صفحة الشات
        public async Task ResetChatCounter(string userId)
        {
            var unreadMessages = await _chatRepo.GetUnreadMessagesAsync(userId);
            foreach (var message in unreadMessages)
            {
                message.Status = MessageStatus.Read;
                await _chatRepo.UpdateMessageStatusAsync(message.Id, MessageStatus.Read);
                await Clients.User(message.SenderId).SendAsync("MessageStatusUpdated", message.Id, (int)MessageStatus.Read);
            }
            await Clients.User(userId).SendAsync("UpdateChatCounter", 0);
        }

        public async Task Typing(string receiverId)
        {
            Console.WriteLine($"Typing: SenderId={Context.UserIdentifier}, ReceiverId={receiverId}");
            await Clients.User(receiverId).SendAsync("UserTyping", Context.UserIdentifier);
        }

        public async Task StopTyping(string receiverId)
        {
            Console.WriteLine($"StopTyping: SenderId={Context.UserIdentifier}, ReceiverId={receiverId}");
            await Clients.User(receiverId).SendAsync("UserStoppedTyping", Context.UserIdentifier);
        }

        public async Task SendOnlineStatus(string userId)
        {
            Console.WriteLine($"SendOnlineStatus: Requested for UserId={userId}");
            var online = OnlineUsers.Values.Contains(userId);
            await Clients.Caller.SendAsync("UserOnlineStatus", userId, online);
        }

        public async Task EditMessage(int messageId, string newContent)
        {
            try
            {
                var message = await _chatRepo.GetMessageByIdAsync(messageId);
                if (message == null || message.SenderId != Context.UserIdentifier)
                {
                    await Clients.Caller.SendAsync("Error", "Message not found or you don't have permission to edit it.");
                    return;
                }

                message.Message = newContent;
                message.Timestamp = DateTime.UtcNow;
                await _chatRepo.UpdateMessageAsync(message);

                await Clients.User(message.SenderId).SendAsync("MessageEdited", message);
                await Clients.User(message.ReceiverId).SendAsync("MessageEdited", message);

                // تحديث عدد الرسائل غير المقروءة
                var messages = await _chatRepo.GetMessagesAsync(message.SenderId, message.ReceiverId);
                int senderUnreadCount = messages.Count(m => m.ReceiverId == message.SenderId && m.Status != MessageStatus.Read);
                int receiverUnreadCount = messages.Count(m => m.ReceiverId == message.ReceiverId && m.Status != MessageStatus.Read);

                var senderDto = new ChatConversationDto
                {
                    OtherUserId = message.ReceiverId,
                    OtherUserName = (await _userMgr.FindByIdAsync(message.ReceiverId))?.UserName,
                    LastMessage = message.Message,
                    Timestamp = message.Timestamp,
                    UnreadCount = senderUnreadCount,
                    UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.SenderId)
                };

                var receiverDto = new ChatConversationDto
                {
                    OtherUserId = message.SenderId,
                    OtherUserName = (await _userMgr.FindByIdAsync(message.SenderId))?.UserName,
                    LastMessage = message.Message,
                    Timestamp = message.Timestamp,
                    UnreadCount = receiverUnreadCount,
                    UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.ReceiverId)
                };

                await Clients.User(message.SenderId).SendAsync("UpdateChatList", senderDto);
                await Clients.User(message.ReceiverId).SendAsync("UpdateChatList", receiverDto);

                // تحديث العداد بعد التعديل
                await UpdateChatCounter(message.SenderId);
                await UpdateChatCounter(message.ReceiverId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in EditMessage: {ex.Message}\n{ex.StackTrace}");
                await Clients.Caller.SendAsync("Error", "Failed to edit message.");
            }
        }

        public async Task DeleteMessage(int messageId)
        {
            try
            {
                var message = await _chatRepo.GetMessageByIdAsync(messageId);
                if (message == null || message.SenderId != Context.UserIdentifier)
                {
                    await Clients.Caller.SendAsync("Error", "Message not found or you don't have permission to delete it.");
                    return;
                }

                await _chatRepo.DeleteMessageAsync(messageId);

                await Clients.User(message.SenderId).SendAsync("MessageDeleted", messageId);
                await Clients.User(message.ReceiverId).SendAsync("MessageDeleted", messageId);

                var remainingMessages = await _chatRepo.GetMessagesAsync(message.SenderId, message.ReceiverId);

                if (!remainingMessages.Any())
                {
                    await Clients.User(message.SenderId).SendAsync("RemoveFromChatList", message.ReceiverId);
                    await Clients.User(message.ReceiverId).SendAsync("RemoveFromChatList", message.SenderId);
                }
                else
                {
                    var lastMessage = remainingMessages.OrderByDescending(m => m.Timestamp).First();

                    int senderUnreadCount = remainingMessages.Count(m => m.ReceiverId == message.SenderId && m.Status != MessageStatus.Read);
                    int receiverUnreadCount = remainingMessages.Count(m => m.ReceiverId == message.ReceiverId && m.Status != MessageStatus.Read);

                    var senderDto = new ChatConversationDto
                    {
                        OtherUserId = message.ReceiverId,
                        OtherUserName = (await _userMgr.FindByIdAsync(message.ReceiverId))?.UserName,
                        LastMessage = lastMessage.Message,
                        Timestamp = lastMessage.Timestamp,
                        UnreadCount = senderUnreadCount,
                        UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.SenderId)
                    };

                    var receiverDto = new ChatConversationDto
                    {
                        OtherUserId = message.SenderId,
                        OtherUserName = (await _userMgr.FindByIdAsync(message.SenderId))?.UserName,
                        LastMessage = lastMessage.Message,
                        Timestamp = lastMessage.Timestamp,
                        UnreadCount = receiverUnreadCount,
                        UniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(message.ReceiverId)
                    };

                    await Clients.User(message.SenderId).SendAsync("UpdateChatList", senderDto);
                    await Clients.User(message.ReceiverId).SendAsync("UpdateChatList", receiverDto);
                }

                // تحديث العداد بعد الحذف
                await UpdateChatCounter(message.SenderId);
                await UpdateChatCounter(message.ReceiverId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteMessage: {ex.Message}\n{ex.StackTrace}");
                await Clients.Caller.SendAsync("Error", "Failed to delete message.");
            }
        }
    }
}