import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./HomeReportsDetails.css";
import { ToastContainer, toast } from 'react-toastify';
import Swal from "sweetalert2";
import 'react-toastify/dist/ReactToastify.css';

const HomeReportsDetails = () => {
    const { homeId } = useParams();
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [showBanModal, setShowBanModal] = useState(false);
    const [banReason, setBanReason] = useState("");
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const decoded = parseJwt(token);
        const userRole = decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded?.role;
        if (userRole !== "Admin") {
            setIsAuthorized(false);
            Swal.fire({
                icon: "warning",
                title: "Not Authorized",
                text: "You do not have permission to view or manage reports.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            fetchReports();
        }
    }, [navigate, homeId]);

    const fetchReports = async () => {
        try {
            const response = await axios.get(
                `https://localhost:7194/api/Report/ReportsForHome/${homeId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }
            );
            console.log("Reports for Home:", response.data);
            setReports(response.data);
        } catch (err) {
            console.error("Error fetching reports:", err);
            setError("Failed to load reports.");
        }
    };

    // Helper to extract token from localStorage (handles plain string or JSON format)
    const getToken = () => {
        let tokenData = localStorage.getItem("token");
        if (!tokenData) return null;
        tokenData = tokenData.trim();
        if (tokenData.startsWith("{")) {
            try {
                const parsed = JSON.parse(tokenData);
                return parsed.token || tokenData;
            } catch (e) {
                console.error("Token parsing error:", e);
                return tokenData;
            }
        }
        return tokenData;
    };

    // Open the ban modal when "Resolve All Reports" is clicked
    const handleOpenBanModal = () => {
        setShowBanModal(true);
    };

    const handleSubmitBanReason = async () => {
        // Check if banReason is empty or contains only whitespace
        if (!banReason.trim()) {
            toast.error("Ban reason cannot be empty. Please provide a reason.");
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                toast.error("No token found. Please log in.");
                return;
            }
            // Pass the ban reason in the request body
            await axios.put(
                `https://localhost:7194/api/Report/ResolveReports/${homeId}`,
                { reason: banReason.trim() }, // Trim to remove leading/trailing spaces
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            toast.success("Reports resolved successfully!");
            navigate("/ReportedHomes");
        } catch (err) {
            console.error("Error resolving reports:", err);
            toast.error("Failed to resolve reports. Please try again.");
        }
    };

    // Handle rejection of reports (home remains approved)
    const handleRejectReports = async () => {
        try {
            const token = getToken();
            if (!token) {
                toast.error("No token found. Please log in.");
                return;
            }
            await axios.put(
                `https://localhost:7194/api/Report/RejectReports/${homeId}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            toast.success("Reports rejected successfully!");
            navigate("/ReportedHomes");
        } catch (err) {
            console.error("Error rejecting reports:", err);
            toast.error("Failed to reject reports. Please try again.");
        }
    };

    // Function to parse JWT (moved here for reuse)
    const parseJwt = (token) => {
        if (!token) return null;
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        try {
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Failed to parse JWT:", e);
            return null;
        }
    };

    return (
        <div className="home-reports-container">
            <Navbar />
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
            {isAuthorized ? (
                <>
                    <h2>Reports for Home {homeId}</h2>

                    {error && <p className="error">{error}</p>}

                    <div className="reports-list">
                        {reports.map((report) => (
                            <div key={report.reportId} className="report-card">
                                <p><strong>User:</strong> {report.userName}</p>
                                <p><strong>Reason:</strong> {report.reason}</p>
                                <p>
                                    <strong>Date:</strong>{" "}
                                    {new Date(report.date).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="button-group">
                        <button className="button-33 resolve-btn" onClick={handleOpenBanModal}>
                            Resolve All Reports
                        </button>
                        <button className="button-33 reject-btn" onClick={handleRejectReports}>
                            Reject All Reports
                        </button>
                    </div>

                    {showBanModal && (
                        <div className="ban-modal-overlay">
                            <div className="ban-modal-content">
                                <h3>Enter Ban Reason</h3>
                                <textarea
                                    placeholder="Enter ban reason..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    className="ban-reason-textarea"
                                />
                                <div className="ban-modal-buttons">
                                    <button onClick={handleSubmitBanReason} className="button-style btn-confirm">
                                        Confirm
                                    </button>
                                    <button onClick={() => setShowBanModal(false)} className="button-style cancel-btn-re">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="report-details-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default HomeReportsDetails;