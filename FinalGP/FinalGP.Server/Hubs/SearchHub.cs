using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Generic;
using System.Threading.Tasks;

public class SearchHub : Hub
{
    private readonly IHomeRepository _homerepo;

    public SearchHub(IHomeRepository homerepo)
    {
        this._homerepo = homerepo;
    }
    public async Task SendResults(string search)
    {

        var homes = _homerepo.SearchHomesAsync(search);
        await Clients.Caller.SendAsync("ReceiveSearchResults", homes);
    }
}
