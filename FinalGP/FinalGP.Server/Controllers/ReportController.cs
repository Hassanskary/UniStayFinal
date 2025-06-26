using FinalGP.Data;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.Server.DTO.Ban;
using FinalGP.Server.DTO.Report;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;

namespace FinalGP.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly IGenericRepository<Report> _reportRepository;
        private readonly IGenericRepository<Ban> _banRepository;
        private readonly IHomeRepository _homeRepository;
        private readonly IAdminRepository _adminRepo;
        private readonly INotificationRepository _notificationRepo;
        private readonly ESHContext _context; // Added to fetch owner's name

        public ReportController(
            IHomeRepository homeRepository,
            IGenericRepository<Report> reportRepository,
            IGenericRepository<Ban> banRepository,
            IAdminRepository adminRepository,
            INotificationRepository notificationRepository,
            ESHContext context
        )
        {
            _homeRepository = homeRepository;
            _reportRepository = reportRepository;
            _banRepository = banRepository;
            _adminRepo = adminRepository;
            _notificationRepo = notificationRepository;
            _context = context;

        }

        [HttpGet("ReportedHomes")]
        [Authorize(Roles = "Admin")]

        public IActionResult GetReportedHomes()
        {
            var reportedHomes = _reportRepository
                .Query()
                .Include(r => r.Home)
                .Where(r => r.Home != null && r.Status == ReportStatus.Pending)
                .GroupBy(r => new { r.Home.Id, r.Home.Title })
                .Select(g => new
                {
                    HomeId = g.Key.Id,
                    Title = g.Key.Title,
                    TotalReports = g.Count()
                })
                .ToList();

            return Ok(reportedHomes);
        }

        [HttpGet("ReportsForHome/{homeId}")]
        [Authorize(Roles = "Admin")]

        public IActionResult GetReportsForHome(int homeId)
        {
            var reports = _reportRepository.Query()
                .Include(r => r.User)
                .Where(r => r.HomeId == homeId)
                .Select(r => new ReportDetailDto
                {
                    ReportId = r.Id,
                    UserName = r.User.UserName,
                    Reason = r.Reason,
                    Date = r.Date,
                    Status = r.Status
                })
                .ToList();

            return Ok(reports);
        }

        [HttpPut("ResolveReports/{homeId}")]
        [Authorize(Roles = "Admin")]

        public async Task<IActionResult> ResolveReportsForHome(int homeId, [FromBody] BanReasonDto reasonDto)
        {
            var home = _homeRepository.GetById(homeId);
            if (home == null)
                return NotFound(new { message = "Home not found." });

            var reports = _reportRepository.Query().Include(r => r.User).Where(r => r.HomeId == homeId).ToList();
            var userIdsWhoReported = reports.Select(r => r.UserId).Distinct().ToList();
            var ownerId = home.OwnerId;

            // Update reports to resolved
            foreach (var report in reports)
            {
                report.Status = ReportStatus.Resolved;
                _reportRepository.Update(report);
            }
            _reportRepository.Save();

            // Ban the home
            home.Status = HomeApprovalStatus.Banned;
            _homeRepository.Update(home);
            _homeRepository.Save();

            // Create a record in Ban table
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(adminId))
                return Unauthorized(new { message = "Invalid admin authentication." });

            var ban = new Ban
            {
                HomeId = homeId,
                AdminId = adminId,
                Reason = reasonDto.Reason,
                Date = DateTime.Now
            };
            _banRepository.Insert(ban);
            _banRepository.Save();

            // Get names for notifications
            var adminName = _context.Users.FirstOrDefault(u => u.Id == adminId)?.UserName ?? "Admin";
            var ownerName = _context.Users.FirstOrDefault(u => u.Id == ownerId)?.UserName ?? "Owner";

            // Send notification to the owner
            var ownerMessage = $"Your home (ID: {homeId}) has been banned by {adminName} due to resolved reports.";
            await _notificationRepo.CreateAndSendReportResolvedNotificationAsync(new List<string> { ownerId }, adminId, homeId, ownerMessage);

            // Send notification to users who reported the home
            var userMessage = $"Your report on home (ID: {homeId}) has been accepted by {adminName}, and the home is now banned.";
            await _notificationRepo.CreateAndSendReportResolvedNotificationAsync(userIdsWhoReported, adminId, homeId, userMessage);

            return Ok(new { message = "Reports resolved, home banned, and notifications sent." });
        }

        [HttpPut("RejectReports/{homeId}")]
        [Authorize(Roles = "Admin")]

        public async Task<IActionResult> RejectReportsForHome(int homeId)
        {
            var home = _homeRepository.GetById(homeId);
            if (home == null)
                return NotFound(new { message = "Home not found." });

            var reports = _reportRepository.Query().Include(r => r.User).Where(r => r.HomeId == homeId).ToList();
            var userIdsWhoReported = reports.Select(r => r.UserId).Distinct().ToList();

            // Update reports to rejected
            foreach (var report in reports)
            {
                report.Status = ReportStatus.Rejected;
                _reportRepository.Update(report);
            }
            _reportRepository.Save();

            // Get admin name for notifications
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var adminName = _context.Users.FirstOrDefault(u => u.Id == adminId)?.UserName ?? "Admin";

            // Send notification to users who reported the home
            var userMessage = $"Your report on home (ID: {homeId}) has been rejected by {adminName}.";
            await _notificationRepo.CreateAndSendReportRejectedNotificationAsync(userIdsWhoReported, adminId, homeId, userMessage);

            return Ok(new { message = "Reports rejected, and notifications sent." });
        }

        [HttpPost("ReportHome/{homeId}")]
        [Authorize(Roles = "User")]

        public async Task<IActionResult> ReportHomeAsync(int homeId, [FromBody] ReportDto reportDto)
        {
            var home = _homeRepository.GetById(homeId);
            if (home == null)
            {
                return NotFound(new { message = "Home not found." });
            }

            if (home.Status != HomeApprovalStatus.Approved)
            {
                return BadRequest(new { message = "Only approved homes can be reported." });
            }

            // Create the new report
            var newReport = new Report
            {
                HomeId = homeId,
                UserId = reportDto.UserId,
                Reason = reportDto.Reason,
                Date = DateTime.Now,
                Status = ReportStatus.Pending
            };

            _reportRepository.Insert(newReport);
            _reportRepository.Save();

            // Get all admin IDs
            var adminIds = _adminRepo.GetAll().Select(a => a.Id).ToList();

            // Get the reporter's username
            var reporterName = _context.Users.FirstOrDefault(u => u.Id == reportDto.UserId)?.UserName ?? "Unknown User";

            // Send notification to all admins
            var message = $"{reporterName} has reported home (ID: {homeId}).";
            await _notificationRepo.CreateAndSendReportNotificationAsync(adminIds, reportDto.UserId, homeId, message);

            return Ok(new { message = "Report submitted successfully, and notifications sent to admins." });
        }

        [HttpGet("UserReports/{homeId}/{userId}")]
          [Authorize(Roles = "User")]

        public IActionResult GetUserReportsForHome(int homeId, string userId)
        {
            var reports = _reportRepository.Query()
                .Where(r => r.HomeId == homeId && r.UserId == userId)
                .Select(r => new
                {
                    ReportId = r.Id,
                    HomeId = r.HomeId,
                    UserId = r.UserId,
                    Reason = r.Reason,
                    Date = r.Date,
                    Status = r.Status
                })
                .ToList();

            return Ok(reports);
        }

        [HttpPut("EditReport/{reportId}")]
        [Authorize(Roles = "User")]

        public IActionResult EditReport(int reportId, [FromBody] EditReportDto editDto)
        {
            var report = _reportRepository.GetById(reportId);
            if (report == null)
                return NotFound(new { message = "Report not found." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (report.UserId != userId)
                return Unauthorized(new { message = "You are not authorized to edit this report." });

            if (report.Status != ReportStatus.Pending)
                return BadRequest(new { message = "Only pending reports can be edited." });

            report.Reason = editDto.NewReason;
            _reportRepository.Update(report);
            _reportRepository.Save();

            return Ok(new { message = "Report updated successfully." });
        }

        [HttpDelete("DeleteReport/{reportId}")]
        [Authorize(Roles = "User")]
        public IActionResult DeleteReport(int reportId)
        {
            var report = _reportRepository.GetById(reportId);
            if (report == null)
                return NotFound(new { message = "Report not found." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (report.UserId != userId)
                return Unauthorized(new { message = "You are not authorized to delete this report." });

            if (report.Status != ReportStatus.Pending)
                return BadRequest(new { message = "Only pending reports can be deleted." });

            _reportRepository.Delete(reportId);
            _reportRepository.Save();

            return Ok(new { message = "Report deleted successfully." });
        }
    }
}