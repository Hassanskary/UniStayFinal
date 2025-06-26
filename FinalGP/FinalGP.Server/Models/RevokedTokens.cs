namespace FinalGP.Models
{
    public class RevokedTokens
    {
        public int Id { get; set; }
        public string Token { get; set; }
        public DateTime ExpiryDate { get; set; }
    }

}
