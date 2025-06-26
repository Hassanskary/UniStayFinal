import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2";
import "./ReportedHomesList.css";

const ReportedHomesList = () => {
    const [reportedHomes, setReportedHomes] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

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
                text: "You do not have permission to view reported homes.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            fetchReportedHomes();
        }
    }, [navigate]);

    const fetchReportedHomes = async () => {
        try {
            const response = await axios.get("https://localhost:7194/api/Report/ReportedHomes", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            console.log("Reported Homes:", response.data);
            setReportedHomes(response.data);
        } catch (err) {
            console.error("Error fetching reported homes:", err);
            setError("Failed to fetch reported homes.");
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

    if (error && !isAuthorized) {
        return (
            <div>
                <Navbar />
                <p className="error">{error}</p>
            </div>
        );
    }

    return (
        <div className="reported-homes-container">
            <Navbar />
            {isAuthorized ? (
                <>
                    <h2>Reported Homes</h2>
                    <div className="reported-homes-list">
                        {reportedHomes.length === 0 ? (
                            <div className="no-reports-card">
                                <p>No Reports Found</p>
                            </div>
                        ) : (
                            reportedHomes.map((home, index) => (
                                <div
                                    key={home.homeId ? home.homeId.toString() : index.toString()}
                                    className="home-card"
                                    onClick={() => navigate(`/HomeReports/${home.homeId}`)}
                                >
                                    <h3>{home.title}</h3>
                                    <p>Number Of Reports: {home.totalReports}</p>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="report-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default ReportedHomesList;