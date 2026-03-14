using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.DTOs.Wallet
{
    public class CreateWalletRequest
    {
        [Required(ErrorMessage = "Wallet name is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Wallet name must be between 1 and 200 characters")]
        public string Name { get; set; } = string.Empty;
    }
}
