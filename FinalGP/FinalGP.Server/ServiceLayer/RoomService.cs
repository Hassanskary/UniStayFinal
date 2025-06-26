using FinalGP.DTO.Room;

namespace FinalGP.ServiceLayer
{
    public class RoomService : IServiceRoom
    {
        private readonly IRoomRepository roomrepo;
        private readonly IWebHostEnvironment _environment;

        public RoomService(IRoomRepository _roomrepo, IWebHostEnvironment environment)
        {
            roomrepo = _roomrepo;
            this._environment = environment;
        }
        public void Delete(int Id)
        {
            roomrepo.Delete(Id);
        }

        public List<Room> GetAll()
        {
            return roomrepo.GetAll();
        }

        public Room GetById(int Id)
        {
            return roomrepo.GetById(Id);
        }

        public Task<string> GetPhoto(int Id)
        {
            return roomrepo.GetPhoto(Id);
        }

        public Task<Room> GetRoomById(int roomId)
        {
            throw new NotImplementedException();
        }

        public void Insert(Room obj)
        {
            roomrepo.Insert(obj);
        }

        public async Task<Room> MapToRoom(RoomCreateModel roomm, string filename)
        {
            return new Room
            {
                Id = roomm.Id,
                Number = roomm.Number,
                NumOfBeds = roomm.NumOfBeds,
                Photo = filename,
                Price = roomm.Price,
                HomeId = roomm.HomeId,
                IsCompleted = roomm.IsCompleted
            };
        }

        public IQueryable<Room> Query()
        {
            throw new NotImplementedException();
        }

        public bool RemoveRoomImage(string filename)
        {
            if (string.IsNullOrEmpty(filename))
                return false;

            string filePath = Path.Combine(_environment.WebRootPath, "RoomPhotos", filename);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                return true;
            }

            return false;
        }

        public void Save()
        {
            roomrepo.Save();
        }

        public Task SaveAsync()
        {
            throw new NotImplementedException();
        }

        public void Update(Room obj)
        {
            roomrepo.Update(obj);
        }

     

        public async Task<string> UploadRoomImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return null;

            string uploadFolder = Path.Combine(_environment.WebRootPath, "RoomPhotos");

            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            string fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            string filePath = Path.Combine(uploadFolder, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return fileName;
        }
    }
}
