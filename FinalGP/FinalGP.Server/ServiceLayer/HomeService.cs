using FinalGP.DTO.Home;

namespace FinalGP.ServiceLayer
{
    public class HomeService : IServiceHome
    {
        private readonly IHomeRepository _homeRepository;

        public HomeService(IHomeRepository homeRepository)
        {
            _homeRepository = homeRepository;
        }

        public List<HomeDto> GetPendingHomes(string scheme, string host)
        {
            return _homeRepository.GetAll()
                .Where(hh => hh.Status == HomeApprovalStatus.PendingApproval)
                .Select(h => new HomeDto
                {
                    Id = h.Id,
                    Title = h.Title,
                   // LocationDetails = h.LocationDetails,
                   // DistanceFromUniversity = h.DistanceFromUniversity,
                    NumOfRooms = h.NumOfRooms,
                    ContractPhoto = $"{scheme}://{host}/HomeContracts/{h.ContractPhoto}",
                    FirstPhoto = h.Photos.Any() ? $"{scheme}://{host}/HomePhotos/{h.Photos.First().PhotoUrl}" : null,
                    //owner = new OwnerDto()
                    //{
                    //    Name = h.Owner.UserName,
                    //    Email = h.Owner.Email
                    //},
                    //Facilities = h.Facilities.Select(f => f.Name).ToList()
                })
                .ToList();
        }
  
}
}
