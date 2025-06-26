import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import "./StripePayment.css";
import "./PaymentStatus.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

const stripePromise = loadStripe("pk_test_51RX6GMPxF2OA15kJgDsed3IXIzjAkxikPQ4g6EFXAbaZAiU9H3dm5viknnNd0QQ2L0LKeBodazxuS6ufsR4jcR6s00fR39RKGF");

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

// PaymentSuccess Component (Modal)
const PaymentSuccess = ({ paymentReference, roomId }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate(`/booking-confirmation/${roomId}`, { state: { paymentReference } });
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate, roomId, paymentReference]);

    return (
        <div className="payment-success-container">
            <h2>Payment Successful!</h2>
            <p>Your booking has been confirmed. You will be redirected to the confirmation page in 5 seconds.</p>
            <button onClick={() => navigate(`/booking-confirmation/${roomId}`, { state: { paymentReference } })}>
                Go to Confirmation Now
            </button>
        </div>
    );
};

// PaymentCancel Component (Modal)
const PaymentCancel = ({ errorMessage, onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="payment-cancel-container">
            <button className="close-btn" onClick={onClose}>X</button>
            <h2>Payment Cancelled</h2>
            <p>{errorMessage || "Your payment was not completed. Please try again or contact support if you need assistance."}</p>
            <button onClick={() => navigate("/")}>Go to Home</button>
        </div>
    );
};

function CheckoutForm() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const stripe = useStripe();
    const elements = useElements();

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [paymentReference, setPaymentReference] = useState("");
    const [minStartDate, setMinStartDate] = useState("");
    const [isRenewal, setIsRenewal] = useState(false);
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

        const fetchLatestBooking = async () => {
            try {
                const jwt = localStorage.getItem("token");
                const response = await axios.get(
                    `https://localhost:7194/api/Stripe/GetLatestPaidBooking?roomId=${roomId}`,
                    { headers: { Authorization: `Bearer ${jwt}` } }
                );
                const latestBooking = response.data;
                const today = new Date();
                today.setDate(today.getDate() + 1);

                if (latestBooking && new Date(latestBooking.endDate) > today &&
                    (latestBooking.status === "Paid" || latestBooking.status === "Confirmed")) {
                    setIsRenewal(true);
                    const minDate = new Date(latestBooking.endDate);
                    minDate.setDate(minDate.getDate() + 1);
                    setMinStartDate(minDate.toISOString().split("T")[0]);
                } else {
                    setIsRenewal(false);
                    setMinStartDate(today.toISOString().split("T")[0]);
                }
            } catch (err) {
                console.error("Error fetching latest booking:", err);
                const today = new Date();
                today.setDate(today.getDate() + 1);
                setMinStartDate(today.toISOString().split("T")[0]);
            }
        };

        checkAuthorization();
        fetchLatestBooking();
    }, [roomId]);

    const validateDateRange = () => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        return end > start && diffDays >= 1 && diffDays <= 30;
    };

    const handlePayment = async () => {
        if (!validateDateRange()) {
            setErrorMessage("End Date must be between 1 and 30 days after Start Date.");
            setShowCancelModal(true);
            return;
        }
        setLoading(true);
        setErrorMessage("");
        setShowSuccessModal(false);
        setShowCancelModal(false);

        const cardElement = elements.getElement(CardNumberElement);
        const { error: tokenError, token } = await stripe.createToken(cardElement);
        if (tokenError || !token) {
            setErrorMessage(tokenError?.message || "Failed to tokenize card");
            console.error("Tokenization error:", tokenError?.message || "No token generated");
            setShowCancelModal(true);
            setLoading(false);
            return;
        }

        try {
            const jwt = localStorage.getItem("token");
            const resp = await axios.post(
                "https://localhost:7194/api/Stripe/CreateBookingWithStripe",
                {
                    roomId: parseInt(roomId),
                    paymentMethod: "Stripe",
                    tokenId: token.id,
                    startDate,
                    endDate,
                    isRenewal
                },
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            setPaymentReference(resp.data.paymentReference);
            setShowSuccessModal(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Payment failed";
            setErrorMessage(errorMsg);
            console.error("Payment error:", err.response?.data || err);
            setShowCancelModal(true);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthorized) return <div className="stripe-payment-unauthorized-background-unique" />;

    return (
        <div className="stripe-payment-container">
            <Navbar />
            <h2>Pay with Stripe</h2>
            <label>Card Number</label>
            <CardNumberElement className="card-element" options={{ hidePostalCode: true }} />
            <label>Expiry Date</label>
            <CardExpiryElement className="card-element" options={{ hidePostalCode: true }} />
            <label>CVC</label>
            <CardCvcElement className="card-element" options={{ hidePostalCode: true }} />
            <label>Start Date</label>
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minStartDate}
                required
            />
            <label>End Date</label>
            <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 1)).toISOString().split("T")[0] : ""}
                max={startDate ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 30)).toISOString().split("T")[0] : ""}
                required
            />
            <button onClick={handlePayment} disabled={!stripe || loading} className="pay-btn">
                {loading ? "Processing Payment..." : "Pay Now"}
            </button>

            {showSuccessModal && (
                <div className="modal-overlay">
                    <PaymentSuccess paymentReference={paymentReference} roomId={roomId} />
                </div>
            )}
            {showCancelModal && (
                <div className="modal-overlay">
                    <PaymentCancel errorMessage={errorMessage} onClose={() => {
                        setShowCancelModal(false);
                        setErrorMessage("");
                    }} />
                </div>
            )}
        </div>
    );
}

export default function StripePaymentWrapper() {
    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm />
        </Elements>
    );
}