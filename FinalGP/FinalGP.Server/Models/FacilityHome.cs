namespace FinalGP.Models
{
    public class FacilityHome
    {
        public int HomeId { get; set; }
        public Home Home { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }
    }

}
