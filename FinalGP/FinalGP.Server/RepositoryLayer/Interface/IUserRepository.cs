using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using System.Threading.Tasks;

namespace FinalGP.RepositoryLayer.Interface
{
    public interface IUserRepository : IGenericRepository<ApplicationUser>
    {
    }
}