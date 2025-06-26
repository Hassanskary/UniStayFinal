namespace FinalGP.Server.DTO.Report
{
    public class ReportDetailDto
    {
        public int ReportId { get; set; }
        public string UserName { get; set; }
        public string Reason { get; set; }
        public DateTime Date { get; set; }
        public ReportStatus Status { get; set; }
    }
}
