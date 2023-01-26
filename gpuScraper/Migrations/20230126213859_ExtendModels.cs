using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gpuScraper.Migrations
{
    /// <inheritdoc />
    public partial class ExtendModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MSRP",
                table: "Models",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MSRP",
                table: "Models");
        }
    }
}
