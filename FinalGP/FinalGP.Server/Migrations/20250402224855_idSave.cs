using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinalGP.Server.Migrations
{
    /// <inheritdoc />
    public partial class idSave : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Saves",
                table: "Saves");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "Saves",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Saves",
                table: "Saves",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Saves_UserId",
                table: "Saves",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Saves",
                table: "Saves");

            migrationBuilder.DropIndex(
                name: "IX_Saves_UserId",
                table: "Saves");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "Saves");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Saves",
                table: "Saves",
                columns: new[] { "UserId", "HomeId" });
        }
    }
}
