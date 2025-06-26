using FinalGP.DTO.Owner;
using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountOwnerController : BaseAccountController
    {
		public AccountOwnerController(
			UserManager<ApplicationUser> userManager,
			RoleManager<IdentityRole> roleManager, // Added RoleManager
			IConfiguration config,
			ITokenService tt)
			: base(userManager, roleManager, config, tt) // Pass RoleManager to base
		{
		}

		[HttpPost("Register")]
        public async Task<IActionResult> Register(OwnerRegisterModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            Owner owner = new Owner
            {
                UserName = model.Full_Name,
                Email = model.Email,
                Address = model.Address,
                PhoneNumber = model.Phone,
                Gender = model.Gender,
                SSN = model.SSN
            };

            return await RegisterUser(owner, model.Password,"Owner");
        }

        // Edit Owner
        //[HttpPut("Edit/{id}")]
        //public async Task<IActionResult> EditOwner(string id, [FromBody] EditOwnerDto updatedOwner)
        //{
        //    var owner = await userManager.FindByIdAsync(id) as Owner;
        //    if (owner == null)
        //        return NotFound("Owner not found.");

        //    owner.UserName = updatedOwner.UserName;
        //    owner.Email = updatedOwner.Email;
        //    owner.SSN = updatedOwner.SSN;
        //    owner.PhoneNumber=updatedOwner.Phone;
        //    owner.Gender=updatedOwner.gender;
        //    owner.Address=updatedOwner.Address;

        //    var result = await userManager.UpdateAsync(owner);
        //    if (!result.Succeeded)
        //        return BadRequest(result.Errors);

        //    return Ok("Owner updated successfully.");
        //}

        [HttpPut("Edit/{id}")]
        [Authorize(Roles = "Owner")]
        public async Task<IActionResult> EditOwner(string id, [FromBody] EditOwnerDto updatedOwner)
        {
            var owner = await userManager.FindByIdAsync(id) as Owner;
            if (owner == null)
                return NotFound("Owner not found.");

            // ✅ التحقق من أن اسم المستخدم والإيميل غير مكررين
            var existingUserName = await userManager.FindByNameAsync(updatedOwner.UserName);
            if (existingUserName != null && existingUserName.Id != id)
            {
                ModelState.AddModelError("UserName", "Username is already taken.");
            }

            var existingEmail = await userManager.FindByEmailAsync(updatedOwner.Email);
            if (existingEmail != null && existingEmail.Id != id)
            {
                ModelState.AddModelError("Email", "Email is already in use.");
            }

            // ✅ التحقق من أن الـ SSN يتكون من 14 رقم
            if (updatedOwner.SSN.Length != 14)
            {
                ModelState.AddModelError("SSN", "SSN must be exactly 14 digits.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(new { errors = ModelState });
            }

            owner.UserName = updatedOwner.UserName;
            owner.Email = updatedOwner.Email;
            owner.SSN = updatedOwner.SSN;
            owner.PhoneNumber = updatedOwner.Phone;
            owner.Gender = updatedOwner.gender;
            owner.Address = updatedOwner.Address;

            var result = await userManager.UpdateAsync(owner);
            if (!result.Succeeded)
                return BadRequest(result.Errors);

            return Ok("Owner updated successfully.");
        }

    }

}