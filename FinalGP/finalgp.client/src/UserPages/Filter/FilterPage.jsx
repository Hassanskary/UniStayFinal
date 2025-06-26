import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import FacilityFilterComponent from "./FacilityFilterComponent";
import RoomFilterComponent from "./RoomFilterComponent";
import MapFilterComponent from "./MapFilterComponent";
import SortComponent from "./SortComponent";
import { CompareHomesContext } from "../../hooks/CompareHomesContext";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./FilterPage.css";
import FilterHeroSection from "./FilterHeroSection";

function HomeCard({ home }) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const intervalRef = useRef(null);
    const { addHomeToCompare, removeHome, comparedHomes } = useContext(CompareHomesContext);
    const navigate = useNavigate();

    const photos = Array.isArray(home.photos) && home.photos.length > 0
        ? home.photos
        : ["/images/default-home.jpg"];

    const isGuestFavorite = (home.rate ?? 0) >= 4;
    const homeId = home.id || home._id;
    const isSaved = comparedHomes.some((h) => (h.id || h._id) === homeId);

    const token = localStorage.getItem("token");
    const canSave = Boolean(token);
    const effectiveIsSaved = canSave ? isSaved : false;

    const startAutoSlide = () => {
        if (photos.length < 2) return;
        intervalRef.current = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
        }, 1700);
    };

    const stopAutoSlide = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleNextPhoto = (e) => {
        e.stopPropagation();
        if (photos.length < 2) return;
        setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
        stopAutoSlide();
    };

    const handlePrevPhoto = (e) => {
        e.stopPropagation();
        if (photos.length < 2) return;
        setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
        stopAutoSlide();
    };

    const handleToggleSave = (e) => {
        e.stopPropagation();
        if (!canSave) {
            toast.error("⚠You must be logged in to save a home.");
            return;
        }
        if (!isSaved) {
            addHomeToCompare(home);
            toast.success("✅Added this home to my saves");
        } else {
            removeHome(homeId);
            toast.warning("❌Removed this home from my saves");
        }
    };

    const handleCardClick = () => {
        navigate(`/detailsH/${homeId}`);
    };

    return (
        <div className="filter-home-card" onClick={handleCardClick}>
            <div
                className="filter-photo-slider"
                onMouseEnter={startAutoSlide}
                onMouseLeave={stopAutoSlide}
            >
                <img
                    src={photos[currentPhotoIndex]}
                    alt={home.title || "Approved Home"}
                    className="filter-home-image"
                    loading="lazy"
                />
                {photos.length > 1 && (
                    <div className="filter-slider-arrows">
                        <button onClick={handlePrevPhoto} className="arrow-btn arrow-left">
                            <img src="/arrow-left.png" alt="Previous" className="arrow-img" />
                        </button>
                        <button onClick={handleNextPhoto} className="arrow-btn arrow-right">
                            <img src="/arrow-right.png" alt="Next" className="arrow-img" />
                        </button>
                    </div>
                )}
                {isGuestFavorite && <div className="filter-favorite-badge">Guest favorite</div>}
                <div className="filter-save-icon" onClick={handleToggleSave}>
                    {effectiveIsSaved ? (
                        <span className="filter-heart-icon filter-saved"></span>
                    ) : (
                        <span className="filter-heart-icon"></span>
                    )}
                </div>
            </div>
            <div className="filter-home-info">
                <h3>{home.title}</h3>
                <p>{home.city}</p>
                <span>⭐ {(home.rate ?? 0).toFixed(1)}</span>
            </div>
        </div>
    );
}
function FilterPage() {
    const [homes, setHomes] = useState([]);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalHomesCount, setTotalHomesCount] = useState(0);
    const [viewMode, setViewMode] = useState("list");
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [sortOption, setSortOption] = useState("");
    const homesPerPage = 12;
    const abortControllerRef = useRef(null);
    const location = useLocation();

    const [filterCriteria, setFilterCriteria] = useState({
        facilityIds: [],
        minPrice: null,
        maxPrice: null,
        minBeds: null,
        maxBeds: null,
        minFloor: null,
        maxFloor: null,
        homeType: null,
        gender: null,
        city: null,
        latitude: null,
        longitude: null,
        radius: 10
    });

    // Extract search query from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const query = params.get("search") || "";
        setSearchQuery(query);
        console.log("FilterPage: URL search query updated to:", query);
    }, [location]);

    const fetchFilteredHomes = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

        const skip = (currentPage - 1) * homesPerPage;
        const requestBody = {
            ...filterCriteria,
            latitude: selectedLocation ? selectedLocation.lat : null,
            longitude: selectedLocation ? selectedLocation.lng : null,
            radius: selectedLocation ? filterCriteria.radius : null,
            sortOption: sortOption || ""
        };
        console.log("FilterPage: Sending request to /api/filter/homes with body:", requestBody, "search:", searchQuery, "skip:", skip, "take:", homesPerPage);

        try {
            const res = await fetch(`https://localhost:7194/api/filter/homes?skip=${skip}&take=${homesPerPage}&search=${encodeURIComponent(searchQuery)}`, {
                method: 'POST',
                signal: controller.signal,
                headers,
                body: JSON.stringify(requestBody)
            });
            console.log("FilterPage: Received raw response status:", res.status, res.statusText);
            if (!res.ok) {
                const text = await res.text();
                console.error("FilterPage: Response text on error:", text);
                throw new Error(`HTTP error! status: ${res.status}, message: ${text}`);
            }
            const data = await res.json();
            console.log("FilterPage: Received response from /api/filter/homes:", data);
            let processedHomes = data.map((home, index) => ({
                ...home,
                id: home.id || `${home.title}-${index}-${Date.now()}`,
                photos: home.photos || []
            }));

            setHomes(processedHomes);
            setError(null);

            if (processedHomes.length === 0 && totalHomesCount > 0) {
                const newTotalPages = Math.ceil(totalHomesCount / homesPerPage);
                if (currentPage > newTotalPages) {
                    setCurrentPage(newTotalPages || 1);
                }
            }
        } catch (err) {
            if (err.name === "AbortError") {
                console.log("FilterPage: Request aborted:", err);
                return;
            }
            console.error("FilterPage: Error fetching homes:", err);
            setError("Failed to fetch filtered homes. " + err.message);
        }
    }, [currentPage, filterCriteria, searchQuery, totalHomesCount, selectedLocation, sortOption]);

    const fetchTotalHomesCount = useCallback(async () => {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

        const requestBody = {
            ...filterCriteria,
            latitude: selectedLocation ? selectedLocation.lat : null,
            longitude: selectedLocation ? selectedLocation.lng : null,
            radius: selectedLocation ? filterCriteria.radius : null
        };
        console.log("FilterPage: Sending request to /api/filter/homes/count with body:", requestBody, "search:", searchQuery);

        try {
            const res = await fetch(`https://localhost:7194/api/filter/homes/count?search=${encodeURIComponent(searchQuery)}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });
            console.log("FilterPage: Received raw count response status:", res.status, res.statusText);
            if (!res.ok) {
                const text = await res.text();
                console.error("FilterPage: Count response text on error:", text);
                throw new Error(`HTTP error! status: ${res.status}, message: ${text}`);
            }
            const count = await res.json();
            console.log("FilterPage: Received count from /api/filter/homes/count:", count);
            setTotalHomesCount(count || 0);
        } catch (err) {
            console.error("FilterPage: Error fetching homes count:", err);
            setTotalHomesCount(0);
        }
    }, [filterCriteria, searchQuery, selectedLocation]);

    useEffect(() => {
        fetchTotalHomesCount();
    }, [fetchTotalHomesCount]);

    useEffect(() => {
        if (totalHomesCount > 0) {
            fetchFilteredHomes();
        } else {
            setHomes([]);
            setCurrentPage(1);
        }
    }, [currentPage, totalHomesCount, fetchFilteredHomes, sortOption]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterCriteria, searchQuery, sortOption]);

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= Math.ceil(totalHomesCount / homesPerPage)) {
            setCurrentPage(pageNumber);
        }
    };

    const totalPages = Math.ceil(totalHomesCount / homesPerPage);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        console.log("FilterPage: Filter changed - name:", name, "value:", value);
        setFilterCriteria(prev => ({
            ...prev,
            [name]: value === "" ? null : value
        }));
    };

    const handleLocationSelect = (location) => {
        setSelectedLocation(location);
        fetchFilteredHomes();
    };

    const clearAllFilters = () => {
        
            console.log("FilterPage: Clearing all filters");
            setFilterCriteria({
                facilityIds: [],
                minPrice: null,
                maxPrice: null,
                minBeds: null,
                maxBeds: null,
                minFloor: null,
                maxFloor: null,
                homeType: null,
                gender: null,
                city: null,
                latitude: null,
                longitude: null,
                radius: 10
            });
            setSelectedLocation(null);
            setSortOption("");
            setCurrentPage(1);
            toast.success("✅ Clear Filter done!");
        
    };

    return (
        <div className="filter-page">
            <ToastContainer
                position="top-center"
                autoClose={false}
                hideProgressBar
                closeOnClick
                pauseOnHover
                draggable
                closeButton
                icon={false}
                toastClassName={({ type }) =>
                    type === "success"
                        ? "custom-toast success-toast"
                        : type === "error"
                            ? "custom-toast error-toast"
                            : type === "warning"
                                ? "custom-toast warning-toast"
                                : "custom-toast"
                }
            />
            <FilterHeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

            <div className="filter-section">
                <select name="homeType" value={filterCriteria.homeType || ""} onChange={handleFilterChange} className="filter-select">
                    <option value="">All Home Types</option>
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                </select>

                <select name="gender" value={filterCriteria.gender || ""} onChange={handleFilterChange} className="filter-select">
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <select name="city" value={filterCriteria.city || ""} onChange={handleFilterChange} className="filter-select">
                    <option value="">All Cities</option>
                    <option value="General">General</option>
                    <option value="Alexandria">Alexandria</option>
                    <option value="Aswan">Aswan</option>
                    <option value="Asyut">Asyut</option>
                    <option value="Beheira">Beheira</option>
                    <option value="BeniSuef">BeniSuef</option>
                    <option value="Cairo">Cairo</option>
                    <option value="Dakahlia">Dakahlia</option>
                    <option value="Damietta">Damietta</option>
                    <option value="Faiyum">Faiyum</option>
                    <option value="Gharbia">Gharbia</option>
                    <option value="Giza">Giza</option>
                    <option value="Ismailia">Ismailia</option>
                    <option value="KafrElSheikh">KafrElSheikh</option>
                    <option value="Luxor">Luxor</option>
                    <option value="Matruh">Matruh</option>
                    <option value="Minya">Minya</option>
                    <option value="Monufia">Monufia</option>
                    <option value="NewValley">NewValley</option>
                    <option value="NorthSinai">NorthSinai</option>
                    <option value="PortSaid">PortSaid</option>
                    <option value="Qalyubia">Qalyubia</option>
                    <option value="Qena">Qena</option>
                    <option value="RedSea">RedSea</option>
                    <option value="Sharqia">Sharqia</option>
                    <option value="Sohag">Sohag</option>
                    <option value="SouthSinai">SouthSinai</option>
                    <option value="Suez">Suez</option>
                </select>
                <SortComponent sortOption={sortOption} setSortOption={setSortOption} />
                <div className="view-toggle-container flex gap-2">
                    <button
                        className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        List
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === "map" ? "active" : ""}`}
                        onClick={() => setViewMode("map")}
                    >
                        Map
                    </button>
                </div>
            </div>
            <div className="filter-section-container">
                <FacilityFilterComponent
                    selectedFacilities={filterCriteria.facilityIds}
                    setSelectedFacilities={(ids) => setFilterCriteria(prev => ({ ...prev, facilityIds: ids }))}
                />
                <RoomFilterComponent
                    filterCriteria={filterCriteria}
                    setFilterCriteria={setFilterCriteria}
                    searchQuery={searchQuery}
                />
            </div>
            <div className="filter-controls">
                <button className="clear-all-filters-btn" onClick={clearAllFilters}>
                    Clear All Filters
                </button>
            </div>
            <div className="content-container">
               
                <div className={`filter-homes-section ${viewMode === "map" ? "map-view" : ""}`}>
                    {error ? (
                        <div className="error">{error}</div>
                    ) : (
                        homes.map((home, index) => (
                            <HomeCard key={index} home={home} />
                        ))
                    )}
                </div>
                {viewMode === "map" && (
                    <div className="map-container">
                        <MapFilterComponent onLocationSelect={handleLocationSelect} />
                    </div>
                )}
            </div>
            {totalPages > 1 && (
                <div className="filter-pagination">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="filter-pagination-arrow"
                    >
                        ← Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`filter-pagination-number ${currentPage === page ? "active" : ""}`}
                            disabled={page > totalPages}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || homes.length === 0}
                        className="filter-pagination-arrow"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}

export default FilterPage;