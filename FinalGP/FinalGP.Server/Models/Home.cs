using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{

	public class Home
	{
		public int Id { get; set; }

		[Required]
		[StringLength(200,MinimumLength =3, ErrorMessage = "Title cannot exceed 200 characters.")]
		public string Title { get; set; }


        [StringLength(300, MinimumLength = 3, ErrorMessage = "Address cannot exceed 300 characters.")]
        public string? Description { get; set; }


		public City City { get; set; } = City.General;


		[Required]
		[StringLength(100,MinimumLength =3, ErrorMessage = "Location cannot exceed 100 characters.")]
		public string LocationDetails { get; set; }


		[Range(0f, 100f, ErrorMessage = "Distance must be between 0 and 100 km.")]
		public double DistanceFromUniversity { get; set; }


		[Range(1, 11, ErrorMessage = "Number of rooms must be between 1 and 10.")]
		public int NumOfRooms { get; set; }

		public Gender Gender { get; set; }

		[Range(0, 51, ErrorMessage = "Floor number must be between 0 and 50.")]
		public int Floor { get; set; }

		public HomeType Type { get; set; }

        public HomeApprovalStatus Status { get; set; }= HomeApprovalStatus.PendingApproval;


        [Required]
        [StringLength(100, MinimumLength = 5, ErrorMessage = "Contract Photo cannot exceed 100 characters.")]
        public string ContractPhoto { get; set; }


        [NotMapped]
        public IFormFile? ContractFile { get; set; }

        [NotMapped]
        public List<IFormFile>? PhotoFiles { get; set; }

        public DateTime  CreatedAt { get; set; }= DateTime.Now;

        // Add latitude and longitude for location
        public double Latitude { get; set; }
        public double Longitude { get; set; }


        [ForeignKey("Admin")]
        public string? AdminId { get; set; }
        public Admin? Admin { get; set; }


        [ForeignKey("Owner"), Required]
		public string OwnerId { get; set; }
		public Owner? Owner { get; set; }

		public ICollection<Facility>? Facilities { get; set; }
		public ICollection<Photo>? Photos { get; set; }
		public ICollection<Room>? Rooms { get; set; }
		public ICollection<Report>? Reports { get; set; }
		public ICollection<Rating>? Ratings { get; set; }
		public ICollection<Save>? Saves { get; set; }
		public ICollection<Comment>? Comments { get; set; }
        public ICollection<Ban>? Bans { get; set; }
        public List<FacilityHome>? FacilityHomes { get; set; } //= new List<FacilityHome>();


    }

}
