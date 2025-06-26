
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./ConfirmCash.css";
import Navbar from "../../components/Navbar";

// Utility to decode JWT token and extract user info
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
        const decoded = JSON.parse(jsonPayload);
        return {
            userId: decoded.sub || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
            userName: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || decoded.name
        };
    } catch (e) {
        console.error("Error decoding token:", e);
        return null;
    }
};

const ConfirmCash = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [userName, setUserName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [roomNumber, setRoomNumber] = useState("");
    const [price, setPrice] = useState("");
    const [startDate, setStartDate] = useState(location.state?.startDate || "");
    const [endDate, setEndDate] = useState(location.state?.endDate || "");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const ownerId = location.state?.ownerId;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("No token found, please log in.");

                const decodedToken = parseJwt(token);
                const userId = decodedToken?.userId;
                const userNameFromToken = decodedToken?.userName;

                if (!userId || !userNameFromToken) throw new Error("Invalid token.");

                setUserName(userNameFromToken);

                // Get room details
                const roomRes = await axios.get(
                    `https://localhost:7194/api/Room/GetRoom/${roomId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setRoomNumber(roomRes.data.number);
                const roomPrice = roomRes.data.price;

                // Calculate price based on stay duration
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

                const calculatedPrice = diffDays < 30
                    ? (roomPrice / 30) * diffDays
                    : roomPrice;

                setPrice(calculatedPrice.toFixed(2));

                // Get owner info
                if (ownerId) {
                    try {
                        const ownerRes = await axios.get(
                            `https://localhost:7194/api/AccountOwner/Profile/${ownerId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setOwnerName(ownerRes.data.userName || "Unknown Owner");
                    } catch (err) {
                        if (err.response?.status === 404) {
                            setOwnerName("Unknown Owner");
                        } else {
                            throw err;
                        }
                    }
                } else {
                    setOwnerName("Unknown Owner");
                }

            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err.response?.data || err.message || "Failed to fetch data.");
            } finally {
                setLoading(false);
            }
        };

        if (startDate && endDate) {
            fetchData();
        } else {
            setError("Start date and end date are required.");
            setLoading(false);
        }
    }, [roomId, ownerId, startDate, endDate]);

    const handleConfirm = async () => {
        try {
            const token = localStorage.getItem("token");

            await axios.post(
                "https://localhost:7194/api/Booking/CreateBookingWithCash",
                {
                    roomId: parseInt(roomId),
                    startDate,
                    endDate,
                    paymentMethod: "CashOnArrival"
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            navigate(`/booking-confirmation/${roomId}`, {
                state: { paymentMethod: "CashOnArrival" }
            });

        } catch (err) {
            console.error("Error creating booking:", err);
            alert("Failed to create booking. Please try again.");
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error">Error: {error}</p>;

    return (
        <div className="confirm-cash-container">
        <Navbar/>
            <h2>Confirm Cash Booking</h2>
            <div className="confirm-details">
                <p><strong>User Name:</strong> {userName}</p>
                <p><strong>Owner Name:</strong> {ownerName}</p>
                <p><strong>Room Number:</strong> {roomNumber}</p>
                <p><strong>Start Date:</strong> {startDate}</p>
                <p><strong>End Date:</strong> {endDate}</p>
                <p><strong>Price:</strong> {price} $</p>
            </div>
            <button className="confirm-btn" onClick={handleConfirm}>Confirm</button>
        </div>
    );
};

export default ConfirmCash;
