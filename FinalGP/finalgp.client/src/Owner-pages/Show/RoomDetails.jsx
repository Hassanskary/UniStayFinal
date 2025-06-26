import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./RoomDetails.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

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

const RoomDetails = () => {
    const { id } = useParams(); // room ID from route
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isOwnerOfRoom, setIsOwnerOfRoom] = useState(false); // New state to check if current user owns the room
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization
    const [token, setToken] = useState(null); // New state for token

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const tokenData = localStorage.getItem("token");
                const token = tokenData ? (tokenData.trim().startsWith("{") ? JSON.parse(tokenData).token : tokenData) : null;
                setToken(token); // Set the token state

                const response = await axios.get(
                    `https://localhost:7194/api/Room/GetRoom/${id}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                console.log("Fetched room data:", response.data);
                setRoom(response.data);

                //  Õﬁﬁ „‰ «·œÊ— Ê„·ﬂÌ… «·‹ Room
                if (token) {
                    const decodedToken = parseJwt(token);
                    const role = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decodedToken?.role || "";
                    const isOwner = role.trim().toLowerCase() === "owner";
                    const userId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decodedToken?.nameid;

                    if (isOwner && userId) {
                        try {
                            const ownershipResponse = await axios.get(
                                `https://localhost:7194/api/Room/CheckRoomOwnership/${id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setIsOwnerOfRoom(true); // User owns the room
                        } catch (ownershipErr) {
                            if (ownershipErr.response?.status === 403) {
                                setIsAuthorized(false);
                                Swal.fire({
                                    icon: "warning",
                                    title: "Not Authorized",
                                    text: "You do not own this room.",
                                    confirmButtonText: "OK",
                                    confirmButtonColor: "#3085d6",
                                });
                            }
                        }
                    } else if (role.trim().toLowerCase() === "admin") {
                        // Allow Admin to view without ownership check
                        setIsOwnerOfRoom(false); // Admin doesn't need ownership
                    }
                }
            } catch (err) {
                console.error("Error fetching room details:", err);
                setError(err.response?.data?.message || "Failed to load room details.");
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();
    }, [id]);

    if (loading) return <p className="loading">Loading room details...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!room) return <p className="no-room">Room not found.</p>;

    const { id: roomId, number, numOfBeds, price, isCompleted, homeId, photo } = room;
    const roomImage = photo && photo !== ""
        ? photo
        : "https://localhost:7194/default-room.jpg";

    const handleBackToRooms = () => {
        navigate(`/AllRooms/${homeId}`);
    };

    const handleEditRoom = () => {
        navigate(`/update-room/${roomId}`);
    };

    return (
        <div className="room-details-container">
            <Navbar />
            <div className="home-airbnb-container">
                <div className="hero-image">
                    <img
                        src={roomImage}
                        alt={`Room ${number}`}
                        className="hero-img"
                        onError={(e) => {
                            e.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                        }}
                    />
                </div>
                <div className="home-details-section">
                    <h2 className="home-title">Room Details</h2>
                    <div className="details-grid">
                        <span><strong>Room Code:</strong> {number}</span>
                        <span><strong>Number of Beds:</strong> {numOfBeds}</span>
                        <span><strong>Price:</strong> ${price}</span>
                        <span><strong>Status:</strong> {isCompleted ? "Completed" : "Not Completed"}</span>
                        <span><strong>Home ID:</strong> {homeId}</span>
                    </div>
                    <div className="buttons-container">
                        <button className="button-cu btn-tgg" onClick={handleBackToRooms}>
                            Back to Rooms
                        </button>
                        {(!token || (token && parseJwt(token)?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]?.toLowerCase() !== "owner")) || (parseJwt(token)?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]?.toLowerCase() === "owner" && !isOwnerOfRoom) ? null : (
                            <button className="button-cu btn-tgg" onClick={handleEditRoom}>
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {!isAuthorized && <div className="room-details-owner-unauthorized-background-unique" />}
        </div>
    );
};

export default RoomDetails;