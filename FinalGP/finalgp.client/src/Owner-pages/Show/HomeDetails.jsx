import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./HomeDetails.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Ensure SweetAlert2 is imported

const cityEnum = [
    "Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez",
    "Luxor", "Asyut", "Mansoura", "Tanta", "Faiyum", "Zagazig", "Ismailia",
    "Aswan", "Damietta", "Damanhur", "Minya", "Beni Suef", "Qena",
    "Sohag", "Hurghada", "6th of October", "Shibin El Kom", "Banha",
    "Kafr El Sheikh", "Arish", "Mallawi"
];

const getToken = () => {
    const rawToken = localStorage.getItem("token");
    if (!rawToken) return null;
    try {
        const parsed = JSON.parse(rawToken);
        return parsed?.token || rawToken;
    } catch (error) {
        return rawToken;
    }
};

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

const getCityName = (cityValue) => {
    console.log("City Value from API:", cityValue);
    if (typeof cityValue === "number" && cityValue >= 0 && cityValue < cityEnum.length) {
        return cityEnum[cityValue];
    }
    return cityValue || "Unknown";
};

const getStatusName = (statusValue) => {
    console.log("Status Value from API:", statusValue);
    const statusEnum = {
        "PendingApproval": "PendingApproval",
        "Approved": "Approved",
        "Rejected": "Rejected",
        "Banned": "Banned"
    };
    if (typeof statusValue === "string" && statusValue in statusEnum) {
        return statusValue;
    }
    return "Unknown";
};

// Updated functions to handle Gender and Type based on actual enum values
const getGenderName = (genderValue) => {
    console.log("Gender Value from API:", genderValue);
    const genderEnum = {
        0: "Male",
        1: "Female"
    };
    // Check if genderValue is a number and matches enum
    if (typeof genderValue === "number" && genderEnum[genderValue] !== undefined) {
        return genderEnum[genderValue];
    }
    // Fallback to string check if API sends "Male" or "Female"
    if (genderValue === "Male" || genderValue === "Female") {
        return genderValue;
    }
    return "Unknown";
};

const getTypeName = (typeValue) => {
    console.log("Type Value from API:", typeValue);
    const typeEnum = {
        0: "Shared",
        1: "Private"
    };
    // Check if typeValue is a number and matches enum
    if (typeof typeValue === "number" && typeEnum[typeValue] !== undefined) {
        return typeEnum[typeValue];
    }
    // Fallback to string check if API sends "Shared" or "Private"
    if (typeValue === "Shared" || typeValue === "Private") {
        return typeValue;
    }
    return "Unknown";
};

const HomeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [home, setHome] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    const token = getToken();
    const decodedToken = parseJwt(token);
    const role =
        decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        decodedToken?.role ||
        "";
    const isAdmin = role.toLowerCase() === "admin";
    const ownerId =
        decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
        decodedToken?.nameid;

    const handleBackToHomes = () => {
        if (!ownerId) {
            alert("Owner ID not found!");
            return;
        }
        navigate(`/OwnerHomes/${ownerId}`);
    };

    useEffect(() => {
        const fetchHomeDetails = async () => {
            try {
                if (!token) {
                    if (!isAdmin) {
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
                    }
                } else {
                    const decoded = parseJwt(token);
                    const userId = decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded?.nameid;

                    if (role.toLowerCase() === "owner" && userId) {
                        try {
                            await axios.get(
                                `https://localhost:7194/api/Room/CheckOwnership?homeId=${id}`, // Corrected endpoint to Home
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                        } catch (ownershipErr) {
                            if (ownershipErr.response?.status === 403) {
                                setIsAuthorized(false);
                                Swal.fire({
                                    icon: "warning",
                                    title: "Not Authorized",
                                    text: "You do not own this home.",
                                    confirmButtonText: "OK",
                                    confirmButtonColor: "#3085d6",
                                });
                                return;
                            }
                        }
                    } else if (!isAdmin && role.toLowerCase() !== "owner") {
                        setIsAuthorized(false);
                        Swal.fire({
                            icon: "warning",
                            title: "Not Authorized",
                            text: "You do not have permission to view this page.",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#3085d6",
                        });
                        return;
                    }
                }

                const response = await axios.get(
                    `https://localhost:7194/api/Home/GetHome/${id}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                const data = response.data;
                console.log("Home Data from API:", data);
                setHome(data);

                let photoArray = [];
                if (Array.isArray(data.photos)) {
                    photoArray = data.photos;
                } else if (data.photos && data.photos.$values) {
                    photoArray = data.photos.$values;
                }
                setPhotos(photoArray);
                if (photoArray.length > 0) {
                    setSelectedPhoto(photoArray[0]);
                }
            } catch (err) {
                console.error("Error fetching home details:", err);
                if (err.response?.status === 401) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Session Expired",
                        text: "Your session has expired. Please log in again.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    }).then(() => {
                        navigate("/login");
                    });
                } else {
                    setError("Failed to load home details.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHomeDetails();
    }, [id, token, isAdmin, navigate]);

    if (loading) return <p className="loading">Loading home details...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!isAuthorized) return <div className="home-owner-unauthorized-background-unique" />;

    return (
        <div className="home-details-container">
            <Navbar />
            <div className="home-airbnb-container">
                <div className="hero-image">
                    {selectedPhoto && (
                        <img
                            src={`https://localhost:7194${selectedPhoto}`}
                            alt="Hero"
                            className="hero-img"
                        />
                    )}
                </div>
                <div className="home-details-section">
                    <h2 className="home-title">{home.title}</h2>
                    <p className="home-description">{home.description}</p>
                    <div className="details-grid">
                        <span><strong>City:</strong> {getCityName(home.city)}</span>
                        <span><strong>Location:</strong> {home.locationDetails}</span>
                        <span><strong>Distance:</strong> {home.distanceFromUniversity} km</span>
                        <span><strong>Floor:</strong> {home.floor}</span>
                        <span><strong>Gender:</strong> {getGenderName(home.gender)}</span>
                        <span><strong>Type:</strong> {getTypeName(home.type)}</span>
                        <span><strong>Rooms:</strong> {home.numOfRooms}</span>
                        <span><strong>Status:</strong> {getStatusName(home.homeApprovalStatus)}</span>
                    </div>
                    <div className="photos-gallery">
                        <h3>Photos</h3>
                        <div className="photos-container">
                            {photos && photos.length > 0 ? (
                                photos.map((photoUrl, index) => (
                                    <img
                                        key={index}
                                        src={`https://localhost:7194${photoUrl}`}
                                        alt={`Photo ${index + 1}`}
                                        className="gallery-photo"
                                        onClick={() => setSelectedPhoto(photoUrl)}
                                    />
                                ))
                            ) : (
                                <p>No additional photos available.</p>
                            )}
                        </div>
                    </div>
                    <div className="buttons-container">
                        <button className="button-cu btn-tgg" onClick={() => navigate(`/AllRooms/${home.id}`)}>
                            View Rooms
                        </button>
                        <button className="button-cu btn-tgg" onClick={() => navigate(`/ShowFacilities/${home.id}`)}>
                            View Facilities
                        </button>
                        {isAdmin ? (
                            <button className="button-cu btn-tgg" onClick={() => navigate("/AdminPendingHomes")}>
                                Back to Pending Homes
                            </button>
                        ) : (
                            <button className="button-cu btn-tgg" onClick={handleBackToHomes}>
                                Back to Homes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeDetails;