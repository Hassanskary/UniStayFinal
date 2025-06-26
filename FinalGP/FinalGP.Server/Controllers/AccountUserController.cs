using FinalGP.DTO.User;
using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountUserController : BaseAccountController
    {
        public AccountUserController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager, // Added RoleManager
            IConfiguration config,
            ITokenService tt)
            : base(userManager, roleManager, config, tt) // Pass RoleManager to base
        {
        }


        [HttpPost("Register")]
        public async Task<IActionResult> Register(UserRegisterModel model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                    );
                return BadRequest(new { message = "Validation failed", errors });
            }

            var user = new ApplicationUser
            {
                UserName = model.Full_Name,
                Email = model.Email,
                Address = model.Address,
                PhoneNumber = model.Phone,
                Gender = model.Gender
            };

            return await RegisterUser(user, model.Password, "User");
        }


        // Edit User
        //[HttpPut("Edit/{id}")]
        //public async Task<IActionResult> EditUser(string id, [FromBody] EditUserDto updatedUser)
        //{
        //    var user = await userManager.FindByIdAsync(id);
        //    if (user == null || user is Admin || user is Owner)
        //    {
        //        return BadRequest("This endpoint is for regular users only.");
        //    }

        //    user.UserName = updatedUser.UserName;
        //    user.Email = updatedUser.Email;
        //    user.Address = updatedUser.Address;
        //    user.Gender =updatedUser.gender;
        //    user.PhoneNumber=updatedUser.Phone;

        //    var result = await userManager.UpdateAsync(user);
        //    if (!result.Succeeded)
        //        return BadRequest(result.Errors);

        //    return Ok("User updated successfully.");
        //}
        [HttpPut("Edit/{id}")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> EditUser(string id, [FromBody] EditUserDto updatedUser)
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null || user is Admin || user is Owner)
            {
                return BadRequest("This endpoint is for regular users only.");
            }

            // ✅ التحقق من أن اسم المستخدم والإيميل غير مكررين
            var existingUserName = await userManager.FindByNameAsync(updatedUser.UserName);
            if (existingUserName != null && existingUserName.Id != id)
            {
                ModelState.AddModelError("UserName", "Username is already taken.");
            }

            var existingEmail = await userManager.FindByEmailAsync(updatedUser.Email);
            if (existingEmail != null && existingEmail.Id != id)
            {
                ModelState.AddModelError("Email", "Email is already in use.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(new { errors = ModelState });
            }

            user.UserName = updatedUser.UserName;
            user.Email = updatedUser.Email;
            user.Address = updatedUser.Address;
            user.Gender = updatedUser.gender;
            user.PhoneNumber = updatedUser.Phone;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(result.Errors);

            return Ok("User updated successfully.");
        }




    }
}