using System.ComponentModel.DataAnnotations;

namespace FinalGP.Models
{
    public class Owner : ApplicationUser
    {
        [RegularExpression(@"^\d{14}$", ErrorMessage = "SSN must be exactly 14 digits."), Required]
        public string? SSN { get; set; }
        public ICollection<Home> Homes { get; set; }
        public ICollection<Chat> Chats { get; set; }
        public ICollection<Booking> Bookings { get; set; }
        public ICollection<Notification> Notifications { get; set; }

    }
}