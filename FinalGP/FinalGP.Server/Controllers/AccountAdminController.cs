using FinalGP.DTO.Admin;
using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    
    public class AccountAdminController : BaseAccountController
    {
		public AccountAdminController(
			UserManager<ApplicationUser> userManager,
			RoleManager<IdentityRole> roleManager, // Added RoleManager
			IConfiguration config,
			ITokenService tt)
			: base(userManager, roleManager, config, tt) // Pass RoleManager to base
		{
		}

		[HttpPost("Register")]
     //  [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Register(AdminRegisterModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var admin = new Admin
            {
                UserName = model.Full_Name,
                Email = model.Email,
                PhoneNumber = model.Phone
            };

            return await RegisterUser(admin, model.Password,"Admin");
        }

        [HttpPut("Edit/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> EditAdmin(string id, [FromBody] EditAdminDto updatedAdmin)
        {
            Admin admin = await userManager.FindByIdAsync(id) as Admin;
            if (admin == null)
                return NotFound("Admin not found.");

            admin.UserName = updatedAdmin.UserName;
            admin.Email = updatedAdmin.Email;
            admin.PhoneNumber = updatedAdmin.Phone; // Added Phone
            admin.Gender = updatedAdmin.Gender; // Added Gender

            var result = await userManager.UpdateAsync(admin);
            if (!result.Succeeded)
                return BadRequest(result.Errors);

            return Ok("Admin updated successfully.");
        }

    }
}