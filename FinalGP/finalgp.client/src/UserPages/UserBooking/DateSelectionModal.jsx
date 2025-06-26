
import React, { useState } from "react";
import "./DateSelectionModal.css";

const DateSelectionModal = ({ onClose, onSelectDates, latestBooking }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState("");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // أقل تاريخ ممكن لبداية الحجز = غدًا أو بعد نهاية آخر حجز مؤكد/مدفوع
    let minStartDate = new Date(Date.now() + 86400000); // غدًا

    if (
        latestBooking &&
        (latestBooking.status === "Confirmed" || latestBooking.status === "Paid") &&
        new Date(latestBooking.endDate) > today
    ) {
        minStartDate = new Date(latestBooking.endDate);
        minStartDate.setDate(minStartDate.getDate() + 1);
    }

    const handleSubmit = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!startDate || !endDate) {
            setError("Both start date and end date are required.");
            return;
        }

        if (start <= today) {
            setError("Start date must be after today.");
            return;
        }

        if (start < minStartDate) {
            setError(
                `Start date must be after the existing booking's end date (${minStartDate.toISOString().split("T")[0]}).`
            );
            return;
        }

        if (end <= start) {
            setError("End date must be after start date.");
            return;
        }

        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (diffDays < 1) {
            setError("The booking must be for at least one day.");
            return;
        }

        setError("");
        onSelectDates(startDate, endDate);
    };

    const getMinEndDate = () => {
        if (!startDate) return "";
        const minEnd = new Date(startDate);
        minEnd.setDate(minEnd.getDate() + 1);
        return minEnd.toISOString().split("T")[0];
    };

    const getMaxEndDate = () => {
        if (!startDate) return "";
        const maxEnd = new Date(startDate);
        maxEnd.setDate(maxEnd.getDate() + 30);
        return maxEnd.toISOString().split("T")[0];
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Select Booking Dates</h3>
                {error && <p className="error">{error}</p>}

                <div>
                    <label>Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={minStartDate.toISOString().split("T")[0]}
                    />
                </div>

                <div>
                    <label>End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={getMinEndDate()}
                        max={getMaxEndDate()}
                    />
                </div>

                <button className=" modal-content-b btn-ok" onClick={handleSubmit}>OK</button>
                <button className="modal-content-b btn-can" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default DateSelectionModal;
