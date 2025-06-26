using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
namespace FinalGP.Controllers
{

		[Route("api/[controller]")]
		[ApiController]
        [Authorize(Roles = "Admin")]
    public class RoleController : ControllerBase
		{
			private readonly RoleManager<IdentityRole> _roleManager;

			public RoleController(RoleManager<IdentityRole> roleManager)
			{
				_roleManager = roleManager;
			}

			// GET: api/Role
			[HttpGet]
			public ActionResult<IEnumerable<string>> GetRoles()
			{
				// Retrieve all roles from the database
				var roles = _roleManager.Roles.Select(r => r.Name).ToList();
				return Ok(roles);
			}

			// POST: api/Role
			[HttpPost]
			public async Task<IActionResult> CreateRole([FromBody] string roleName)
			{
				if (string.IsNullOrEmpty(roleName))
				{
					return BadRequest("Role name cannot be empty.");
				}

				// Check if the role already exists
				var roleExists = await _roleManager.RoleExistsAsync(roleName);
				if (roleExists)
				{
					return Conflict("Role already exists.");
				}

				// Create the role
				var result = await _roleManager.CreateAsync(new IdentityRole(roleName));
				if (result.Succeeded)
				{
					return Ok($"Role '{roleName}' created successfully.");
				}

				return BadRequest(result.Errors);
			}

			// DELETE: api/Role/{roleName}
			[HttpDelete("{roleName}")]
			public async Task<IActionResult> DeleteRole(string roleName)
			{
				if (string.IsNullOrEmpty(roleName))
				{
					return BadRequest("Role name cannot be empty.");
				}

				// Find the role
				var role = await _roleManager.FindByNameAsync(roleName);
				if (role == null)
				{
					return NotFound("Role not found.");
				}

				// Delete the role
				var result = await _roleManager.DeleteAsync(role);
				if (result.Succeeded)
				{
					return Ok($"Role '{roleName}' deleted successfully.");
				}

				return BadRequest(result.Errors);
			}
		}
	}


