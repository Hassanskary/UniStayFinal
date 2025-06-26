import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './RoomFilterComponent.css';

Modal.setAppElement('#root');

function RoomFilterComponent({ filterCriteria, setFilterCriteria, searchQuery = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [localMinPrice, setLocalMinPrice] = useState(filterCriteria.minPrice || 0);
    const [localMaxPrice, setLocalMaxPrice] = useState(filterCriteria.maxPrice || 10000);
    const [localMinBeds, setLocalMinBeds] = useState(filterCriteria.minBeds || null);
    const [localMaxBeds, setLocalMaxBeds] = useState(filterCriteria.maxBeds || null);
    const [localMinFloor, setLocalMinFloor] = useState(filterCriteria.minFloor || null);
    const [localMaxFloor, setLocalMaxFloor] = useState(filterCriteria.maxFloor || null);
    const [matchingHomesCount, setMatchingHomesCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Track which slider is active to better handle interactions
    const [activeSlider, setActiveSlider] = useState(null);

    useEffect(() => {
        // Add event listener to detect when mouse is released
        const handleMouseUp = () => {
            setActiveSlider(null);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        // Fetch the count of matching homes whenever filter criteria or searchQuery change
        const fetchMatchingHomesCount = async () => {
            setIsLoading(true);
            try {
                const requestBody = {
                    MinPrice: localMinPrice,
                    MaxPrice: localMaxPrice,
                    MinBeds: localMinBeds,
                    MaxBeds: localMaxBeds,
                    MinFloor: localMinFloor,
                    MaxFloor: localMaxFloor
                };
                const url = searchQuery && searchQuery.trim()
                    ? `https://localhost:7194/api/filter/homes/count?search=${encodeURIComponent(searchQuery)}`
                    : `https://localhost:7194/api/filter/homes/count`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Failed to fetch matching homes count. Status:', response.status, 'Message:', errorText);
                    throw new Error('Failed to fetch matching homes count');
                }
                const count = await response.json();
                setMatchingHomesCount(count);
            } catch (error) {
                console.error('Error fetching matching homes count:', error);
                setMatchingHomesCount(0); // Default to 0 on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchMatchingHomesCount();
    }, [localMinPrice, localMaxPrice, localMinBeds, localMaxBeds, localMinFloor, localMaxFloor, searchQuery]);

    const applyFilter = () => {
        setFilterCriteria({
            ...filterCriteria,
            minPrice: localMinPrice,
            maxPrice: localMaxPrice,
            minBeds: localMinBeds,
            maxBeds: localMaxBeds,
            minFloor: localMinFloor,
            maxFloor: localMaxFloor
        });
        setIsOpen(false);
    };

    const resetFilter = () => {
        setLocalMinPrice(0);
        setLocalMaxPrice(10000);
        setLocalMinBeds(null);
        setLocalMaxBeds(null);
        setLocalMinFloor(null);
        setLocalMaxFloor(null);
    };

    // Improved handlers for price sliders
    const handleMinPriceChange = (e) => {
        const value = Number(e.target.value);
        if (value <= localMaxPrice) {
            setLocalMinPrice(value);
        }
    };

    const handleMaxPriceChange = (e) => {
        const value = Number(e.target.value);
        if (value >= localMinPrice) {
            setLocalMaxPrice(value);
        }
    };

    // Enhanced beds handling
    const handleMinBedsChange = (value) => {
        if (value === null) {
            setLocalMinBeds(null);
            return;
        }
        const newMinBeds = Math.max(0, Math.min(value, 10));
        if (localMaxBeds !== null) {
            setLocalMinBeds(Math.min(newMinBeds, localMaxBeds));
        } else {
            setLocalMinBeds(newMinBeds);
        }
    };

    const handleMaxBedsChange = (value) => {
        if (value === null) {
            setLocalMaxBeds(null);
            return;
        }
        const newMaxBeds = Math.max(0, Math.min(value, 10));
        if (localMinBeds !== null) {
            setLocalMaxBeds(Math.max(newMaxBeds, localMinBeds));
        } else {
            setLocalMaxBeds(newMaxBeds);
        }
    };

    // Enhanced floor handling (matching beds behavior)
    const handleMinFloorChange = (value) => {
        if (value === null) {
            setLocalMinFloor(null);
            return;
        }
        const newMinFloor = Math.max(0, Math.min(value, 51));
        if (localMaxFloor !== null) {
            setLocalMinFloor(Math.min(newMinFloor, localMaxFloor));
        } else {
            setLocalMinFloor(newMinFloor);
        }
    };

    const handleMaxFloorChange = (value) => {
        if (value === null) {
            setLocalMaxFloor(null);
            return;
        }
        const newMaxFloor = Math.max(0, Math.min(value, 51));
        if (localMinFloor !== null) {
            setLocalMaxFloor(Math.max(newMaxFloor, localMinFloor));
        } else {
            setLocalMaxFloor(newMaxFloor);
        }
    };

    return (
        <>
            <button className="filter-btn" onClick={() => setIsOpen(true)} title="Filter">
                <img
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABjUlEQVR4nO2Yu0oDURCGP7WMllprvOCll6A+iDYqqE+QwiKgNhELBX0CL8RHUGt9g0C0SiV5A0GJhSsHRjkcNu6u2WTPkvlgGLKzk509lznLD4qiKIPIEnADtIC2+GtgkRywAXwCQYiZl1nHY+aA9w7FB2ImPoOnXFiFNoBloCC+YcXOu3nIMfARMUpp2Irz3NWI+01N1ajih4C3PhQfyMjbFGLkmNoiqWY0A2tpzEC/90BJRr6U5h7oJbN570JIn2/n9Rz4YQG4Al6laOMvgfnfO5S/mQb2gH3xRXLCGHALfDlr1/yuSdxbRoCniA5i4sN4yrZT7B1wKt6+vuXD+i7L+ratbhV54OQcWrF6SG4aVo6715oxPgPGnZyJPn0/NQfiBYpABThx7MX6I7NkbI6s2HNIbhpW6bZdu5v4HjgDHpzrm+S4jT763EaRg6rW4SAzKsMoOWEK2JX2tgNMZl2QEhMVtLJCBS2fhK2kglbgm7D1H0Er8EnYSipoBUlmoFeooOUDKmgpiqLgHd9BseCoaLoAOwAAAABJRU5ErkJggg=="
                    alt="Filter Icon"
                    style={{ width: "24px", height: "24px" }}
                />
            </button>

            <Modal
                isOpen={isOpen}
                onRequestClose={() => setIsOpen(false)}
                className="room-filter-modal"
                overlayClassName="modal-overlay"
            >
    
                <h2>Filters</h2>

                <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                <div style={{
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ccc, transparent)',
                    margin: '20px 0'
                }} />

                <div className="filter-section-model">

                    <h3>Price Range</h3>
                    <div className="price-range-container">
                        <div className="price-slider-track"></div>
                        <div
                            className="price-slider-progress"
                            style={{
                                left: `${(localMinPrice / 10000) * 100}%`,
                                width: `${((localMaxPrice - localMinPrice) / 10000) * 100}%`
                            }}
                        ></div>
                        <div className="dual-range-slider">
                            <input
                                type="range"
                                min="0"
                                max="10000"
                                value={localMinPrice}
                                onChange={handleMinPriceChange}
                                onMouseDown={() => setActiveSlider('min')}
                                onTouchStart={() => setActiveSlider('min')}
                                className={`price-range min-price ${activeSlider === 'min' ? 'active' : ''}`}
                            />
                            <input
                                type="range"
                                min="0"
                                max="10000"
                                value={localMaxPrice}
                                onChange={handleMaxPriceChange}
                                onMouseDown={() => setActiveSlider('max')}
                                onTouchStart={() => setActiveSlider('max')}
                                className={`price-range max-price ${activeSlider === 'max' ? 'active' : ''}`}
                            />
                        </div>
                        <div className="price-labels">
                            <div className="price-input">
                                <span>Minimum</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10000"
                                    value={localMinPrice}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        if (value <= localMaxPrice && value >= 0 && value <= 10000) {
                                            setLocalMinPrice(value);
                                        } else if (value >= localMaxPrice) {
                                            setLocalMinPrice(localMaxPrice);
                                        }
                                    }}
                                />
                                $<span>{localMinPrice}</span>
                            </div>
                            <div className="price-input">
                                <span>Maximum</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10000"
                                    value={localMaxPrice}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        if (value >= localMinPrice && value >= 0 && value <= 10000) {
                                            setLocalMaxPrice(value);
                                        } else if (value <= localMinPrice) {
                                            setLocalMaxPrice(localMinPrice);
                                        }
                                    }}
                                />
                                $<span>{localMaxPrice}</span>
                            </div>
                        </div>
                    </div>
                </div><div style={{
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ccc, transparent)',
                    margin: '20px 0'
                }} />

                <div className="filter-section-model">

                    <h3>Beds</h3>
                    <div className="range-control">
                        <label>Min</label>
                        <button onClick={() => handleMinBedsChange(localMinBeds > 0 ? localMinBeds - 1 : null)}>-</button>
                        <span>{localMinBeds !== null ? localMinBeds : 'Any'}</span>
                        <button onClick={() => handleMinBedsChange((localMinBeds !== null ? localMinBeds : 0) + 1)}>+</button>
                    </div>
                    <div className="range-control">
                        <label>Max</label>
                        <button onClick={() => handleMaxBedsChange(localMaxBeds > 0 ? localMaxBeds - 1 : null)}>-</button>
                        <span>{localMaxBeds !== null ? localMaxBeds : 'Any'}</span>
                        <button onClick={() => handleMaxBedsChange((localMaxBeds !== null ? localMaxBeds : 0) + 1)}>+</button>
                    </div>
                </div><div style={{
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ccc, transparent)',
                    margin: '20px 0'
                }} />

                <div className="filter-section-model">
                   

                    <h3>Floor</h3>
                    <div className="range-control">
                        <label>Min</label>
                        <button onClick={() => handleMinFloorChange(localMinFloor > 0 ? localMinFloor - 1 : null)}>-</button>
                        <span>{localMinFloor !== null ? localMinFloor : 'Any'}</span>
                        <button onClick={() => handleMinFloorChange((localMinFloor !== null ? localMinFloor : 0) + 1)}>+</button>
                    </div>

                    <div className="range-control">
                        <label>Max</label>
                        <button onClick={() => handleMaxFloorChange(localMaxFloor > 0 ? localMaxFloor - 1 : null)}>-</button>
                        <span>{localMaxFloor !== null ? localMaxFloor : 'Any'}</span>
                        <button onClick={() => handleMaxFloorChange((localMaxFloor !== null ? localMaxFloor : 0) + 1)}>+</button>
                    </div>
                </div>
                <div style={{
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #ccc, transparent)',
                    margin: '20px 0'
                }} />

                <div className="modal-actions">
                    <button className="clear-btn" onClick={resetFilter}>Clear All</button>
                    <button className="apply-btn" onClick={applyFilter}>
                        {isLoading ? 'Loading...' : `Show ${matchingHomesCount} homes`}
                    </button>
                </div>
            </Modal>
        </>
    );
}

export default RoomFilterComponent;