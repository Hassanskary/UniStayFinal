using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Comment
	{
		[Key]

		[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public int Id { get; set; }
		[ForeignKey("User"), Required]
		public string UserId { get; set; }
		public ApplicationUser User { get; set; }


		[ForeignKey("Home"), Required]
		public int HomeId { get; set; }
		public Home Home { get; set; }

		[Required]
		[StringLength(1000,MinimumLength =1,ErrorMessage = "Content cannot exceed 1000 characters.")]
		public string Content { get; set; }

		public DateTime Date { get; set; }
	}

}
