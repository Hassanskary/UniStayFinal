namespace FinalGP.DTO.Owner
{
    public class EditOwnerDto
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string SSN { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public Gender gender { get; set; }
    }
}
