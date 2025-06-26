namespace FinalGP.Server.DTO.HomePage
{
    public class ShowHomesDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string City { get; set; }
        public double rate { get; set; } = 0;
        public List<string> Photos { get; set; }
    }
}
