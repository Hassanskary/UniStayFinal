using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Photo
	{
		public int Id { get; set; }

		[ForeignKey("Home"),Required]
		public int HomeId { get; set; }
		public Home Home { get; set; }

		[Required]
		[StringLength(500,MinimumLength =4, ErrorMessage = "Photo URL cannot exceed 500 characters.")]
		public string PhotoUrl { get; set; }
	}

}
