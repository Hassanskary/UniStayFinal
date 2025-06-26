using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Room
	{
		public int Id { get; set; }

		[Required]
		[StringLength(50,MinimumLength =1, ErrorMessage = "Room number cannot exceed 50 characters.")]
		public string Number { get; set; }
		public int NumOfBeds { get; set; }

		[Range(0f, 10000f, ErrorMessage = "Price must be between 0 and 10,000.")]
		public decimal Price { get; set; }

		public bool IsCompleted { get; set; } = false;

		[ForeignKey("Home"), Required]
		public int? HomeId { get; set; }
		public Home Home { get; set; }

		[Required]
        [StringLength(500, MinimumLength = 4, ErrorMessage = "Photo URL cannot exceed 500 characters.")]
        public string Photo { get; set; }
		public List<ApplicationUser> Users { get; set; }
	}

}
