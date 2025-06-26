    using FinalGP.Data;
    using FinalGP.DTO.Facility;
    using FinalGP.Models;
    using FinalGP.RepositoryLayer.Generic;
    using FinalGP.RepositoryLayer.Interface;
    using Microsoft.EntityFrameworkCore;

    namespace FinalGP.RepositoryLayer.ClassRepo
    {
        public class HomeRepositorycs : GenericRepository<Home>, IHomeRepository
        {
            private readonly IWebHostEnvironment _env;
            private readonly ESHContext _context;
            private readonly DbSet<Home> _dbset;


            public HomeRepositorycs(IWebHostEnvironment env, ESHContext context) : base(context)
            {
                _env = env;
                _context = context;
                _dbset = _context.Set<Home>();
            }


        public async Task<Home> GetByIdAsync(int id)
        {
            return await _dbset
                .Include(h => h.Photos)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public override Home GetById(int id)
        {
            return _dbset.Include(h => h.Photos).FirstOrDefault(h => h.Id == id);
        }

        public override List<Home> GetAll()
        {
            return _dbset.Include(h => h.Photos).ToList();
        }

        public async Task<(bool success, string fileUrl, string errorMessage)> SaveContractPhoto(IFormFile contractFile)
        {
            return await SaveImage(contractFile, "ContractPhoto");
        }

        public async Task<List<string>> SavePropertyPhotos(List<IFormFile> propertyFiles)
        {
            List<string> fileUrls = new List<string>();

            foreach (var file in propertyFiles)
            {
                var result = await SaveImage(file, "HomePhotos");
                if (result.success)
                {
                    fileUrls.Add(result.fileUrl);
                }
            }

            return fileUrls;
        }
        private async Task<(bool success, string fileUrl, string errorMessage)> SaveImage(IFormFile file, string folderName)
        {
            try
            {
                var wwwRootPath = _env.WebRootPath;
                var folderPath = Path.Combine(wwwRootPath, folderName);

                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                var ext = Path.GetExtension(file.FileName);
                var allowedExtensions = new[] { ".jpg", ".png", ".jpeg" };

                if (!allowedExtensions.Contains(ext.ToLower()))
                {
                    return (false, null, "Only .jpg, .png, and .jpeg extensions are allowed.");
                }

                string uniqueFileName = Guid.NewGuid().ToString() + ext;
                string filePath = Path.Combine(folderPath, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                return (true, $"/{folderName}/{uniqueFileName}", null);
            }
            catch
            {
                return (false, null, "Error occurred while saving image.");
            }
        }
        public async Task<List<string>> SaveMultipleImages(List<IFormFile> imageFiles, string folderName)
        {
            List<string> fileUrls = new List<string>();

            foreach (var file in imageFiles)
            {
                var result = await SaveImage(file, folderName);
                if (result.success)
                {
                    fileUrls.Add(result.fileUrl);
                }
            }

            return fileUrls;
        }

        public async Task DeleteImage(string imageFileName, string folderName)
        {
            var wwwRootPath = _env.WebRootPath;
            var filePath = Path.Combine(wwwRootPath, folderName, imageFileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }

        Task<(bool success, string fileUrl, string errorMessage)> IHomeRepository.SaveImage(IFormFile imageFile, string folderName)
        {
            throw new NotImplementedException();
        }

        public async Task<List<HomeDetailsDto>> SearchHomesAsync(string query)
        {
            int maxErrors = Math.Max(1, query.Length / 5);
            string likeQuery = $"%{query}%";

            var homes = await _context.Homes
                .FromSqlRaw(@"
SELECT * FROM Homes 
WHERE 
    (Title LIKE @p0 OR Description LIKE @p0) 
    OR 
    (dbo.Levenshtein(Title, @p1) <= @p2 OR dbo.Levenshtein(Description, @p1) <= @p2)",
                    likeQuery, query, maxErrors)
                .Include(h => h.Photos)
                .Include(h => h.Facilities)
                .ToListAsync();

            if (homes == null || !homes.Any())
            {
                return new List<HomeDetailsDto>();
            }

            // Filter only approved homes
            var approvedHomes = homes.Where(h => h.Status == HomeApprovalStatus.Approved).ToList();

            // Get average ratings for all approved homes in one query
            var homeIds = approvedHomes.Select(h => h.Id).ToList();
            var ratings = await _context.Ratings
                .Where(r => homeIds.Contains(r.HomeId))
                .GroupBy(r => r.HomeId)
                .Select(g => new { HomeId = g.Key, AverageRate = g.Average(r => r.Score) })
                .ToDictionaryAsync(g => g.HomeId, g => g.AverageRate);

            var matchedHomes = approvedHomes.Select(home => new HomeDetailsDto
            {
                Id = home.Id,
                Title = home.Title,
                Description = home.Description,
                City = home.City,
                LocationDetails = home.LocationDetails,
                DistanceFromUniversity = home.DistanceFromUniversity,
                Gender = home.Gender,
                Floor = home.Floor,
                Type = home.Type,
                ContractPhoto = home.ContractPhoto,
                Photos = home.Photos?.Select(p => p.PhotoUrl).ToList() ?? new List<string>(),
                NumOfRooms = home.NumOfRooms,
                Facilities = home.Facilities?.Select(f => new FacilityDto
                {
                    Id = f.Id,
                    Name = f.Name
                }).ToList() ?? new List<FacilityDto>(),
                ShowRoomsUrl = "", // Keep as is
                Latitude = home.Latitude,
                Longitude = home.Longitude,
                Rate = ratings.ContainsKey(home.Id) ? ratings[home.Id] : 0 // Populate average rating
            }).ToList();

            return matchedHomes;
        }


    }
}
