namespace FinalGP.DTO.Home
{
    
        public class HomeDTO1
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string LocationDetails { get; set; }
            public double DistanceFromUniversity { get; set; }
            public int NumOfRooms { get; set; }
            public string ContractPhoto { get; set; }
            public string FirstPhoto { get; set; }
            public OwnerDto owner { get; set; }
            public List<string> Facilities { get; set; }
        }

        public class OwnerDto
        {
            public string Name { get; set; }
            public string Email { get; set; }
        }

}

