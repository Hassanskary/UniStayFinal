using FinalGP.DTO.Facility;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class FacilityController : ControllerBase
    {
        private readonly IGenericRepository<Facility> _facilityRepository;
        public FacilityController(IGenericRepository<Facility> facilityRepository)
        {
            _facilityRepository = facilityRepository;
        }

        [HttpPost("Add")]
        public IActionResult CreateFacility([FromBody] FacilityModel facility)
        {
            if (!ModelState.IsValid || facility == null)
                return BadRequest("Facility data is invalid.");

            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(adminId))
            {
                return Unauthorized("Admin not authenticated.");
            }

            Facility Newfacility = new Facility();
            Newfacility.Name = facility.Name;
            Newfacility.AdminId = adminId;
            _facilityRepository.Insert(Newfacility);
            _facilityRepository.Save();

            return CreatedAtAction(nameof(GetFacilityById),
                new { id = Newfacility.Id }, Newfacility);
        }

        [HttpGet("GetAll")]
        public IActionResult GetAllFacilities()
        {
            var facilities = _facilityRepository.GetAll().ToList(); 
            return Ok(facilities);
        }

        [HttpGet("Get/{id}")]
        public IActionResult GetFacilityById(int id)
        {
            var facility = _facilityRepository.GetById(id);
            if (facility == null)
                return NotFound("Facility not found");

            return Ok(facility);
        }

        [HttpPut("Update/{id}")]
        public IActionResult UpdateFacility(int id, [FromBody] FacilityModel facility)
        {
            if (!ModelState.IsValid)
                return BadRequest("Invalid request");

            var existingFacility = _facilityRepository.GetById(id);
            if (existingFacility == null)
                return NotFound("Facility not found");
            existingFacility.Name=facility.Name;

            _facilityRepository.Update(existingFacility);
            _facilityRepository.Save();

            return Ok(facility);
        }

        [HttpDelete("Delete/{id}")]
        public IActionResult DeleteFacility(int id)
        {
            var facility = _facilityRepository.GetById(id);
            if (facility == null)
                return NotFound("Facility not found");

            _facilityRepository.Delete(id);
            _facilityRepository.Save();

            return Ok("Deleted Successfully");
        }
    }
}
