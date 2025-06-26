using FinalGP.DTO.Room;

namespace FinalGP.DTO.Home
{
    public class AddHome
    {

        [Required]
        [StringLength(200, MinimumLength = 3, ErrorMessage = "Title cannot exceed 200 characters.")]
        public string Title { get; set; }

        [Required]
        [StringLength(300, MinimumLength = 3, ErrorMessage = "Address cannot exceed 300 characters.")]
        public string Description { get; set; }


        public City City { get; set; } = City.General;


        [Required]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Location cannot exceed 100 characters.")]
        public string LocationDetails { get; set; }


        [Range(0f, 100f, ErrorMessage = "Distance must be between 0 and 100 km.")]
        public double DistanceFromUniversity { get; set; }

        public Gender Gender { get; set; }


        [Range(0, 51, ErrorMessage = "Floor number must be between 0 and 50.")]
        public int Floor { get; set; }

        public HomeType Type { get; set; }

        [NotMapped]
        public IFormFile? ContractFile { get; set; }

        [NotMapped]
        public List<IFormFile>? PhotoFiles { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

    }
}
