using FinalGP.DTO.Facility;

public class HomeDetailsDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public City City { get; set; }
    public string LocationDetails { get; set; }
    public double DistanceFromUniversity { get; set; }
    public Gender Gender { get; set; }
    public int Floor { get; set; }
    public HomeType Type { get; set; }
    public string ContractPhoto { get; set; }
    public List<string> Photos { get; set; }
    public int NumOfRooms { get; set; }
    public HomeApprovalStatus homeApprovalStatus { get; set; }
    public List<FacilityDto> Facilities { get; set; }
    // رابط لعرض كل الغرف لهذا المنزل
    public string ShowRoomsUrl { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double Rate { get; set; }
}
