using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinalGP.Server.Migrations
{
    /// <inheritdoc />
    public partial class manageReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Reports",
                table: "Reports");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "Reports",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "AdminId",
                table: "Reports",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Reports",
                table: "Reports",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_AdminId",
                table: "Reports",
                column: "AdminId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_HomeId",
                table: "Reports",
                column: "HomeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_AspNetUsers_AdminId",
                table: "Reports",
                column: "AdminId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_AspNetUsers_AdminId",
                table: "Reports");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Reports",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_AdminId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_HomeId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "AdminId",
                table: "Reports");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Reports",
                table: "Reports",
                columns: new[] { "HomeId", "UserId" });
        }
    }
}
