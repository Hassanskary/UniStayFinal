using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using FinalGP.Server.DTO.Save;
using FinalGP.RepositoryLayer.Interface;
using FinalGP.Server.DTO.HomePage;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SaveController : ControllerBase
    {
        private readonly IGenericRepository<Save> _saveRepo;
        private readonly IHomeRepository _homeRepository;

        public SaveController(IGenericRepository<Save> saveRepo, IHomeRepository homeRepository)
        {
            _saveRepo = saveRepo;
            _homeRepository = homeRepository;
        }


        [HttpGet("CheckSaveOwnership/{userId}")]
        [Authorize(Roles = "User")]
        public IActionResult CheckSaveOwnership(string userId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            if (currentUserId != userId)
            {
                return Problem("You do not own these saves.", statusCode: 403);
            }

            return Ok(new { message = "Ownership verified." });
        }

        // GET: api/Save/{userId}
        [HttpGet("{userId}")]
        [Authorize(Roles ="User")]
        public IActionResult GetUserSaves(string userId)
        {
            var saves = _saveRepo.Query().Where(s => s.UserId == userId).ToList();

            var homeIds = saves.Select(s => s.HomeId).ToList();

            var savedHomes = _homeRepository.Query()
                .Include(h => h.Photos)
                .Include(h => h.Ratings) // ضيف الـ Ratings
                .Where(h => homeIds.Contains(h.Id) && h.Status == HomeApprovalStatus.Approved)
                .Select(h => new ShowHomesDTO
                {
                    Id = h.Id,
                    Title = h.Title,
                    City = h.City.ToString(),
                    rate = h.Ratings.Any() ? h.Ratings.Average(r => r.Score) : 0, 
                    Photos = h.Photos.Select(p => $"{Request.Scheme}://{Request.Host}{p.PhotoUrl}").ToList()
                })
                .ToList();

            return Ok(savedHomes);
        }



        // POST: api/Save/sync
        [HttpPost("sync")]
        public IActionResult SyncUserSaves([FromBody] List<SaveDto> savesDto)
        {
            if (savesDto == null || savesDto.Count == 0)
                return BadRequest("No saves to sync.");

            var userId = savesDto.First().UserId;

            var existingSaves = _saveRepo.Query().Where(s => s.UserId == userId).ToList();
            foreach (var save in existingSaves)
            {
                if (save != null)
                {
                    _saveRepo.Delete(save.Id); 
                }
            }
            foreach (var dto in savesDto)
            {
                var newSave = new Save
                {
                    UserId = dto.UserId,
                    HomeId = dto.HomeId,
                    Date = DateTime.Now
                };
                _saveRepo.Insert(newSave);
            }

            _saveRepo.Save();
            return Ok("Saves synced successfully.");
        }

    }
}
