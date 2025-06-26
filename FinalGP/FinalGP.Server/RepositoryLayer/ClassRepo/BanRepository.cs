using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class BanRepository : GenericRepository<Ban>, IBanRepository
    {
        public BanRepository(ESHContext _context) : base(_context)
        {
        }
    }
}
