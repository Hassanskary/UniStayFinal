using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	
	public class Report
	{
		[Key]
        public int Id { get; set; }

        [ForeignKey("User"), Required]
		public string UserId { get; set; }
		public ApplicationUser User { get; set; }

		[ForeignKey("Home"), Required]
		public int HomeId { get; set; }
		public Home Home { get; set; }


        [ForeignKey("Admin")]
        public string? AdminId { get; set; }
        public Admin? Admin { get; set; }

        [Required]
		[StringLength(500,MinimumLength =3, ErrorMessage = "Reason cannot exceed 500 characters.")]
		public string Reason { get; set; }

		public DateTime Date { get; set; }= DateTime.Now;

		public ReportStatus Status { get; set; }= ReportStatus.Pending;

    }


}
