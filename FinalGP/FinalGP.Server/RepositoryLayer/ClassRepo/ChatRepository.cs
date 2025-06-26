using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using FinalGP.Server.Controllers;
using Microsoft.AspNetCore.Identity;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class ChatRepository : GenericRepository<Chat>, IChatRepository
    {
        private readonly ESHContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private static readonly string[] FileExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt" };

        public ChatRepository(ESHContext context, UserManager<ApplicationUser> userManager) : base(context)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task SaveMessageAsync(Chat message)
        {
            message.Timestamp = message.Timestamp == default ? DateTime.Now : message.Timestamp;

            try
            {
                _context.Chats.Add(message);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DB Error: {ex.InnerException?.Message ?? ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<Chat>> GetMessagesAsync(string senderId, string receiverId)
        {
            var chatHistory = _context.Chats.Where(m =>
                (m.SenderId == senderId && m.ReceiverId == receiverId) ||
                (m.SenderId == receiverId && m.ReceiverId == senderId)
            );

            return await chatHistory.ToListAsync();
        }

        public async Task<List<Chat>> GetMessagesAsync(string senderId, string receiverId, int skip, int take)
        {
            var chatHistory = _context.Chats
                .Where(m =>
                    (m.SenderId == senderId && m.ReceiverId == receiverId) ||
                    (m.SenderId == receiverId && m.ReceiverId == senderId)
                )
                .OrderByDescending(m => m.Timestamp)
                .Skip(skip)
                .Take(take);

            return await chatHistory.ToListAsync();
        }

        public async Task<Chat> GetMessageByIdAsync(int messageId)
        {
            return await _context.Chats.FindAsync(messageId);
        }

        public async Task UpdateMessageAsync(Chat message)
        {
            _context.Chats.Update(message);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteMessageAsync(int messageId)
        {
            var message = await _context.Chats.FindAsync(messageId);
            if (message != null)
            {
                if (IsFileMessage(message.Message))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", message.Message?.TrimStart('/') ?? string.Empty);
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                    }
                }

                _context.Chats.Remove(message);
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateMessageStatusAsync(int messageId, MessageStatus status)
        {
            var message = await _context.Chats.FindAsync(messageId);
            if (message != null)
            {
                message.Status = status;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Chat>> GetUnreadMessagesAsync(string userId)
        {
            return await _context.Chats
                .Where(m => m.ReceiverId == userId && m.Status == MessageStatus.Sent)
                .ToListAsync();
        }

        private bool IsFileMessage(string? message)
        {
            if (string.IsNullOrEmpty(message))
                return false;

            if (!message.StartsWith("/Chat/", StringComparison.OrdinalIgnoreCase))
                return false;

            return FileExtensions.Any(ext => message.EndsWith(ext, StringComparison.OrdinalIgnoreCase));
        }

        public async Task<List<ChatConversationDto>> GetChatConversationsAsync(string userId)
        {
            var conversations = await _context.Chats
                .Where(c => c.SenderId == userId || c.ReceiverId == userId)
                .GroupBy(c => c.SenderId == userId ? c.ReceiverId : c.SenderId)
                .Select(g => new ChatConversationDto
                {
                    OtherUserId = g.Key,
                    LastMessage = g.OrderByDescending(c => c.Timestamp).FirstOrDefault().Message,
                    Timestamp = g.OrderByDescending(c => c.Timestamp).FirstOrDefault().Timestamp
                })
                .ToListAsync();

            foreach (var conv in conversations)
            {
                var user = await _userManager.FindByIdAsync(conv.OtherUserId);
                conv.OtherUserName = user?.UserName ?? "Unknown";
            }

            return conversations;
        }

        // دالة جديدة لحساب عدد المرسلين المختلفين اللي ليهم رسايل لم تُقرأ
        public async Task<int> GetUniqueSendersCountAsync(string userId)
        {
            var uniqueSenders = await _context.Chats
                .Where(m => m.ReceiverId == userId && m.Status != MessageStatus.Read)
                .Select(m => m.SenderId)
                .Distinct()
                .CountAsync();

            return uniqueSenders;
        }
    }
}