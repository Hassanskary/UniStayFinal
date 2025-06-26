import React from "react";
import { useNavigate } from "react-router-dom";
import "./PaymentStatus.css";

const PaymentCancel = () => {
    const navigate = useNavigate();

    return (
        <div className="payment-cancel-container">
            <h2>Payment Cancelled</h2>
            <p>Your payment was not completed. Please try again or contact support if you need assistance.</p>
            <button onClick={() => navigate("/stripe-payment")}>Retry Payment</button>
            <button onClick={() => navigate("/")}>Go to Home</button>
        </div>
    );
};

export default PaymentCancel;