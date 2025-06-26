using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Ban
	{

        [ForeignKey("Home"), Required]
        public int HomeId { get; set; }
		public Home Home { get; set; }


		[ForeignKey("Admin"), Required]
		public string AdminId { get; set; }
		public Admin Admin { get; set; }


		[Required]
		[StringLength(500,MinimumLength =1, ErrorMessage = "Reason cannot exceed 500 characters.")]
		public string Reason { get; set; }

		public DateTime Date { get; set; }= DateTime.Now;
	}

}
