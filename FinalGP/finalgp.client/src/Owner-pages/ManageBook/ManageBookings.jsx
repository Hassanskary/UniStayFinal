import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./ManageBookings.css";
import Swal from "sweetalert2";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Helper function to parse JWT token
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

const ManageBookings = () => {
    const navigate = useNavigate();
    const { ownerId } = useParams();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true);

    // Fetch pending bookings
    useEffect(() => {
        const fetchPendingBookings = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    navigate("/login");
                    toast.error("⚠️ You must log in first!");
                    return;
                }

                const decodedToken = parseJwt(token);
                const userId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                if (!userId) {
                    throw new Error("Owner ID not found in token!");
                }

                const effectiveOwnerId = ownerId || userId;

                const checkResponse = await axios.get(`https://localhost:7194/api/Booking/CheckBookingOwnership/${effectiveOwnerId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (checkResponse.status === 200) {
                    const fetchResponse = await axios.get(`https://localhost:7194/api/Booking/GetPendingBookingsForOwner/${effectiveOwnerId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    console.log("API Response:", fetchResponse.data);

                    setBookings(fetchResponse.data);
                }
            } catch (err) {
                console.error("Error fetching pending bookings:", err);
                if (err.response) {
                    if (err.response.status === 401) {
                        setIsAuthorized(false);
                        if (err.response.data === "User ID not found in token.") {
                            navigate("/login");
                            toast.error("⚠️ User ID not found in token! Please log in again!");
                        } else if (err.response.data === "You are not authorized to view this owner's bookings.") {
                            const decodedToken = parseJwt(localStorage.getItem("token"));
                            const userId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                            if (ownerId && ownerId !== userId) {
                                Swal.fire({
                                    icon: "warning",
                                    title: "Not Authorized",
                                    text: "You are not authorized to view this owner's bookings.",
                                    confirmButtonText: "OK",
                                    confirmButtonColor: "#3085d6",
                                });
                                toast.warning("⚠️ You are not authorized to view this owner's bookings!");
                            }
                        }
                    } else if (err.response.status === 403) {
                        setIsAuthorized(false);
                        Swal.fire({
                            icon: "warning",
                            title: "Not Authorized",
                            text: "You do not have permission to manage bookings.",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#3085d6",
                        });
                        toast.error("⚠️ You do not have permission to manage bookings!");
                    } else if (err.response.status === 404) {
                        setBookings([]);
                        toast.warning("⚠️ No pending bookings found!");
                    } else {
                        setError(err.response?.data || err.message || "Failed to load bookings.");
                        toast.error("⚠️ Failed to load bookings! Please try again!");
                    }
                } else {
                    setError(err.message || "Failed to load bookings.");
                    toast.error("⚠️ Failed to load bookings! Please try again!");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPendingBookings();
    }, [navigate, ownerId]);

    // Confirm a booking
    const handleConfirm = async (bookingId) => {
        try {
            const token = localStorage.getItem("token");
            console.log("Confirming booking ID:", bookingId);
            const response = await axios.post(`https://localhost:7194/api/Booking/ConfirmBooking/${bookingId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Confirm response:", response.data);

            const { roomId, isCompleted } = response.data;

            let updatedBookings = bookings.filter(booking => booking.id !== bookingId);

            if (isCompleted) {
                updatedBookings = updatedBookings.filter(booking => booking.roomId !== roomId);
            }

            setBookings(updatedBookings);
            toast.success("✅ Booking confirmed successfully!");
        } catch (err) {
            console.error("Error confirming booking:", err);
            toast.error(err.response?.data || "⚠️ Failed to confirm booking! Please try again!");
        }
    };

    // Cancel a booking
    const handleCancel = async (bookingId) => {
        try {
            const token = localStorage.getItem("token");
            console.log("Cancelling booking ID:", bookingId);
            await axios.post(`https://localhost:7194/api/Booking/CancelBooking/${bookingId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookings(bookings.filter(booking => booking.id !== bookingId));
            toast.success("✅ Booking cancelled successfully!");
        } catch (err) {
            console.error("Error cancelling booking:", err);
            toast.error(err.response?.data || "⚠️ Failed to cancel booking! Please try again!");
        }
    };

    return (
        <div className="manage-bookings-container">
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
            {loading ? (
                <div className="loading">Loading bookings...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <>
                    <h2 className="manage-bookings-title">Manage Bookings</h2>
                    {bookings.length === 0 ? (
                        <div className="no-bookings-container">
                            <div className="no-bookings-message">
                                No pending or renewed bookings found.
                            </div>
                        </div>
                    ) : (
                        <div className="bookings-list">
                            {bookings.map(booking => (
                                <div key={booking.id} className="booking-card">
                                    <p><strong>Booking ID:</strong> {booking.id}</p>
                                    <p><strong>User Name:</strong> {booking.userName || "N/A"}</p>
                                    <p><strong>Home ID:</strong> {booking.room?.homeId || "N/A"}</p>
                                    <p><strong>Room Number:</strong> {booking.room?.number || "N/A"}</p>
                                    <p><strong>Start Date:</strong> {new Date(booking.start).toLocaleDateString()}</p>
                                    <p><strong>End Date:</strong> {new Date(booking.end).toLocaleDateString()}</p>
                                    <p><strong>Status:</strong> {booking.status}</p>
                                    <p><strong>Created At:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
                                    <div className="booking-actions">
                                        <button className="button-mang confirm-btn-n" onClick={() => handleConfirm(booking.id)}>Confirm</button>
                                        <button className="button-mang cancel-btn-n" onClick={() => handleCancel(booking.id)}>Cancel</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            {!isAuthorized && (
                <div className="manage-bookings-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default ManageBookings;