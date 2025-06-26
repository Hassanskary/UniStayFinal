using FinalGP.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FinalGP.RepositoryLayer.Generic
{
    public class GenericRepository<X> : IGenericRepository<X> where X : class
    {
        private readonly ESHContext context;
        private readonly DbSet<X> _dbset;

        public GenericRepository(ESHContext _context)
        {
            context = _context;
            _dbset = _context.Set<X>();
        }

        public IQueryable<X> Query() => _dbset;

        // Get all records
        public virtual List<X> GetAll()
        {
            return _dbset.ToList();
        }

        // Get by ID
        public virtual X GetById(int Id)
        {
            return _dbset.Find(Id);
        }


        // Insert a new entity
        public virtual void Insert(X obj)
        {
            _dbset.Add(obj);
        }

        // Update an entity
        public virtual void Update(X obj)
        {
            _dbset.Attach(obj);
            context.Entry(obj).State = EntityState.Modified;
            // _dbset.Update(obj);

        }

        // Delete by ID
        public virtual void Delete(int Id)
        {
            var entity = GetById(Id);
            if (entity != null)
            {
                _dbset.Remove(entity);
            }
        }

        public virtual void Save()
        {
            context.SaveChanges();
        }

        public virtual async Task SaveAsync()
        {
            await context.SaveChangesAsync();
        }
    }
}
