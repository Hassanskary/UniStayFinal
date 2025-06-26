namespace FinalGP.Server.DTO.Book
{
    public class CashBookingDto
    {
        public int RoomId { get; set; }
        public DateTime StartDate { get; set; } // إضافة تاريخ البداية
        public DateTime EndDate { get; set; }   // إضافة تاريخ النهاية
        public string PaymentMethod { get; set; }
    }
}
