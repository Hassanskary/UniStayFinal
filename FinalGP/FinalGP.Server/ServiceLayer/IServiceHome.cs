using FinalGP.DTO.Home;

namespace FinalGP.ServiceLayer
{
    public interface IServiceHome
    {
        public List<HomeDto> GetPendingHomes(string scheme, string host);

    }
}
