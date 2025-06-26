using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinalGP.Server.Migrations
{
    /// <inheritdoc />
    public partial class chat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Chats",
                table: "Chats");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Chats",
                newName: "Timestamp");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "Chats",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Chats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Chats",
                table: "Chats",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Chats_SenderId",
                table: "Chats",
                column: "SenderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Chats",
                table: "Chats");

            migrationBuilder.DropIndex(
                name: "IX_Chats_SenderId",
                table: "Chats");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "Chats");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Chats");

            migrationBuilder.RenameColumn(
                name: "Timestamp",
                table: "Chats",
                newName: "Date");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Chats",
                table: "Chats",
                columns: new[] { "SenderId", "ReceiverId" });
        }
    }
}
