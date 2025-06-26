using Microsoft.AspNetCore.Mvc;
using FinalGP.RepositoryLayer.Interface;
using Microsoft.AspNetCore.Identity;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Security.Claims;
using System.Linq;
using Microsoft.AspNetCore.Authorization;

namespace FinalGP.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IChatRepository _chatRepo;
        private readonly UserManager<ApplicationUser> _userMgr;
        private readonly IHomeRepository _homeRepo;

        [ActivatorUtilitiesConstructor]
        public ChatController(IChatRepository chatRepo, UserManager<ApplicationUser> userMgr, IHomeRepository homeRepo)
        {
            _chatRepo = chatRepo;
            _userMgr = userMgr;
            _homeRepo = homeRepo;
        }

        [HttpGet("history/{senderId}/{receiverId}")]

        public async Task<IActionResult> GetChatHistory(string senderId, string receiverId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
        {
            try
            {
                if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(receiverId))
                {
                    return BadRequest(new { message = "SenderId and ReceiverId are required" });
                }

                var sender = await _userMgr.FindByIdAsync(senderId);
                var receiver = await _userMgr.FindByIdAsync(receiverId);
                if (sender == null || receiver == null)
                {
                    return NotFound(new { message = "Sender or receiver not found" });
                }

                var msgs = await _chatRepo.GetMessagesAsync(senderId, receiverId, skip, take);
                return Ok(msgs.OrderByDescending(m => m.Timestamp).ToList());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetChatHistory: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while fetching chat history", error = ex.Message });
            }
        }

        [HttpGet("username/{id}")]
        public async Task<IActionResult> GetUserName(string id)
        {
            try
            {
                if (string.IsNullOrEmpty(id))
                {
                    return BadRequest(new { message = "User ID is required" });
                }

                var user = await _userMgr.FindByIdAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(new { userName = user.UserName });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetUserName: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while fetching username", error = ex.Message });
            }
        }

        [HttpGet("owner/{homeId}")]
        public async Task<IActionResult> GetHomeOwner(string homeId)
        {
            try
            {
                if (!int.TryParse(homeId, out int parsedHomeId))
                {
                    return BadRequest(new { message = "Invalid home ID" });
                }

                var home = await _homeRepo.GetByIdAsync(parsedHomeId);
                if (home == null)
                {
                    return NotFound(new { message = "Home not found" });
                }

                var owner = await _userMgr.FindByIdAsync(home.OwnerId);
                if (owner == null)
                {
                    return NotFound(new { message = "Owner not found" });
                }

                return Ok(new HomeOwnerDto { OwnerId = home.OwnerId });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHomeOwner: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while fetching home owner", error = ex.Message });
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { message = "No file uploaded" });
                }

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Chat");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var fileUrl = $"/Chat/{fileName}";
                return Ok(new { fileUrl });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UploadFile: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while uploading the file", error = ex.Message });
            }
        }



        [HttpGet("chat-list")]
        [Authorize(Roles = "Owner,User")]
        public async Task<IActionResult> GetChatList()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }
                var conversations = await _chatRepo.GetChatConversationsAsync(userId);
                var conversationDtos = new List<ChatConversationDto>();

                foreach (var conv in conversations)
                {
                    var messages = await _chatRepo.GetMessagesAsync(userId, conv.OtherUserId);
                    int unreadCount = messages.Count(m => m.ReceiverId == userId && m.Status != MessageStatus.Read);

                    conversationDtos.Add(new ChatConversationDto
                    {
                        OtherUserId = conv.OtherUserId,
                        OtherUserName = conv.OtherUserName,
                        LastMessage = conv.LastMessage,
                        Timestamp = conv.Timestamp,
                        UnreadCount = unreadCount
                    });
                }

                return Ok(conversationDtos);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetChatList: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, "An error occurred while fetching chat list");
            }
        }

        [HttpGet("unread-chats-count")]
        [Authorize(Roles = "Owner,User")]
        public async Task<IActionResult> GetUnreadChatsCount()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }
                int uniqueSendersCount = await _chatRepo.GetUniqueSendersCountAsync(userId);
                return Ok(uniqueSendersCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetUnreadChatsCount: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, "An error occurred while fetching unread chats count");
            }
        }

    }

    public class HomeOwnerDto
    {
        public string OwnerId { get; set; }
    }

    public class ChatConversationDto
    {
        public string OtherUserId { get; set; }
        public string OtherUserName { get; set; }
        public string LastMessage { get; set; }
        public DateTime Timestamp { get; set; }
        public int UnreadCount { get; set; }
        public int UniqueSendersCount { get; set; } // العداد الجديد لعدد المرسلين المختلفين
    }
}