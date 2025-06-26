namespace FinalGP.DTOs
{
    public class CreateBookingWithStripeDto
    {
        public int RoomId { get; set; }
        public string PaymentMethod { get; set; } = "Stripe";
        public string TokenId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? BaseUrl { get; set; }
        public bool IsRenewal { get; set; } // حقل جديد لتحديد ما إذا كان تجديد
    }

    public class CompleteBookingDto
    {
        public string SessionId { get; set; }
    }
}