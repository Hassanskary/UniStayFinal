using FinalGP.Models;  
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FinalGP.Data
{
	public class ESHContext : IdentityDbContext<ApplicationUser>
	{
		public ESHContext(DbContextOptions<ESHContext> options) : base(options)
		{
		}
		public DbSet<Home> Homes { get; set; }
		public DbSet<Photo> Photos { get; set; }
		public DbSet<Owner> Owners { get; set; }
		public DbSet<Admin> Admins { get; set; }
		public DbSet<Room> Rooms { get; set; }
		public DbSet<Booking> Bookings { get; set; }
		public DbSet<Chat> Chats { get; set; }
		public DbSet<Notification> Notifications { get; set; }
		public DbSet<Report> Reports { get; set; }
		public DbSet<Rating> Ratings { get; set; }
		public DbSet<Comment> Comments { get; set; }
		public DbSet<Save> Saves { get; set; }
		public DbSet<Ban> Bans { get; set; }
		public DbSet<Facility> Facilities { get; set; }
        public DbSet<RevokedTokens> revokedtokens { get; set; }
		public DbSet<FacilityHome> facilityHomes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);


			modelBuilder.Entity<Ban>()
				.HasKey(b=> new {b.HomeId,b.AdminId});

            modelBuilder.Entity<FacilityHome>()
             .HasKey(fh => new { fh.HomeId, fh.FacilityId });

            //للdecimal
            modelBuilder.Entity<Booking>()
	         .Property(b => b.Amount)
	         .HasColumnType("decimal(18, 2)");  // Precision 18, scale 2

			modelBuilder.Entity<Room>()
				.Property(r => r.Price)
				.HasColumnType("decimal(18, 2)");

		}


	}
}
