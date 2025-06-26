import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DateSelectionModal from "../UserBooking/DateSelectionModal";
import "./PaymentSelection.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

// Function to decode JWT token and extract `userId`
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

const PaymentSelection = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedMethod, setSelectedMethod] = useState("");
    const [isRoomPending, setIsRoomPending] = useState(false);
    const [ownerId, setOwnerId] = useState(location.state?.ownerId || null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [roomCompleted, setRoomCompleted] = useState(false);
    const [latestBooking, setLatestBooking] = useState(null);
    const [canAccess, setCanAccess] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                const token = localStorage.getItem("token");
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
                }

                const decodedToken = parseJwt(token);
                const userRole = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
                if (userRole?.toLowerCase() !== "user") {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not have access to this page.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                    return;
                }
            } catch (err) {
                console.error("Error checking authorization:", err);
                setIsAuthorized(false);
            }
        };

        const checkRoomStatus = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            const decodedToken = parseJwt(token);
            const userId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

            if (!userId) return;

            try {
                // Check room status
                const roomResponse = await axios.get(`https://localhost:7194/api/Room/GetRoom/${roomId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setRoomCompleted(roomResponse.data.isCompleted);

                // Fetch latest booking for the user and room
                let bookingResponse;
                try {
                    bookingResponse = await axios.get(
                        `https://localhost:7194/api/Booking/GetLatestBooking/${userId}/${roomId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setLatestBooking(bookingResponse.data);
                    if (bookingResponse.data.status === "Pending" || bookingResponse.data.status === "Renewed") {
                        setIsRoomPending(true);
                    }
                } catch (err) {
                    if (err.response?.status === 404) {
                        setLatestBooking(null); // No booking found
                    } else {
                        throw err;
                    }
                }

                // Determine if the user can access the page
                if (roomResponse.data.isCompleted) {
                    if (bookingResponse?.data) {
                        const now = new Date();
                        const endDate = new Date(bookingResponse.data.endDate);
                        if (
                            (bookingResponse.data.status === "Confirmed" || bookingResponse.data.status === "Paid") &&
                            endDate > now
                        ) {
                            setCanAccess(true); // Allow access for renew
                        } else {
                            setCanAccess(false); // Deny access if no active booking
                        }
                    } else {
                        setCanAccess(false); // Deny access if no booking
                    }
                } else {
                    setCanAccess(true); // Allow access if room is not completed
                }
            } catch (err) {
                console.log("Error fetching room or booking details:", err);
                setCanAccess(false);
            }
        };

        checkAuthorization();
        checkRoomStatus();
    }, [roomId]);

    // Handle payment method selection
    const handleMethodSelection = (method) => {
        setSelectedMethod(method);
    };

    // Handle Next button click
    const handleNext = () => {
        if (!canAccess) {
            toast.error("You cannot access this page because the room is completed and you don't have an active booking.");
            return;
        }

        if (!selectedMethod) {
            toast.warning("Please select a payment method!");
            return;
        }

        // Check if there is a pending or renewed booking
        if (latestBooking && (latestBooking.status === "Pending" || latestBooking.status === "Renewed")) {
            toast.error("This room is already booked and pending or renewed. You cannot book it again until it’s cancelled or expired.");
            return;
        }

        if (selectedMethod === "CashOnArrival") {
            setShowDateModal(true); // Show modal for date selection
        } else if (selectedMethod === "Stripe") {
            navigate(`/stripe-payment/${roomId}`);
        }
    };

    // Handle date selection
    const handleSelectDates = (startDate, endDate) => {
        setShowDateModal(false);
        navigate(`/confirm-cash/${roomId}`, { state: { ownerId, startDate, endDate } });
    };

    if (!isAuthorized) return <div className="payment-selection-unauthorized-background-unique" />;

    return (
        <div className="payment-selection-wrapper">
            <Navbar />
            <div className="payment-selection-container">
                <h2>Select Payment Method</h2>

                {!canAccess ? (
                    <p className="error">
                        You cannot access this page because the room is completed and you don't have an active booking.
                    </p>
                ) : (
                    <>
                        {roomCompleted && (
                            <p className="info">This room is completed, but you can renew your booking.</p>
                        )}
                        <div className="payment-options">
                            <div
                                className={`payment-option ${selectedMethod === "CashOnArrival" ? "selected" : ""}`}
                                onClick={() => handleMethodSelection("CashOnArrival")}
                            >
                                <h3>Cash on Arrival</h3>
                                <p>Pay the amount upon arrival at the location</p>
                            </div>
                            <div
                                className={`payment-option ${selectedMethod === "Stripe" ? "selected" : ""}`}
                                onClick={() => handleMethodSelection("Stripe")}
                            >
                                <h3>Stripe</h3>
                                <p>Pay using your credit card via Stripe</p>
                            </div>
                        </div>
                        <button className="next-btn" onClick={handleNext}>Next</button>

                        {showDateModal && (
                            <DateSelectionModal
                                onClose={() => setShowDateModal(false)}
                                onSelectDates={handleSelectDates}
                                latestBooking={latestBooking}
                            />
                        )}
                    </>
                )}
            </div>
            {/* Add ToastContainer */}
            <ToastContainer
                position="top-center"
                autoClose={5000}
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
        </div>
    );
};

export default PaymentSelection;