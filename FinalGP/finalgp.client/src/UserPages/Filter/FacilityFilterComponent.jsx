
import React, { useEffect, useState } from 'react';
import './FacilityFilterComponent.css';

// Facility to SVG icon mapping
const facilityIcons = {
    'Air Conditioning': '❄️',
    'WiFi': '📶',
    'Washing Machine': '🧼',
    'Television': '📺',
    'Refrigerator': '🧊',
    'Fan': '🌀',
    'Heater': '🔥',
    'Kettle': '☕',
    'Desk': '🖥️',
    'Wardrobe': '👗',
    'Reception': '🛎️',
    'Water Filter': '💧',
    'Bathroom': '🛁',
    'Kitchen': '🍳',
    'Gym': '🏋️',
    'wifi': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="facility-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>`,
    'default': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="facility-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>` // Heart icon
};

// Normalize facility names to match facilityIcons keys
const normalizeFacilityName = (name) => {
    const nameMap = {
        'موقف سيارات': 'موقف سيارات',
        'شاور': 'شاور',
        'مطبخ': 'مطبخ',
        'حمام': 'حمام',
        'تكييف': 'تكييف',
        'tv': 'TV',
        'wifi': 'wifi',
        // أضيفي المزيد من التطابقات لو الـ API بيرجع تنويعات
    };
    return nameMap[name.toLowerCase()] || name;
};

function FacilityFilterComponent({ selectedFacilities = [], setSelectedFacilities }) {
    const [facilities, setFacilities] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const facilitiesPerView = 8;

    useEffect(() => {
        setIsLoading(true);
        fetch("https://localhost:7194/api/filter/facilities")
            .then(res => res.json())
            .then(data => {
                setFacilities(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching facilities:", err);
                setIsLoading(false);
            });
    }, []);

    const toggleFacility = (facilityId) => {
        if (selectedFacilities.includes(facilityId)) {
            setSelectedFacilities(selectedFacilities.filter(id => id !== facilityId));
        } else {
            setSelectedFacilities([...selectedFacilities, facilityId]);
        }
    };

    const clearAll = () => {
        setSelectedFacilities([]);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => Math.max(prev - facilitiesPerView, 0));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(prev + facilitiesPerView, facilities.length - facilitiesPerView));
    };

    const visibleFacilities = facilities.slice(currentIndex, currentIndex + facilitiesPerView);

    return (
        <div className="facility-filter-container">
            {facilities.length > facilitiesPerView && (
                <button
                    onClick={handlePrev}
                    className="facility-nav-arrow"
                    disabled={currentIndex === 0}
                    aria-label="Previous facilities"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="arrow-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            <div className="facility-filter">
                {isLoading ? (
                    <div className="facility-loading">
                        {[...Array(facilitiesPerView)].map((_, i) => (
                            <div key={i} className="facility-placeholder"></div>
                        ))}
                    </div>
                ) : facilities.length === 0 ? (
                    <div className="facility-error">Failed to load facilities</div>
                ) : (
                    visibleFacilities.map(facility => (
                        <button
                            key={facility.id}
                            className={`facility-btn ${selectedFacilities.includes(facility.id) ? 'selected' : ''}`}
                            onClick={() => toggleFacility(facility.id)}
                            aria-label={`Select ${facility.name}`}
                        >
                            <div
                                className="facility-icon-wrapper"
                                dangerouslySetInnerHTML={{
                                    __html: facilityIcons[normalizeFacilityName(facility.name)] || facilityIcons['default'],
                                }}
                            />
                            <span className="facility-name">{facility.name}</span>
                            <span className="tooltip">{facility.name}</span>
                        </button>
                    ))
                )}
            </div>
            {facilities.length > facilitiesPerView && (
                <button
                    onClick={handleNext}
                    className="facility-nav-arrow"
                    disabled={currentIndex >= facilities.length - facilitiesPerView}
                    aria-label="Next facilities"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="arrow-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
            {selectedFacilities.length > 0 && (
                <button onClick={clearAll} className="clear-all-btn" aria-label="Clear all selected facilities">
                    Clear
                </button>
            )}
        </div>
    );
}

export default FacilityFilterComponent;
