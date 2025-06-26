using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Rating
	{
		[Key]
		[DatabaseGenerated(DatabaseGeneratedOption.Identity)] 
		public int Id { get; set; }

		[ForeignKey("Home"), Required]
		public int HomeId { get; set; }
		public Home Home { get; set; }


		[ForeignKey("User"), Required]
		public string UserId { get; set; }
		public ApplicationUser User { get; set; }

		[Range(1, 6, ErrorMessage = "Score must be between 1 and 5.")]
		public int Score { get; set; }

		public DateTime Date { get; set; }= DateTime.Now;
	}

}
