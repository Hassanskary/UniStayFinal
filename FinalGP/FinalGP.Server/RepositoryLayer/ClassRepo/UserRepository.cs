using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class UserRepository : GenericRepository<ApplicationUser>, IUserRepository
    {
        public UserRepository(ESHContext _context) : base(_context)
        {

        }

       
    }
}