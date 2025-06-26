import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminPendingHomes.css";
import Navbar from "../../components/Navbar";
import { ToastContainer, toast } from 'react-toastify';
import Swal from "sweetalert2";
import 'react-toastify/dist/ReactToastify.css';

function fixDoubleSlash(path) {
    if (!path) return "";
    return path.replace(/([^:])\/{2,}/g, "$1/");
}

const fallbackImage = "https://placehold.co/400x300?text=No+Image";

const AdminPendingHomes = () => {
    const navigate = useNavigate();
    const [homes, setHomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showContract, setShowContract] = useState({});
    const [fade, setFade] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    const PENDING_HOMES_URL = "https://localhost:7194/api/Home/GetPendingHomes";
    const UPDATE_STATUS_URL = (id) => `https://localhost:7194/api/Home/UpdateHomeStatus/${id}`;

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
                text: "You do not have permission to manage pending homes.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            fetchPendingHomes();
        }
    }, [navigate]);

    const fetchPendingHomes = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No token found, please log in.");

            const response = await axios.get(PENDING_HOMES_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const extractedHomes = response.data?.$values ? response.data.$values : response.data;

            console.log("API Response (raw):", response.data);
            console.log("Extracted Homes:", extractedHomes);

            if (extractedHomes.length === 0) {
                setError("No homes exist.");
            } else {
                setHomes(extractedHomes);
            }
        } catch (err) {
            console.error("Error fetching pending homes:", err);
            if (err.response?.status === 404) {
                setError("No homes exist.");
                toast.error("No homes exist.");
            } else {
                setError(err.response?.data?.message || "Failed to load pending homes.");
                toast.error(err.response?.data?.message || "Failed to load pending homes.");
            }
            setHomes([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleImage = (homeId) => {
        setFade((prev) => ({ ...prev, [homeId]: true }));
        setTimeout(() => {
            setShowContract((prev) => ({ ...prev, [homeId]: !prev[homeId] }));
            setFade((prev) => ({ ...prev, [homeId]: false }));
        }, 300);
    };

    const handleUpdateStatus = async (homeId, status) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No token found, please log in.");

            const response = await axios.put(
                UPDATE_STATUS_URL(homeId),
                JSON.stringify(status),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 200) {
                toast.success(`Home status updated to ${status}`);
                setHomes((prev) => prev.filter((h) => h.id !== homeId));
            } else {
                toast.error(response.data.message || "Failed to update home status.");
            }
        } catch (err) {
            console.error("Error updating home status:", err);
            if (err.response?.status === 404) {
                setError("No homes exist.");
                toast.error("No homes exist.");
            } else {
                setError(err.response?.data?.message || `Error: ${err.response?.status}`);
                toast.error(err.response?.data?.message || "Failed to update home status.");
            }
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

    if (loading) return <div className="loading-spinner">Loading pending homes...</div>;

    return (
        <div className="admin-pending-homes-container">
            <Navbar />
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
            {isAuthorized ? (
                error === "No homes exist." || homes.length === 0 ? (
                    <div className="no-homes-container">
                        <p className="no-homes">No homes exist.</p>
                    </div>
                ) : (
                    <>
                        <h2>Pending Homes for Approval</h2>
                        <div className="homes-list">
                            {homes.map((home) => {
                                const contractPhoto = fixDoubleSlash(home.contractPhoto);
                                const firstPhoto = fixDoubleSlash(home.firstPhoto);
                                const displayedPhoto = showContract[home.id] ? contractPhoto : firstPhoto;
                                const finalPhoto = displayedPhoto && displayedPhoto !== "" ? displayedPhoto : fallbackImage;

                                return (
                                    <div key={home.id} className="home-card">
                                        <div className="home-details">
                                            <h2 className="home-title">{home.title}</h2>
                                            <p><strong>City:</strong> {home.city || "N/A"}</p>
                                            <p><strong>Rooms:</strong> {home.numOfRooms}</p>
                                            <p><strong>Status:</strong> {home.status || "PendingApproval"}</p>
                                            <p><strong>Type:</strong> {home.type || "N/A"}</p>
                                            <p><strong>Gender:</strong> {home.gender || "N/A"}</p>
                                            <div className="home-buttons">
                                                <button className="button-custom btn-approve" onClick={() => handleUpdateStatus(home.id, "Accepted")}>
                                                    Approve
                                                </button>
                                                <button className="button-custom btn-reject" onClick={() => handleUpdateStatus(home.id, "Rejected")}>
                                                    Reject
                                                </button>
                                                <button className="button-custom details-btn" onClick={() => navigate(`/home-details/${home.id}`)}>
                                                    More Details
                                                </button>
                                            </div>
                                        </div>
                                        <div className="home-image-container">
                                            <img
                                                src={finalPhoto}
                                                alt={showContract[home.id] ? "Contract" : "Home"}
                                                className={`home-image ${fade[home.id] ? "fade-out" : "fade-in"}`}
                                                style={{ objectFit: "contain" }}
                                                onError={(e) => { e.target.src = fallbackImage; }}
                                            />
                                            <div className="btn-bottom-section">
                                                <button className="button-custom btn-toggle" onClick={() => toggleImage(home.id)}>
                                                    {showContract[home.id] ? "Show Home" : "View Contract"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )
            ) : (
                <div className="admin-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default AdminPendingHomes;