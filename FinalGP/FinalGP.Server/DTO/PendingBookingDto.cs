namespace FinalGP.Server.DTO
{
    public class PendingBookingDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public int RoomId { get; set; }
        public RoomDto Room { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
