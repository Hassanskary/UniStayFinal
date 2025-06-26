using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace FinalGP.Models
{
	public class ApplicationUser : IdentityUser
	{
	

		[StringLength(300,MinimumLength =3, ErrorMessage = "Address cannot exceed 300 characters.")]
		public string? Address { get; set; }
		[Required]
		public Gender Gender { get; set; } = Gender.Male;

		public ICollection<Notification> Notifications { get; set; }
        public ICollection<Report> Reports { get; set; }
        public ICollection<Rating> Ratings { get; set; }
        public ICollection<Save> Saves { get; set; }
        public ICollection<Comment> Comments { get; set; }
        public ICollection<Booking> Bookings { get; set; }
        public ICollection<Chat> Chats { get; set; }

    }

}
