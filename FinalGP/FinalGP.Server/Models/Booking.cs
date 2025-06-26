using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FinalGP.Models
{
    public class Booking
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [ForeignKey("User")]
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        [Required]
        [ForeignKey("Room")]
        public int RoomId { get; set; }
        public Room Room { get; set; }

        [ForeignKey("Owner")]
        public string? OwnerId { get; set; } // جعل OwnerId اختياريًا (nullable)
        public Owner Owner { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }

        [Required]
        [DataType(DataType.Date)]
        [DateGreaterThan("StartDate", ErrorMessage = "EndDate must be after StartDate.")]
        public DateTime EndDate { get; set; }

        [Required]
        [Range(0, 10000, ErrorMessage = "Amount must be between 0 and 10,000.")]
        public decimal Amount { get; set; }

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [Required]
        public BookingStatus Status { get; set; } = BookingStatus.Pending;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // حقل جديد اختياري لتخزين رقم المعاملة من Stripe
        public string? PaymentReference { get; set; }
    }

    public class DateGreaterThanAttribute : ValidationAttribute
    {
        private readonly string _comparisonProperty;
        public DateGreaterThanAttribute(string comparisonProperty)
        {
            _comparisonProperty = comparisonProperty;
        }
        protected override ValidationResult IsValid(object value, ValidationContext validationContext)
        {
            var currentValue = (DateTime)value;
            var property = validationContext.ObjectType.GetProperty(_comparisonProperty);
            if (property == null)
                throw new ArgumentException("Property with this name not found");

            var comparisonValue = (DateTime)property.GetValue(validationContext.ObjectInstance);
            if (currentValue <= comparisonValue)
                return new ValidationResult(ErrorMessage);
            return ValidationResult.Success;
        }
    }
}