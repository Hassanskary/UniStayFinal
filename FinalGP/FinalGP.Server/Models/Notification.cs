// Models/Notification.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
    public class Notification
    {
        public int Id { get; set; }

        [ForeignKey("User"), Required]
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        [ForeignKey("Owner")]
        public string? OwnerId { get; set; }
        public Owner? Owner { get; set; }

        [StringLength(500, MinimumLength = 1, ErrorMessage = "Message cannot exceed 500 characters."), Required]
        public string Message { get; set; }

        public DateTime Date { get; set; } = DateTime.Now;

        public bool IsRead { get; set; } = false;
    }
}