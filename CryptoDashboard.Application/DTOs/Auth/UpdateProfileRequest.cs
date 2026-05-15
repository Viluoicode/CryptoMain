using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.Auth
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "Username is required")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 100 characters")]
        public string Username { get; set; } = string.Empty;
    }
}
