
    namespace FinalGP.Server.DTO.Book
    {
        public class BookingValidationDto
        {
            public int RoomId { get; set; }
            public string UserId { get; set; }
            public string Status { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
        }
    }

