import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AllRooms.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

const API_URL = "https://localhost:7194/api/Room/GetRoomsByHome";

// Helper to extract token from localStorage
const getToken = () => {
    const tokenData = localStorage.getItem("token");
    if (!tokenData) return null;
    try {
        return tokenData.trim().startsWith("{") ? JSON.parse(tokenData).token : tokenData;
    } catch (err) {
        return tokenData;
    }
};

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

const RoomsList = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [homeTitle, setHomeTitle] = useState("");
    const [ownerIds, setOwnerIds] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization
    const [isOwnerOfHome, setIsOwnerOfHome] = useState(false); // New state to check if current user owns the home

    const token = getToken();
    const decodedToken = parseJwt(token);
    const role =
        decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        decodedToken?.role ||
        "";
    const isAdmin = role.trim().toLowerCase() === "admin";
    const isOwner = role.trim().toLowerCase() === "owner";
    const isUser = !isAdmin && !isOwner;

    const fetchRooms = useCallback(async () => {
        try {
            console.log("Fetching rooms for homeId:", homeId);
            if (!homeId) throw new Error("Invalid homeId");

            const response = await axios.get(`${API_URL}/${homeId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            console.log("API Response:", response.data);

            setHomeTitle(response.data.title || "Home");
            const roomsData = Array.isArray(response.data.rooms)
                ? response.data.rooms
                : response.data.rooms.$values || [];
            setRooms(roomsData);

            const ownerIdsMap = {};
            for (const room of roomsData) {
                const roomDetails = await axios.get(`https://localhost:7194/api/Room/GetRoom/${room.id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                ownerIdsMap[room.id] = roomDetails.data.ownerId;
            }
            setOwnerIds(ownerIdsMap);

            // تحقق من الملكية فقط إذا كان الـ role هو "Owner"
            if (token && isOwner) {
                const decoded = parseJwt(token);
                const userId = decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded?.nameid;
                if (userId) {
                    try {
                        const ownershipResponse = await axios.get(
                            `https://localhost:7194/api/Room/CheckOwnership?homeId=${homeId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setIsOwnerOfHome(true); // User owns the home
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
                        }
                    }
                }
            } else {
                setIsOwnerOfHome(false); // Not an Owner, so not applicable
            }
        } catch (err) {
            console.error("Error fetching rooms:", err);
            if (err.response?.status !== 403) {
                setError(err.response?.data?.message || "Failed to load rooms.");
            }
        } finally {
            setLoading(false);
        }
    }, [homeId, token, isOwner]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleDeleteRoom = async (roomId) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this room? This action cannot be undone!"
        );
        if (!confirmDelete) return;

        try {
            const token = getToken();
            if (!token) throw new Error("No valid token found, please log in.");

            await axios.delete(`https://localhost:7194/api/Room/Remove/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
            alert("Room deleted successfully!");
        } catch (err) {
            console.error("Error deleting room:", err);
            alert(err.response?.data?.message || "Failed to delete the room. Please try again.");
        }
    };

    const handleBookRoom = (roomId) => {
        const ownerId = ownerIds[roomId];
        navigate(`/payment-selection/${roomId}`, { state: { ownerId } });
    };

    const handleRenewRoom = async (roomId) => {
        try {
            const token = getToken();
            if (!token) throw new Error("No valid token found, please log in.");

            const decodedToken = parseJwt(token);
            const userId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
            if (!userId) throw new Error("User ID not found in token.");

            const response = await axios.get(`https://localhost:7194/api/Booking/CheckRenewalEligibility/${userId}/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.canRenew) {
                const ownerId = ownerIds[roomId];
                navigate(`/payment-selection/${roomId}`, { state: { ownerId } });
            } else {
                alert("You cannot renew this room because you don't have an active booking.");
            }
        } catch (err) {
            console.error("Error checking renewal eligibility:", err);
            alert("You cannot renew this room because you don't have an active booking.");
        }
    };

    const renderRoomButtons = (room) => {
        if (isAdmin) {
            return (
                <button className="button-nr details-btn" onClick={() => navigate(`/RoomDetails/${room.id}`)}>
                    Details
                </button>
            );
        } else if (isOwner && isOwnerOfHome) {
            return (
                <>
                    <button className="button-nr btn-update-ah" onClick={() => navigate(`/update-room/${room.id}`)}>
                        Update
                    </button>
                    <button className="button-nr details-btn" onClick={() => navigate(`/RoomDetails/${room.id}`)}>
                        Details
                    </button>
                    <button className="button-nr btn-del-ah" onClick={() => handleDeleteRoom(room.id)}>
                        Delete
                    </button>
                </>
            );
        } else if (isUser && token) {
            return (
                <>
                    <button className="button-nr details-btn" onClick={() => navigate(`/RoomDetails/${room.id}`)}>
                        Details
                    </button>
                    {room.isCompleted ? (
                        <>
                            <p className="not-available">Not available for booking</p>
                            <button className="button-nr btn-renew" onClick={() => handleRenewRoom(room.id)}>
                                Renew
                            </button>
                        </>
                    ) : (
                        <button className="button-nr btn-book" onClick={() => handleBookRoom(room.id)}>
                            Book
                        </button>
                    )}
                </>
            );
        } else {
            return (
                <button className="button-nr details-btn" onClick={() => navigate(`/RoomDetails/${room.id}`)}>
                    Details
                </button>
            );
        }
    };

    return (
        <div className="rooms-container">
            <Navbar />
            <div className="header-card">
                <h2>Rooms for {homeTitle}</h2>
                {isOwner && isOwnerOfHome && (
                    <button className="button-nr" onClick={() => navigate(`/AddRoom/${homeId}`)}>
                        Add New Room
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    Loading rooms...
                </div>
            ) : error ? (
                <p className="error-allrooms">{error}</p>
            ) : !isAuthorized ? (
                <div className="rooms-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            ) : rooms.length === 0 ? (
                <div className="no-rooms-container">
                    <p className="no-rooms">No rooms found.</p>
                </div>
            ) : (
                <div className="rooms-list">
                    {rooms.map((room) => (
                        <div key={room.id} className="room-card">
                            <img
                                src={room.photo || "https://localhost:7194/default-room.jpg"}
                                alt={`Room ${room.number}`}
                                className="room-image"
                                onError={(e) => (e.target.src = "https://localhost:7194/default-room.jpg")}
                            />
                            <div className="room-details">
                                <h3>Room {room.number}</h3>
                                <p>Beds: {room.numOfBeds}</p>
                                <p>Price: ${room.price}</p>
                                <p>Status: {room.isCompleted ? "Completed" : "Available"}</p>
                            </div>
                            <div className="room-buttons">
                                {renderRoomButtons(room)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="back-button">
                <button
                    className="button-nr"
                    onClick={() =>
                        isAdmin || isOwner
                            ? navigate(`/home-details/${homeId}`)
                            : navigate(`/detailsH/${homeId}`)
                    }
                >
                    Back
                </button>
            </div>
        </div>
    );
};

export default RoomsList;