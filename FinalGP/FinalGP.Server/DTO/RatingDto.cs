namespace FinalGP.Server.DTO
{

		public class RatingDto
		{
			public int HomeId { get; set; }
			public string UserId { get; set; }
			public int Score { get; set; }
			public DateTime Date { get; set; } = DateTime.Now;
		}

}
