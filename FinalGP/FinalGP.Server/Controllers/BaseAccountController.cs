
using FinalGP.ServiceLayer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public abstract class BaseAccountController : ControllerBase
    {
        protected readonly UserManager<ApplicationUser> userManager;
        protected readonly RoleManager<IdentityRole> roleManager;
        protected readonly IConfiguration config;
        private readonly ITokenService _tokenservice;

        public BaseAccountController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration config,
            ITokenService ttt)
        {
            this.userManager = userManager;
            this.roleManager = roleManager;
            this.config = config;
            this._tokenservice = ttt;
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            const string errorMessage = "Invalid email or password.";

            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(new { message = errorMessage });
            }

            var user = await userManager.FindByEmailAsync(model.Email);

            if (user == null || !await userManager.CheckPasswordAsync(user, model.Password))
            {
                return BadRequest(new { message = errorMessage });
            }

            var token = await GenerateJwtTokenAsync(user);

            var roles = await userManager.GetRolesAsync(user);
            return Ok(new
            {
                token,
                username = user.UserName,
                role = roles.FirstOrDefault()
            });
        }

        protected async Task<IActionResult> RegisterUser<TUser>(TUser user, string password, string TypeUser)
             where TUser : ApplicationUser
        {
            if (user == null)
            {
                return BadRequest(new { message = "User data is invalid.", errors = new string[] { } });
            }

            var result = await userManager.CreateAsync(user, password);

            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, TypeUser);
                return Ok(new { message = "User created successfully", userId = user.Id });
            }

            var errors = result.Errors.Select(e => e.Description).ToArray();
            return BadRequest(new { message = "Registration failed", errors });
        }

        private async Task<object> GenerateJwtTokenAsync(ApplicationUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName)
            };

            var roles = await userManager.GetRolesAsync(user);
            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JWT:SecKey"]));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: config["JWT:Issuer"],
                audience: config["JWT:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(30),
                signingCredentials: credentials
            );

            return new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expiration = token.ValidTo
            };
        }

        [HttpPut("ChangePassword/{id}")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordModel model)
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            var result = await userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return Ok("Password changed successfully.");
        }


        [HttpGet("CheckProfileOwnership/{userId}")]
        [Authorize]
        public IActionResult CheckProfileOwnership(string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            if (currentUserId != userId)
            {
                return Problem("You do not own this profile.", statusCode: 403);
            }

            return Ok(new { message = "Ownership verified." });
        }


        [HttpGet("Profile/{id}")]
        [Authorize]
        public async Task<IActionResult> GetProfile(string id)
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(user);
        }

        [HttpDelete("Delete/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return Ok("User deleted successfully.");
        }

        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

            if (string.IsNullOrEmpty(token))
                return BadRequest(new { message = "Token is missing" });

            _tokenservice.RevokeToken(token);

            return Ok(new { message = "Logged out successfully" });
        }

        public class GoogleLoginRequest
        {
            public string IdToken { get; set; }
        }

        [HttpPost("GoogleLogin")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.IdToken))
                {
                    return BadRequest(new { message = "ID Token is required." });
                }

                Console.WriteLine("GoogleLogin: Endpoint hit with ID token: " + request.IdToken);
                Console.WriteLine("GoogleLogin: Validating ID token...");
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);
                if (payload == null)
                {
                    Console.WriteLine("GoogleLogin: Invalid Google token.");
                    return BadRequest(new { message = "Invalid Google token." });
                }
                Console.WriteLine($"GoogleLogin: Token validated. Email: {payload.Email}");

                Console.WriteLine("GoogleLogin: Finding user by email...");
                var user = await userManager.FindByEmailAsync(payload.Email);
                if (user == null)
                {
                    Console.WriteLine("GoogleLogin: User not found, creating new user...");
                    user = new ApplicationUser
                    {
                        Email = payload.Email,
                        UserName = payload.Email,
                        EmailConfirmed = true
                    };

                    var result = await userManager.CreateAsync(user);
                    if (!result.Succeeded)
                    {
                        Console.WriteLine("GoogleLogin: Failed to create user: " + string.Join(", ", result.Errors.Select(e => e.Description)));
                        return BadRequest(new { message = "Failed to create user", errors = result.Errors });
                    }

                    Console.WriteLine("GoogleLogin: Ensuring 'User' role exists...");
                    if (!await roleManager.RoleExistsAsync("User"))
                    {
                        Console.WriteLine("GoogleLogin: Creating 'User' role...");
                        var roleResult = await roleManager.CreateAsync(new IdentityRole("User"));
                        if (!roleResult.Succeeded)
                        {
                            Console.WriteLine("GoogleLogin: Failed to create 'User' role: " + string.Join(", ", roleResult.Errors.Select(e => e.Description)));
                            await userManager.DeleteAsync(user);
                            return BadRequest(new { message = "Failed to create 'User' role", errors = roleResult.Errors });
                        }
                    }

                    Console.WriteLine("GoogleLogin: Assigning 'User' role to user...");
                    var addRoleResult = await userManager.AddToRoleAsync(user, "User");
                    if (!addRoleResult.Succeeded)
                    {
                        Console.WriteLine("GoogleLogin: Failed to assign 'User' role: " + string.Join(", ", addRoleResult.Errors.Select(e => e.Description)));
                        await userManager.DeleteAsync(user);
                        return BadRequest(new { message = "Failed to assign role to user", errors = addRoleResult.Errors });
                    }
                }
                else
                {
                    Console.WriteLine("GoogleLogin: User found.");
                }

                Console.WriteLine("GoogleLogin: Retrieving user roles...");
                var roles = await userManager.GetRolesAsync(user);
                if (!roles.Any())
                {
                    Console.WriteLine("GoogleLogin: No roles found for user, ensuring 'User' role exists...");
                    if (!await roleManager.RoleExistsAsync("User"))
                    {
                        Console.WriteLine("GoogleLogin: Creating 'User' role...");
                        var roleResult = await roleManager.CreateAsync(new IdentityRole("User"));
                        if (!roleResult.Succeeded)
                        {
                            Console.WriteLine("GoogleLogin: Failed to create 'User' role: " + string.Join(", ", roleResult.Errors.Select(e => e.Description)));
                            return BadRequest(new { message = "Failed to create 'User' role", errors = roleResult.Errors });
                        }
                    }

                    Console.WriteLine("GoogleLogin: Assigning 'User' role on second attempt...");
                    var addRoleResult = await userManager.AddToRoleAsync(user, "User");
                    if (!addRoleResult.Succeeded)
                    {
                        Console.WriteLine("GoogleLogin: Failed to assign 'User' role on second attempt: " + string.Join(", ", addRoleResult.Errors.Select(e => e.Description)));
                        return BadRequest(new { message = "Failed to assign role to existing user", errors = addRoleResult.Errors });
                    }
                    roles = new List<string> { "User" };
                }
                Console.WriteLine($"GoogleLogin: User roles: {string.Join(", ", roles)}");

                Console.WriteLine("GoogleLogin: Generating JWT token...");
                var token = await GenerateJwtTokenAsync(user);

                Console.WriteLine("GoogleLogin: Returning response...");
                return Ok(new
                {
                    token,
                    username = user.UserName,
                    role = roles.FirstOrDefault()
                });
            }
                catch (InvalidJwtException ex)
            {
                Console.WriteLine($"GoogleLogin: Invalid JWT: {ex.Message}");
                return BadRequest(new { message = "Invalid Google token." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GoogleLogin: Error: {ex.Message}\nStackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Something went wrong", error = ex.Message });
            }
        }
    }
}