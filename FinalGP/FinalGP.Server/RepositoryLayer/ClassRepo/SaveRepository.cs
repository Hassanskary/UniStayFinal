using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class SaveRepository : GenericRepository<Save>, ISaveRepository
    {
        public SaveRepository(ESHContext _context) : base(_context)
        {
        }
    }
}
