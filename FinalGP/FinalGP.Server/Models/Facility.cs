using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
	public class Facility
	{
		public int Id { get; set; }

		[Required]
		[StringLength(100,MinimumLength =1 ,ErrorMessage = "Facility name cannot exceed 100 characters.")]
		public string Name { get; set; }

        [ForeignKey("Admin")]
        public string?AdminId { get; set; }
        public Admin? Admin { get; set; }
        public List<FacilityHome>? FacilityHomes { get; set; }

	}

}
