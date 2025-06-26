import React, { useState, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CompareHomesContext } from "../../hooks/CompareHomesContext";
import "./CompareHomes.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2";

// Helper to decode a JWT token
const parseJwt = (token) => {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    try {
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding token:", e);
        return null;
    }
};

const CompareHomeCard = ({ home, removeHome }) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const intervalRef = useRef(null);
    const navigate = useNavigate();
    const photos = home.photos?.length > 0 ? home.photos : ["/images/default-home.jpg"];

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

    const handleCardClick = () => {
        navigate(`/detailsH/${home.id}`);
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        removeHome(home.id);
    };

    // يتم استخدام البيانات الحقيقية من كائن home
    const bedsCount = home.bedrooms || home.beds || 2;
    const isNewProperty = home.isNew || false;
    const rating = home.rate || home.rating || 0.0;
    const city = home.city || "";

    return (
        <div className="property-card" onClick={handleCardClick}>
            <div
                className="property-image-container"
                onMouseEnter={startAutoSlide}
                onMouseLeave={stopAutoSlide}
            >
                <img
                    src={photos[currentPhotoIndex]}
                    alt={home.title || "Home"}
                    className="property-image"
                />
                {photos.length > 1 && (
                    <div className="slider-controls">
                        <button onClick={handlePrevPhoto} className="arrow-btn arrow-left">
                            <img src="/arrow-left.png" alt="Previous" className="arrow-img" />
                        </button>
                        <button onClick={handleNextPhoto} className="arrow-btn arrow-right">
                            <img src="/arrow-right.png" alt="Next" className="arrow-img" />
                        </button>
                    </div>
                )}
                <button className="remove-button" onClick={handleRemove}>
                    <span>×</span>
                </button>
            </div>
            <div className="property-details">
                <h3 className="property-title">{home.title}</h3>
                {city && <p className="property-location">{city}</p>}
                <div className="property-meta">
                    <span className="rating">
                        {isNewProperty ? (
                            <span className="new-tag">New</span>
                        ) : (
                            <>
                                <span className="star">★</span> {typeof rating === 'number' ? rating.toFixed(1) : rating}
                            </>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

function CompareHomes() {
    const { comparedHomes, removeHome, clearComparison } = useContext(CompareHomesContext);
    const { userId } = useParams(); // Get userId from URL
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    const token = localStorage.getItem("token");
    const decodedToken = token ? parseJwt(token) : null;
    const role = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decodedToken?.role || "";
    const currentUserId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decodedToken?.nameid;

    useEffect(() => {
        const fetchAuthorization = async () => {
            try {
                if (!token) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "Please log in to access this page.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    }).then(() => {
                        navigate("/login");
                    });
                    return;
                } else if (role.toLowerCase() !== "user") {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not have permission to view this page.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                    return;
                } else if (currentUserId && userId) {
                    const response = await axios.get(
                        `https://localhost:7194/api/Save/CheckSaveOwnership/${userId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } catch (err) {
                console.error("Error checking authorization:", err);
                if (err.response?.status === 403) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not own these saves.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                }
            }
        };

        fetchAuthorization();
    }, [token, role, currentUserId, userId, navigate]);

    if (!isAuthorized) return <div className="compare-owner-unauthorized-background-unique" />;

    return (
        <div className="savedh-body">
            <div className="saved-homes-container">
                <Navbar />
                <h2>My Saved Homes</h2>
                {comparedHomes.length === 0 ? (
                    <p className="no-homes">No homes saved yet.</p>
                ) : (
                    <>
                        <div className="property-grid">
                            {comparedHomes.map((home) => (
                                <CompareHomeCard
                                    key={home.id}
                                    home={home}
                                    removeHome={removeHome}
                                />
                            ))}
                        </div>
                        <div className="clear-all">
                            <button className="clear-all-saves" onClick={clearComparison}>Clear All</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default CompareHomes;