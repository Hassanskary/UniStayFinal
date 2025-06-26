using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : BaseAccountController
    {
        public AccountController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration config,
            ITokenService tokenService)
            : base(userManager, roleManager, config, tokenService)
        {
        }
    }
}