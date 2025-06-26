namespace FinalGP.Server.DTO.Filter
{
    public class FacilityDtoo
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class HomeFilterRequestDto
    {
        public List<int> FacilityIds { get; set; } = new List<int>();
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? MinBeds { get; set; }
        public int? MaxBeds { get; set; }
        public int? MinFloor { get; set; }
        public int? MaxFloor { get; set; }
        public string? HomeType { get; set; }
        public string? Gender { get; set; }
        public string? City { get; set; }
        public double? Latitude { get; set; } 
        public double? Longitude { get; set; } 
        public double? Radius { get; set; }
        public string? SortOption { get; set; }
    }

    public class FilteredHomeDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string City { get; set; }
        public double Rate { get; set; }
        public List<string> Photos { get; set; }
    }
}