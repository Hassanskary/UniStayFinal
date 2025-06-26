using FinalGP.Models;
using System.ComponentModel.DataAnnotations;

namespace FinalGP.DTO.User
{
    public class UserRegisterModel
    {
        [Required(ErrorMessage = "Full name is required.")]
        [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters.")]
        public string Full_Name { get; set; }


        [Required(ErrorMessage = "Email is required.")]
        [StringLength(50, ErrorMessage = "Email cannot exceed 50 characters.")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Please enter a valid email address.")]
        [DataType(DataType.EmailAddress)]
        public string Email { get; set; }


        [Required(ErrorMessage = "Phone number is required.")]
        [Phone(ErrorMessage = "Invalid phone number.")]
        public string Phone { get; set; }


        [Required(ErrorMessage = "Password is required.")]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters long.")]
        [DataType(DataType.Password)]
        [RegularExpression(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
            ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, and one digit.")]
        public string Password { get; set; }


        [Compare("Password"), Required(ErrorMessage = "Confirm Password is required.")]
        [DataType(DataType.Password)]
        public string ConfirmPassword { get; set; }


        [StringLength(100, ErrorMessage = "Address cannot exceed 100 characters.")]
        public string Address { get; set; }


        [Required(ErrorMessage = "Gender is required.")]
        public Gender Gender { get; set; } = Gender.Male;

    }
}
