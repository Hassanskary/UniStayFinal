using FinalGP.Models;
using FinalGP.Server.Controllers;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.Interface
{
    public interface IChatRepository : IGenericRepository<Chat>
    {
        Task SaveMessageAsync(Chat message);
        Task<IEnumerable<Chat>> GetMessagesAsync(string senderId, string receiverId);
        Task<List<Chat>> GetMessagesAsync(string senderId, string receiverId, int skip, int take); // إضافة الميثود الجديدة
        Task<Chat> GetMessageByIdAsync(int messageId);
        Task UpdateMessageAsync(Chat message);
        Task DeleteMessageAsync(int messageId);
        Task UpdateMessageStatusAsync(int messageId, MessageStatus status);
        Task<List<Chat>> GetUnreadMessagesAsync(string userId);
        Task<List<ChatConversationDto>> GetChatConversationsAsync(string userId);
        Task<int> GetUniqueSendersCountAsync(string userId);
    }
}