using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.ComponentModel.DataAnnotations;

namespace FinalGP.DTO.Room
{
    public class RoomCreateModel
    {
        [BindNever]
        public int Id { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Room number cannot exceed 50 characters.")]
        public string Number { get; set; }

        [Range(1, 11, ErrorMessage = "Number of beds must be between 1 and 10.")]
        public int NumOfBeds { get; set; }

        [Range(0f, 10000f, ErrorMessage = "Price must be between 0 and 10,000.")]
        public decimal Price { get; set; }

        public bool IsCompleted { get; set; } = false;
        public int HomeId { get; set; }
    }
}
