import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./BookingConfirmation.css";
import Navbar from "../../components/Navbar";
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

const BookingConfirmation = () => {
    const { roomId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("No token found, please log in.");

                const decodedToken = parseJwt(token);
                const userId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

                if (!userId) throw new Error("User ID not found in token.");

                console.log(`Fetching booking for user ${userId} and room ${roomId}`);
                const response = await axios.get(
                    `https://localhost:7194/api/Booking/GetLatestBooking/${userId}/${roomId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setBooking(response.data);
            } catch (err) {
                console.error("Error fetching booking:", err);
                setError(err.response?.data || "Failed to fetch booking details");
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [roomId]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error">Error: {error}</p>;
    if (!booking) return <p>No booking found.</p>;

    return (
        <div className="booking-confirmation-container">
            <Navbar />  
            <h2>Booking Confirmed Successfully!</h2>
            <div className="booking-details">
                <p><strong>Booking ID:</strong> {booking?.id}</p>
                <p><strong>Room Name:</strong> {booking?.room?.number}</p>
                <p><strong>Amount:</strong> {booking?.amount} $</p>
                <p><strong>Payment Method:</strong> {state?.paymentMethod}</p>
                {state?.paymentReference && (
                    <p><strong>Transaction ID:</strong> {state.paymentReference}</p>
                )}
                <p><strong>Status:</strong> {booking?.status}</p>
                <p><strong>Created At:</strong> {new Date(booking?.createdAt).toLocaleString()}</p>
                {["Pending", "Expired"].includes(booking?.status) && (
                    <p><strong>End At:</strong> {new Date(new Date(booking?.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleString()}</p>
                )}
                {["Paid", "Confirmed"].includes(booking?.status) && (
                    <>
                        <p><strong>Start Date:</strong> {new Date(booking?.startDate).toLocaleDateString()}</p>
                        <p><strong>End Date:</strong> {new Date(booking?.endDate).toLocaleDateString()}</p>
                    </>
                )}
            </div>
            <button
                className="bu-suc"
                onClick={() => navigate("/")}
            >
                Back to Home
            </button>
        </div>
    );
};

export default BookingConfirmation;