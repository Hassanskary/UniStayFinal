    using FinalGP.Data;
    using FinalGP.DTO.Room;
    using FinalGP.Models;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Http;
using System;
using System.IO;
    using System.Linq;
    using System.Threading.Tasks;

    namespace FinalGP.RepositoryLayer
    {
        public class RoomRepository : GenericRepository<Room>, IRoomRepository
        {

            private readonly ESHContext context;

            public RoomRepository(ESHContext _context) : base(_context)
            {
                context = _context;

            }

        public async Task<Room> GetRoomById(int roomId)
        {
            return await context.Set<Room>().FindAsync(roomId);
        }
        public async Task<string> GetPhoto(int Id)
            {
                var room = context.Rooms.FirstOrDefault(r => r.Id == Id);
                return room?.Photo;
            }

       
    }
    }
