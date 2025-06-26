using FinalGP.Data;
using FinalGP.Server.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

[Route("api/[controller]")]
[ApiController]
public class CommentController : ControllerBase
{
	private readonly ESHContext _context;
	private readonly IHubContext<CommentHub> _hubContext;

	public CommentController(ESHContext context, IHubContext<CommentHub> hubContext)
	{
		_context = context;
		_hubContext = hubContext;
	}

	// ✅ Add a new comment
	[HttpPost]
	public async Task<IActionResult> AddComment([FromBody] CommentDto commentDto)
	{
		if (!ModelState.IsValid)
			return BadRequest(ModelState);

		var comment = new Comment
		{
			HomeId = commentDto.HomeId,
			UserId = commentDto.UserId,
			Content = commentDto.Content,
			Date = DateTime.Now
		};

		_context.Comments.Add(comment);
		await _context.SaveChangesAsync();

		var user = await _context.Users.FindAsync(commentDto.UserId);

		// Send real-time update
		await _hubContext.Clients.All.SendAsync("ReceiveCommentUpdate",
			commentDto.HomeId, commentDto.Content, commentDto.UserId, user?.UserName ?? "Unknown", comment.Date);

		return Ok(new { message = "Comment added successfully", comment });
	}
	// ✅ Update an existing comment
	[HttpPut("{commentId}")]
	public async Task<IActionResult> UpdateComment(int commentId, [FromBody] CommentDto commentDto)
	{
		if (!ModelState.IsValid)
			return BadRequest(ModelState);

		var comment = await _context.Comments.FindAsync(commentId);
		if (comment == null)
			return NotFound(new { message = "Comment not found" });

		// Ensure the user is the owner of the comment before updating
		if (comment.UserId != commentDto.UserId)
			return Unauthorized(new { message = "You can only edit your own comments" });

		comment.Content = commentDto.Content;
		comment.Date = DateTime.Now;

		await _context.SaveChangesAsync();
        // In CommentController.cs - Update the SignalR part of UpdateComment
        await _hubContext.Clients.All.SendAsync("ReceiveCommentUpdate",
            comment.HomeId, comment.Content, comment.UserId,
            await _context.Users.Where(u => u.Id == comment.UserId)
                .Select(u => u.UserName)
                .FirstOrDefaultAsync() ?? "Unknown",
            comment.Date);
        // Send real-time update
   //     await _hubContext.Clients.All.SendAsync("ReceiveCommentUpdate",
			//comment.HomeId, comment.Content, comment.UserId, comment.Date);

		return Ok(new { message = "Comment updated successfully", comment });
	}

   
    [HttpGet("home/{homeId}")]
    public async Task<IActionResult> GetComments(int homeId)
    {
        var comments = await _context.Comments
            .Where(c => c.HomeId == homeId)
            .OrderByDescending(c => c.Date)
            .Select(c => new
            {
                commentId = c.Id, // Include the comment ID
                c.HomeId,
                c.UserId, // Include the user ID
                c.Content,
                c.Date,
                UserName = c.User.UserName
            })
            .ToListAsync();
        return Ok(comments);
    }

    // ✅ Delete a comment
    [HttpDelete("{commentId}")]
    public async Task<IActionResult> DeleteComment(int commentId, [FromQuery] string userId)
    {
        var comment = await _context.Comments.FindAsync(commentId);

        if (comment == null)
            return NotFound(new { message = "تعليق غير موجود" });

        // Ensure the user is the owner of the comment before deleting
        if (comment.UserId != userId)
            return Unauthorized(new { message = "يمكنك فقط حذف تعليقاتك الخاصة" });

        // Store the HomeId before deletion for SignalR notification
        var homeId = comment.HomeId;

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        // Send real-time update about the deletion
        await _hubContext.Clients.All.SendAsync("ReceiveCommentDelete", commentId, homeId);

        return Ok(new { message = "تم حذف التعليق بنجاح" });
    }
}
