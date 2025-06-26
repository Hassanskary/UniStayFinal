import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./UserBookings.css";
import Swal from "sweetalert2";

// Helper to parse JWT token
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

const UserBookings = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true);

    const token = localStorage.getItem("token");
    const decodedToken = token ? parseJwt(token) : null;
    const role = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decodedToken?.role || "";
    const currentUserId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

    useEffect(() => {
        const fetchBookings = async () => {
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
                } else if (currentUserId) {
                    await axios.get(
                        `https://localhost:7194/api/Booking/CheckBookingOwnership/${currentUserId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    try {
                        const bookingResponse = await axios.get(
                            `https://localhost:7194/api/Booking/GetUserBookings/${currentUserId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setBookings(bookingResponse.data);
                    } catch (bookingErr) {
                        if (bookingErr.response?.status === 404) {
                            // No bookings found, set bookings to empty array
                            setBookings([]);
                        } else {
                            throw bookingErr; // Re-throw other errors to be caught below
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching bookings:", err);
                if (err.response?.status === 403) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not own these bookings.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else {
                    setError(err.response?.data || err.message || "Failed to load bookings.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [token, role, currentUserId, navigate]);

    return (
        <div className="user-bookings-container">
            <Navbar />
            <h2>My Bookings</h2>
            {loading ? (
                <div className="loading">Loading bookings...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : !isAuthorized ? (
                <div className="user-bookings-unauthorized-background-unique" />
            ) : bookings.length === 0 ? (
                <div className="no-bookings-container">
                    <div className="no-bookings-box">
                        <h3>No Booking Found</h3>
                    </div>
                </div>
            ) : (
                <>
                   
                    <div className="bookings-list">
                        {bookings.map(booking => (
                            <div
                                key={booking.id}
                                className="booking-card"
                                onClick={() => navigate(`/booking-confirmation/${booking.roomId}`, { state: { paymentMethod: booking.paymentMethod } })}
                            >
                                <p><strong>Booking ID:</strong> {booking.id}</p>
                                <p><strong>Room Number:</strong> {booking.room?.number || "N/A"}</p>
                                <p><strong>Created At:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
                                <p><strong>Status:</strong> {booking.status}</p>
                                <div className="booking-actions">
                                    <button
                                        className="booking-show-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/AllRooms/${booking.room.homeId}`);
                                        }}
                                    >
                                        Show Room
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserBookings;