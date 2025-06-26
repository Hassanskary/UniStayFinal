

namespace FinalGP.Models
{
	public class Admin : ApplicationUser
	{
		public ICollection<Ban> Bans { get; set; }
		public ICollection<Facility> Facility { get; set; }
		public ICollection<Home> Homes { get; set; }
		public ICollection<Report> Reports { get; set; }
	}
}
