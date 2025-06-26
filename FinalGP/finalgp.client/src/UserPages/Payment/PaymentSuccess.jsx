import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./PaymentStatus.css";
import Navbar from "../../components/Navbar";
const PaymentSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const completeBooking = async () => {
            const sessionId = new URLSearchParams(location.search).get("session_id");
            if (!sessionId) {
                setError("No session ID found.");
                setLoading(false);
                return;
            }

            try {
                const jwt = localStorage.getItem("token");
                const resp = await axios.post(
                    "https://localhost:7194/api/Stripe/CompleteBooking",
                    { sessionId },
                    { headers: { Authorization: `Bearer ${jwt}` } }
                );
                const bookingId = resp.data.bookingId;
                setTimeout(() => {
                    navigate(`/booking-confirmation/${bookingId}`);
                }, 5000);
            } catch (err) {
                setError("Failed to complete booking: " + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };
        completeBooking();
    }, [location, navigate]);

    if (loading) return <p>Completing your booking...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="payment-success-container">
            <Navbar />  
            <h2>Payment Successful!</h2>
            <p>Your booking has been confirmed. You will be redirected to the confirmation page in 5 seconds.</p>
        </div>
    );
};

export default PaymentSuccess;