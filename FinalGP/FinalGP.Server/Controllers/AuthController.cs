//using Microsoft.AspNetCore.Authentication;
//using Microsoft.AspNetCore.Authentication.Google;
//using Microsoft.AspNetCore.Mvc;
//using System.Security.Claims;

//[Route("api/auth")]
//[ApiController]
//public class AuthController : ControllerBase
//{
//    [HttpGet("google-login")]
//    public IActionResult GoogleLogin()
//    {
//        var properties = new AuthenticationProperties { RedirectUri = "/api/auth/google-response" };
//        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
//    }

//    [HttpGet("google-response")]
//    public async Task<IActionResult> GoogleResponse()
//    {
//        var result = await HttpContext.AuthenticateAsync();
//        if (!result.Succeeded) return BadRequest("Authentication failed.");

//        var claims = result.Principal.Identities.FirstOrDefault()?.Claims.Select(c =>
//            new { c.Type, c.Value });

//        return Ok(new
//        {
//            Name = result.Principal.FindFirstValue(ClaimTypes.Name),
//            Email = result.Principal.FindFirstValue(ClaimTypes.Email),
//            Token = result.Properties.GetTokenValue("access_token")
//        });
//    }
//}
