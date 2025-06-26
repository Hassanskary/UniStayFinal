import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./AllHomes.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

const API_URL = "https://localhost:7194/api/Home";

// Helper function to get the token
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

const OwnerHomes = () => {
    const { ownerId } = useParams();
    const [homes, setHomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showContract, setShowContract] = useState({});
    const [fade, setFade] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    const toggleImage = (homeId) => {
        setFade((prev) => ({ ...prev, [homeId]: true }));
        setTimeout(() => {
            setShowContract((prev) => ({ ...prev, [homeId]: !prev[homeId] }));
            setFade((prev) => ({ ...prev, [homeId]: false }));
        }, 300);
    };

    const handleDelete = async (homeId) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this home? This action cannot be undone!"
        );
        if (!confirmDelete) return;

        try {
            const token = getToken();
            if (!token) throw new Error("No valid token found, please log in.");

            await axios.delete(`${API_URL}/DeleteHome/${homeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setHomes((prevHomes) => prevHomes.filter((home) => home.id !== homeId));

            alert("Home deleted successfully!");
        } catch (err) {
            console.error("Error deleting home:", err);
            alert(
                err.response?.data?.message ||
                "Failed to delete the home. Please try again."
            );
        }
    };

    useEffect(() => {
        const fetchHomes = async () => {
            try {
                const token = getToken();
                if (!token) {
                    navigate("/login");
                    return;
                }

                const decoded = parseJwt(token);
                const userRole = decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded?.role;
                const userId = decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded?.nameid;

                if (userRole !== "Owner") {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not have permission to view homes.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else if (ownerId && userId && ownerId !== userId) {
                    // تحقق من ملكية الـ Homes
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not own these homes.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else {
                    const response = await axios.get(
                        `${API_URL}/GetHomesByOwner/${ownerId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    console.log("API Response:", response.data);

                    let extractedHomes = [];
                    if (Array.isArray(response.data)) {
                        extractedHomes = response.data;
                    } else if (response.data && Array.isArray(response.data.$values)) {
                        extractedHomes = response.data.$values;
                    } else {
                        throw new Error("Unexpected API response format.");
                    }

                    setHomes(extractedHomes);
                }
            } catch (err) {
                console.error("Error fetching homes:", err);
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Failed to load homes. Please try again."
                );
                setHomes([]);
            } finally {
                setLoading(false);
            }
        };

        if (!ownerId) {
            setError("Owner ID is missing!");
            setLoading(false);
            return;
        }

        fetchHomes();
    }, [ownerId, navigate]);

    return (
        <div className={`homes-container ${homes.length === 0 ? "no-homes-bg" : "with-homes-bg"}`}>
            <Navbar />

            {loading ? (
                <div className="loading-spinner">Loading...</div>
            ) : error ? (
                <p className="error">{error}</p>
            ) : isAuthorized && homes.length === 0 ? (
                <div className="no-homes-container">
                    <p className="no-homes">No homes added</p>
                </div>
            ) : isAuthorized ? (
                <>
                    <h2>Your Listed Homes</h2>
                    <div className="homes-list">
                        {homes.map((home) => (
                            <div key={home.id} className="home-card">
                                <div className="home-details">
                                    <h2 className="home-title" style={{ textAlign: 'center' }}>{home.title}</h2>

                                    <p><strong>City:</strong> {home.city}</p>
                                    <p><strong>Rooms:</strong> {home.numOfRooms}</p>
                                    <p><strong>Status:</strong> {home.status}</p>
                                    <p><strong>Type:</strong> {home.type}</p>
                                    <p><strong>Gender:</strong> {home.gender}</p>
                                    <div className="home-buttons">
                                        <button
                                            className="button-ah btn-edit-ah"
                                            onClick={() => navigate(`/update-home/${home.id}`)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="button-ah details-btn"
                                            onClick={() => navigate(`/home-details/${home.id}`)}
                                        >
                                            Details
                                        </button>
                                        <button
                                            className="button-ah btn-del-ah"
                                            onClick={() => handleDelete(home.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="home-image-container">
                                    <img
                                        src={showContract[home.id] ? home.contractPhoto : home.firstPhoto}
                                        alt={showContract[home.id] ? "Contract" : "Home"}
                                        className={`home-image ${fade[home.id] ? "fade-out" : "fade-in"}`}
                                    />
                                    <div className="button-container">
                                        <button
                                            className="btn-toggle-ah"
                                            onClick={() => toggleImage(home.id)}
                                        >
                                            {showContract[home.id] ? "Show Home" : "View Contract"}
                                        </button>
                                        <button
                                            className="btn-to-ah"
                                            onClick={() => navigate(`/AllRooms/${home.id}`)}
                                        >
                                            View Rooms
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="owner-homes-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default OwnerHomes;