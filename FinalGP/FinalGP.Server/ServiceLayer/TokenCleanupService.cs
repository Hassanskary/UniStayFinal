

using FinalGP.Data;

public class TokenCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public TokenCleanupService(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<ESHContext>();
                    var expiredTokens = dbContext.revokedtokens
                        .Where(t => t.ExpiryDate < DateTime.UtcNow)
                        .ToList(); // تحويل البيانات إلى List() لتنفيذ الحذف

                    dbContext.revokedtokens.RemoveRange(expiredTokens);
                    await dbContext.SaveChangesAsync();
                    await dbContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in TokenCleanupService: {ex.Message}");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken); // تشغيل كل ساعة
        }
    }
}
