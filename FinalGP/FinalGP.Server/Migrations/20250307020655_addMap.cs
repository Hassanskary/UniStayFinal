using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinalGP.Server.Migrations
{
    /// <inheritdoc />
    public partial class addMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Homes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Homes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Homes");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Homes");
        }
    }
}
