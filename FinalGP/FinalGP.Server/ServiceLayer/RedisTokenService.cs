using FinalGP.Data;
using Microsoft.EntityFrameworkCore.Storage;
//using FinalGP.Model;


namespace FinalGP.ServiceLayer
{

    public interface ITokenService
    {
        void RevokeToken(string token);
        bool IsTokenRevoked(string token);
    }

    public class TokenService : ITokenService
    {
        private readonly ESHContext _context;

        public TokenService(ESHContext context)
        {
            _context = context;
        }

        public void RevokeToken(string token)
        {
            _context.revokedtokens.Add(new RevokedTokens
            {
                Token = token,
                ExpiryDate = DateTime.UtcNow.AddHours(1) // يمكن ضبط الوقت حسب الحاجة
            });
            _context.SaveChanges();
        }

        public bool IsTokenRevoked(string token)
        {
            return _context.revokedtokens.Any(t => t.Token == token);
        }
    }


}
