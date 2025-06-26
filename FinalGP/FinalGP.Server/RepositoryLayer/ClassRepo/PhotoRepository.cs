using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class PhotoRepository : GenericRepository<Photo>, IPhotoRepository
    {
        public PhotoRepository(ESHContext _context) : base(_context)
        {
        }
    }
}
