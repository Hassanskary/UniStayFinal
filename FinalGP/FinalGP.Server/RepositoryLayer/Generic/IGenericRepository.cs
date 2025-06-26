namespace FinalGP.RepositoryLayer.Generic
{
    public interface IGenericRepository<T> where T : class
    {

        IQueryable<T> Query();
        List<T> GetAll();

        T GetById(int Id);

        void Insert(T obj);

        void Delete(int Id);
        void Update(T obj);
         void Save();
        Task SaveAsync(); 

    }
}
