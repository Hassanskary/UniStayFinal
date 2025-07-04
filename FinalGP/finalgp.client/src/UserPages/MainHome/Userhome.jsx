import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import Navbar from "../../components/Navbar";
import HeroSection from "./HeroSection";
import FacilityFilterComponent from "../Filter/FacilityFilterComponent";
import RoomFilterComponent from "../Filter/RoomFilterComponent";
import { CompareHomesContext } from "../../hooks/CompareHomesContext";
import ChatbotUI from "../../components/ChatbotUI";
import "./Userhome.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";

const assignHomeId = (home, index) => {
    if (!home.id) {
        home.id = home._id || `${home.title}-${index}-${Date.now()}`;
    }
    return home;
};

function HomeCard({ home }) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const { addHomeToCompare, removeHome, comparedHomes } = useContext(CompareHomesContext);
    const navigate = useNavigate();
    const intervalRef = useRef(null);

    const photos = Array.isArray(home.photos) && home.photos.length > 0
        ? home.photos
        : ["/images/default-home.jpg"];

    const isGuestFavorite = (home.rate ?? 0) >= 4;
    const homeId = home.id || home._id;
    const isSaved = comparedHomes.some((h) => (h.id || h._id) === homeId);

    const token = localStorage.getItem("token");
    const canSave = Boolean(token);
    const effectiveIsSaved = canSave ? isSaved : false;

    const handleNextPhoto = (e) => {
        e.stopPropagation();
        if (photos.length < 2) return;
        setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const handlePrevPhoto = (e) => {
        e.stopPropagation();
        if (photos.length < 2) return;
        setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
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


    const handleMouseEnter = () => {
        setIsHovered(true);
        startAutoSlide();
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        stopAutoSlide();
    };


    useEffect(() => {
        return () => stopAutoSlide();
    }, []);

    return (
        <div className="home-card" onClick={handleCardClick}>

            <div
                className="photo-slider"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <img
                    src={photos[currentPhotoIndex]}
                    alt={home.title || "Approved Home"}
                    className="home-image"
                    loading="lazy"
                />
                {photos.length > 1 && (
                    <>
                        <button onClick={handlePrevPhoto} className="arrow-btn arrow-left">
                            <img src="/arrow-left.png" alt="Previous" className="arrow-img" />
                        </button>
                        <button onClick={handleNextPhoto} className="arrow-btn arrow-right">
                            <img src="/arrow-right.png" alt="Next" className="arrow-img" />
                        </button>
                    </>
                )}
                {isGuestFavorite && <div className="favorite-badge">Guest favorite</div>}
                <div className="save-icon" onClick={handleToggleSave}>
                    {effectiveIsSaved ? (
                        <span className="heart-icon saved"></span>
                    ) : (
                        <span className="heart-icon"></span>
                    )}
                </div>
            </div>
            <div className="home-info">
                <h3>{home.title}</h3>
                <p>{home.city}</p>
                <span>⭐ {(home.rate ?? 0).toFixed(1)}</span>
            </div>
        </div>
    );
}
function HomePageContent() {
    const [homes, setHomes] = useState([]);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [role, setRole] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalHomesCount, setTotalHomesCount] = useState(0);
    const [pageWithContentMap, setPageWithContentMap] = useState({});
    const homesPerPage = 12;
    const abortControllerRef = useRef(null);
    const { updateComparedHomes } = useContext(CompareHomesContext);

    const [filterCriteria, setFilterCriteria] = useState({
        facilityIds: [],
        minPrice: null,
        maxPrice: null,
        minBeds: null,
        maxBeds: null,
        minFloor: null,
        maxFloor: null
    });

    function parseJwt(token) {
        if (!token) return null;
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        try {
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("HomePage: Failed to parse JWT:", e);
            return null;
        }
    }

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUserId = localStorage.getItem("userId") || "guest";
        const localKey = `comparedHomes_${storedUserId}`;
        const localSaves = JSON.parse(localStorage.getItem(localKey) || "[]");

        if (token) {
            const decoded = parseJwt(token);
            const userRole =
                decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
                decoded?.role ||
                "";
            setRole(userRole);
        }

        if (token && storedUserId !== "guest" && localSaves.length === 0) {
            fetch(`https://localhost:7194/api/Save/${storedUserId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => res.json())
                .then((data) => {
                    const transformed = data.map((item) => ({
                        id: item.id,
                        title: item.title,
                        city: item.city,
                        rate: item.rate,
                        photos: item.photos
                    }));
                    localStorage.setItem(localKey, JSON.stringify(transformed));
                    if (updateComparedHomes) {
                        updateComparedHomes(transformed);
                    }
                })
                .catch((err) => console.error("HomePage: Error fetching user saves", err));
        }
    }, []);

    const fetchApprovedHomesCount = useCallback(async () => {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await fetch("https://localhost:7194/api/HomePage/HomeApprovedCount", { headers });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const count = await res.json();
            setTotalHomesCount(count);
            return count;
        } catch (err) {
            console.error("HomePage: Error fetching homes count:", err);
            return 0;
        }
    }, []);

    // New function to find the first page with content
    const findFirstPageWithContent = useCallback(async () => {
        // Try from page 1 up to a reasonable limit
        for (let page = 1; page <= Math.ceil(totalHomesCount / homesPerPage); page++) {
            const hasContent = await checkPageHasContent(page);
            if (hasContent) {
                return page;
            }
        }
        return 1; // Default to page 1 if no content found
    }, [totalHomesCount, filterCriteria]);

    // Helper function to check if a page has content with current filters
    const checkPageHasContent = useCallback(async (pageNumber) => {
        const skip = (pageNumber - 1) * homesPerPage;
        const requestBody = {
            facilityIds: filterCriteria.facilityIds,
            minPrice: filterCriteria.minPrice,
            maxPrice: filterCriteria.maxPrice,
            minBeds: filterCriteria.minBeds,
            maxBeds: filterCriteria.maxBeds,
            minFloor: filterCriteria.minFloor,
            maxFloor: filterCriteria.maxFloor
        };

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await fetch(`https://localhost:7194/api/filter/homes?skip=${skip}&take=${homesPerPage}`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) {
                return false;
            }

            const data = await res.json();
            return data && data.length > 0;
        } catch (err) {
            console.error(`Error checking content for page ${pageNumber}:`, err);
            return false;
        }
    }, [filterCriteria, homesPerPage]);

    // Update page content map when filters or search changes
    const updatePageContentMap = useCallback(async () => {
        const newMap = {};
        const totalPages = Math.ceil(totalHomesCount / homesPerPage);

        // Check a reasonable number of pages
        const pagesToCheck = Math.min(totalPages, 10);

        for (let page = 1; page <= pagesToCheck; page++) {
            newMap[page] = await checkPageHasContent(page);
        }

        setPageWithContentMap(newMap);
        return newMap;
    }, [totalHomesCount, homesPerPage, checkPageHasContent]);

    const fetchFilteredHomes = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const skip = (currentPage - 1) * homesPerPage;
        const requestBody = {
            facilityIds: filterCriteria.facilityIds,
            minPrice: filterCriteria.minPrice,
            maxPrice: filterCriteria.maxPrice,
            minBeds: filterCriteria.minBeds,
            maxBeds: filterCriteria.maxBeds,
            minFloor: filterCriteria.minFloor,
            maxFloor: filterCriteria.maxFloor
        };

        console.log("HomePage: Sending request to /api/filter/homes with body:", requestBody, "skip:", skip, "take:", homesPerPage);

        try {
            const res = await fetch(`https://localhost:7194/api/filter/homes?skip=${skip}&take=${homesPerPage}`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP error! status: ${res.status}, message: ${text}`);
            }

            const data = await res.json();
            console.log("HomePage: Received response from /api/filter/homes:", data);

            // If we got no homes and we're not on page 1, find a page with content
            if (data.length === 0 && currentPage > 1) {
                // Update content map
                const contentMap = await updatePageContentMap();

                // Find first page with content
                let pageWithContent = 1;
                for (let i = 1; i <= Math.ceil(totalHomesCount / homesPerPage); i++) {
                    if (contentMap[i]) {
                        pageWithContent = i;
                        break;
                    }
                }

                // Only change page if we're not already there
                if (pageWithContent !== currentPage) {
                    setCurrentPage(pageWithContent);
                    // The useEffect will reload data for the new page
                    return;
                }
            }

            const processedHomes = data.map((home, index) =>
                assignHomeId({ ...home, photos: home.photos || [] }, index)
            );
            setHomes(processedHomes);
            setError(null);

            // Update page content map after successful fetch
            updatePageContentMap();
        } catch (err) {
            if (err.name === "AbortError") return;
            console.error("HomePage: Error fetching homes:", err);
            setError("Failed to fetch filtered homes. " + err.message);
            setHomes([]);
        }
    }, [currentPage, filterCriteria, totalHomesCount, homesPerPage, updatePageContentMap]);

    const fetchSearchResults = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        console.log("HomePage: Sending search request with query:", searchQuery);

        fetch(
            `https://localhost:7194/api/HomePage/search?Search=${encodeURIComponent(searchQuery)}`,
            {
                signal: controller.signal,
                headers,
            }
        )
            .then((res) => {
                if (!res.ok) {
                    return res.text().then((text) => {
                        throw new Error(text || "No Match Result");
                    });
                }
                return res.json();
            })
            .then((data) => {
                console.log("HomePage: Received search results:", data);
                const processedHomes = data.map((home, index) =>
                    assignHomeId({ ...home, photos: home.photos || [] }, index)
                );
                setHomes(processedHomes);
                setError(null);

                // Reset pagination for search results
                setCurrentPage(1);
                // Update total count based on search results
                setTotalHomesCount(data.length);
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                console.error("HomePage: Error fetching search results:", err);
                setHomes([]);
                setError(err.message);
                setTotalHomesCount(0);
            });
    }, [searchQuery]);

    const handleSearch = useCallback(() => {
        if (searchQuery.trim() === "") {
            fetchFilteredHomes();
            fetchApprovedHomesCount();
        } else {
            fetchSearchResults();
        }
    }, [searchQuery, fetchFilteredHomes, fetchSearchResults, fetchApprovedHomesCount]);

    // Initial load
    useEffect(() => {
        fetchFilteredHomes();
        fetchApprovedHomesCount().then(() => {
            updatePageContentMap();
        });
    }, [fetchFilteredHomes, fetchApprovedHomesCount, updatePageContentMap]);

    // Handle search & filter changes
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            handleSearch();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, handleSearch]);

    // Handle page changes
    useEffect(() => {
        fetchFilteredHomes();
    }, [currentPage, fetchFilteredHomes]);

    // Effect to update content map when filters change
    useEffect(() => {
        updatePageContentMap();
    }, [filterCriteria, updatePageContentMap, totalHomesCount]);

    const handlePageChange = (pageNumber) => {
        if (pageNumber !== currentPage) {
            setCurrentPage(pageNumber);
        }
    };

    const totalPages = Math.ceil(totalHomesCount / homesPerPage);

    // Helper to check if next page has content
    const nextPageHasContent = () => {
        return pageWithContentMap[currentPage + 1] === true;
    };

    // Helper to check if previous page has content
    const prevPageHasContent = () => {
        return currentPage > 1;
    };

    // Render pagination buttons intelligently
    const renderPaginationButtons = () => {
        if (totalPages <= 1) return null;

        const pageButtons = [];
        const maxVisiblePages = 5;

        // Calculate range of pages to show
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start if end is maxed out
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Previous button
        pageButtons.push(
            <button
                key="prev"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!prevPageHasContent()}
                className="pagination-arrow"
            >
                ← Previous
            </button>
        );

        // Page number buttons
        for (let page = startPage; page <= endPage; page++) {
            // Only show page numbers that have content or are the current page
            if (pageWithContentMap[page] === true || page === currentPage) {
                pageButtons.push(
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`pagination-number ${currentPage === page ? "active" : ""}`}
                    >
                        {page}
                    </button>
                );
            }
        }

        // Next button
        pageButtons.push(
            <button
                key="next"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!nextPageHasContent()}
                className="pagination-arrow"
            >
                Next →
            </button>
        );

        return pageButtons;
    };

    return (
        <div className="homepage">
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

            <Navbar />
            <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                role={role}
            />
            <div className="filter-section-wrapper">
                <FacilityFilterComponent
                    selectedFacilities={filterCriteria.facilityIds}
                    setSelectedFacilities={(ids) => setFilterCriteria({ ...filterCriteria, facilityIds: ids })}
                />
                <RoomFilterComponent
                    filterCriteria={filterCriteria}
                    setFilterCriteria={(newCriteria) => {
                        setFilterCriteria(newCriteria);
                        // Reset to page 1 when filter changes
                        setCurrentPage(1);
                    }}
                    searchQuery={searchQuery}
                />
            </div>

            <div className="homes-section">
                {error ? (
                    <div className="error">{error}</div>
                ) : homes.length > 0 ? (
                    homes.map((home, index) => (
                        <HomeCard key={index} home={home} />
                    ))
                ) : (
                    <div className="no-homes-message">No homes found matching your criteria.</div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    {renderPaginationButtons()}
                </div>
            )}

            <div className="about-us-section">
                <div className="about-us-text">
                    <h2>About Us</h2>
                    <p>
                        Welcome to UNISTAY, the perfect destination for college students
                        looking for comfortable and safe housing! We are here to help
                        students find a place that brings comfort and tranquility to their
                        college life, by providing an easy-to-use platform that connects
                        students with housing that suits their needs and goals.
                        Whether you are looking for a single room, a shared apartment, or
                        housing close to campus, we provide you with multiple options with
                        accurate details, making the search and booking process easy and
                        simple. Our goal is to support students in achieving a comprehensive
                        housing experience, as we believe that suitable housing is the
                        foundation for a successful and creative college life.
                    </p>
                </div>
                <div className="about-us-image">
                    <img src="/images/home1.jpeg" alt="About Us" />
                </div>
                
                <div className="contact-section">
                    

                        <ChatbotUI />
                   
                </div>
            </div>
        </div>
    );
}

function HomePage() {
    return <HomePageContent />;
}

export default HomePage;