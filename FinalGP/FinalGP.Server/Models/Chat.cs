using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
    public class Chat
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // Ensures auto-increment
        public int Id { get; set; }

        [ForeignKey("Sender"), Required]
        public string SenderId { get; set; }
        public ApplicationUser? Sender { get; set; }

        [ForeignKey("Receiver"), Required]
        public string ReceiverId { get; set; }
        public Owner? Receiver { get; set; }

        [Required]
        [StringLength(1000, MinimumLength = 1, ErrorMessage = "Message cannot exceed 1000 characters.")]
        public string Message { get; set; }

        public DateTime Timestamp { get; set; }

        public MessageStatus Status { get; set; } = MessageStatus.Sent; // Default to Sent
    }

    public enum MessageStatus
    {
        Sent,
        Delivered,
        Read
    }
}
