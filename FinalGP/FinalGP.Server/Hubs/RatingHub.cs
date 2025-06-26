using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
namespace FinalGP.Server.Hubs
{



		public class RatingHub : Hub
		{
			public async Task SendRatingUpdate(int homeId, double avgRating)
			{
				await Clients.All.SendAsync("ReceiveRatingUpdate", homeId, avgRating);
			}
		}
	


}
