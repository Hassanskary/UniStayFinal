using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Save
	{

		[Key]
		public int Id { get; set; }

		[ForeignKey("User"), Required]
		public string UserId { get; set; }
		public ApplicationUser User { get; set; }


		[ForeignKey("Home"), Required]
		public int HomeId { get; set; }
		public Home Home { get; set; }

		public DateTime Date { get; set; }= DateTime.Now;
	}

}
