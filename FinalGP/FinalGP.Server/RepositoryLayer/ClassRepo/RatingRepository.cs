using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class RatingRepository : GenericRepository<Rating>, IRatingRepository
    {
        public RatingRepository(ESHContext _context) : base(_context)
        {
        }
    }
}
