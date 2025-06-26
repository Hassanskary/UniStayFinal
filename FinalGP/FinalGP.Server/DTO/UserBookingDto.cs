namespace FinalGP.Server.DTO.Book
{
    public class UserBookingDto
    {
        public Guid Id { get; set; }
        public int RoomId { get; set; }
        public string RoomNumber { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}