import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./HomeFacility.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

// Custom function to parse JWT token
function parseJwt(token) {
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
        return null;
    }
}

const Facilities = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [selectedFacilities, setSelectedFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    useEffect(() => {
        // Extract ownerId from token if not already set
        if (!ownerId) {
            let tokenString = localStorage.getItem("token");
            if (tokenString) {
                try {
                    const tokenObj = JSON.parse(tokenString);
                    tokenString = tokenObj.token || tokenString;
                } catch (e) {
                    // If token is not JSON, leave it as is
                }
                const parsed = parseJwt(tokenString);
                console.log("Parsed Token:", parsed);
                const id =
                    parsed?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                    parsed?.nameid ||
                    parsed?.sub ||
                    parsed?.id;
                if (id) {
                    setOwnerId(id);
                    localStorage.setItem("ownerId", id);
                    console.log("Extracted Owner ID:", id);
                }
            }
        }

        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const decoded = parseJwt(token);
        const userRole = decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || decoded?.role;

        if (userRole !== "Owner") {
            setIsAuthorized(false);
            Swal.fire({
                icon: "warning",
                title: "Not Authorized",
                text: "You do not have permission to add facilities.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            // ÊÍÞÞ ãä ãáßíÉ ÇáÜ Home
            const checkOwnership = async () => {
                try {
                    const response = await axios.get(
                        `https://localhost:7194/api/Room/CheckOwnership?homeId=${homeId}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    // áæ ÇáÜ API ÑÌÚ 200¡ ÝÇáÜ Owner íãáß ÇáÜ Home
                } catch (error) {
                    if (error.response && error.response.status === 403) {
                        setIsAuthorized(false);
                        Swal.fire({
                            icon: "warning",
                            title: "Not Authorized",
                            text: "You do not own this home.",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#3085d6",
                        });
                    } else {
                        console.error("Error checking ownership:", error);
                    }
                }
            };
            checkOwnership();
        }

        const fetchFacilities = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("No token found, please log in.");

                const response = await axios.get(
                    `https://localhost:7194/api/Home/AddFacilities/${homeId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log("Facilities API response:", response.data);
                // Extract facilities array (handles $values if present)
                const facilitiesArray = response.data.facilities?.$values || response.data.facilities || [];
                setFacilities(facilitiesArray);
                const initiallySelected = facilitiesArray.filter(f => f.isSelected).map(f => f.id);
                setSelectedFacilities(initiallySelected);
            } catch (err) {
                console.error("Error fetching facilities:", err);
                //setError("Failed to load facilities. Please try again.");
                toast.error("Failed to load facilities. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (isAuthorized) {
            fetchFacilities();
        }
    }, [homeId, ownerId, isAuthorized, navigate]);

    const handleCheckboxChange = (facilityId) => {
        setSelectedFacilities(prev =>
            prev.includes(facilityId)
                ? prev.filter(id => id !== facilityId)
                : [...prev, facilityId]
        );
    };

    const handleSaveFacilities = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No token found, please log in.");

            await axios.post(
                `https://localhost:7194/api/Home/SaveFacilities/${homeId}`,
                selectedFacilities,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            toast.success("Facilities saved successfully!");
            //alert("Facilities saved successfully!");

            if (ownerId) {
                navigate(`/OwnerHomes/${ownerId}`);
            } else {
                //alert("Owner ID not found!");
                toast.error("Owner ID not found. Please log in again.");
            }
        } catch (err) {
            console.error("Error saving facilities:", err);
            toast.error("Failed to save facilities. Please try again.");
            //setError("Failed to update facilities.");
        }
    };

    if (loading) return <p className="loading">Loading facilities...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="facility-container">
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
                <div className="facilities-box">
                    <h2>Select Facilities for Home</h2>
                    <div className="facilities-list">
                        {facilities.length > 0 ? (
                            facilities.map((facility) => (
                                <label key={facility.id} className="facility-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedFacilities.includes(facility.id)}
                                        onChange={() => handleCheckboxChange(facility.id)}
                                    />
                                    {facility.name}
                                </label>
                            ))
                        ) : (
                            <p>No facilities available.</p>
                        )}
                    </div>
                    <div className="button-group">
                        <button onClick={handleSaveFacilities} className="button-33">Save</button>
                    </div>
                </div>
            ) : (
                <div className="facility-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default Facilities;