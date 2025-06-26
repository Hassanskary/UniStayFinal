using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

public class CommentHub : Hub
{
	public async Task SendCommentUpdate(int homeId, string comment, string userId, string username, DateTime date)
	{
		await Clients.All.SendAsync("ReceiveCommentUpdate", homeId, comment, userId, username, date);
	}
}
