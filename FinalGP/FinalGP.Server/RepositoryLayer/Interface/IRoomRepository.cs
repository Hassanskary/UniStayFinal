using FinalGP.DTO.Room;
using FinalGP.Models;

namespace FinalGP.RepositoryLayer
{
    public interface IRoomRepository : IGenericRepository<Room>
    {


        public Task<string> GetPhoto(int Id);
        Task<Room> GetRoomById(int roomId);



        // IEnumerable<object> GetAll();
    }
}
