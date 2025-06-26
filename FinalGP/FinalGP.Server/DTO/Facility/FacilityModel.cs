namespace FinalGP.DTO.Facility
{
    public class FacilityModel
    {
        [Required]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Facility name cannot exceed 100 characters.")]
        public string Name { get; set; }
    }
}
