namespace FinalGP.Server.DTO.Report
{
    public class ReportDto
    {
        // You can either pass the UserId from the client,
        // or if you’re using authentication, you can get it from the token.
        public string UserId { get; set; }
        public string Reason { get; set; }
    }
}
