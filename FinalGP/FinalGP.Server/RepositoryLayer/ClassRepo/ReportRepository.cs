using FinalGP.Data;
using FinalGP.Models;
using FinalGP.RepositoryLayer.Generic;
using FinalGP.RepositoryLayer.Interface;

namespace FinalGP.RepositoryLayer.ClassRepo
{
    public class ReportRepository : GenericRepository<Report>, IReportRepository
    {
        public ReportRepository(ESHContext _context) : base(_context)
        {
        }
    }
}
