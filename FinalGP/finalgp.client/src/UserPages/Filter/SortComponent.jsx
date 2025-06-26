import React from 'react';
import './SortComponent.css';

function SortComponent({ sortOption, setSortOption }) {
    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    return (
        <div >
          
            
                <label htmlFor="sort-select" className="sort-label">
                    Sort by:
                </label>
                <select
                    id="sort-select"
                    value={sortOption || ""}
                    onChange={handleSortChange}
                    className="sort-select"
                >
                    <option value="">Default</option>
                    <option value="photos_desc">Photos Count (High to Low)</option>
                    <option value="floor_asc">Floor (Low to High)</option>
                    <option value="price_high">Highest Room Price</option>
                    <option value="price_low">Lowest Room Price</option>
                    <option value="date_desc">Newest Homes</option>
                </select>
                <svg
                    className="select-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
           
        </div>
    );
}

export default SortComponent;