using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.Interface
{
    public interface IHomeRepository : IGenericRepository<Home>
    {
        Task<(bool success, string fileUrl, string errorMessage)> SaveImage(IFormFile imageFile, string folderName);
        Task<List<string>> SaveMultipleImages(List<IFormFile> imageFiles, string folderName);
        Task DeleteImage(string imageFileName, string folderName);
        Task<List<string>> SavePropertyPhotos(List<IFormFile> propertyFiles);
        Task<(bool success, string fileUrl, string errorMessage)> SaveContractPhoto(IFormFile contractFile);
        Task<List<HomeDetailsDto>> SearchHomesAsync(string query);
        Task<Home> GetByIdAsync(int id);


    }
}