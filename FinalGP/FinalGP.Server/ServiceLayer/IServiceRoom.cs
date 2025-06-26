using FinalGP.DTO.Room;

namespace FinalGP.ServiceLayer
{
    public interface IServiceRoom:IRoomRepository
    {
        public Task<Room> MapToRoom(RoomCreateModel roomm, string filename);
        public bool RemoveRoomImage(string filename);
        public Task<string> UploadRoomImage(IFormFile file);
    }
}
