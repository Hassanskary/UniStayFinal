import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./HomeFacilities.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

function parseJwt(token) {
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
        return null;
    }
}

const HomeFacilities = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    useEffect(() => {
        // Extract ownerId from token if not already set
        if (!ownerId) {
            let tokenData = localStorage.getItem("token");
            if (tokenData) {
                try {
                    const tokenObj = JSON.parse(tokenData);
                    tokenData = tokenObj.token || tokenData;
                } catch (e) {
                    // If token is not JSON, leave it as is
                }
                const parsed = parseJwt(tokenData);
                const id =
                    parsed?.nameid ||
                    parsed?.sub ||
                    parsed?.id ||
                    parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                if (id) {
                    setOwnerId(id);
                    localStorage.setItem("ownerId", id);
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
            // تحقق من ملكية الـ Home
            const checkOwnership = async () => {
                try {
                    const response = await axios.get(
                        `https://localhost:7194/api/Room/CheckOwnership?homeId=${homeId}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    // لو الـ API رجع 200، فالـ Owner يملك الـ Home
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
                let tokenData = localStorage.getItem("token");
                if (!tokenData) {
                    toast.error("No token found, please log in.");
                    throw new Error("No token found, please log in.");
                }
                try {
                    const tokenObj = JSON.parse(tokenData);
                    tokenData = tokenObj.token || tokenData;
                } catch (e) {
                    // Leave token as is
                }
                const response = await axios.get(
                    `https://localhost:7194/api/Home/AddFacilities/${homeId}`,
                    { headers: { Authorization: `Bearer ${tokenData}` } }
                );
                console.log("Facilities API response:", response.data);
                const facs = response.data.facilities?.$values || response.data.facilities || [];
                setFacilities(facs);
            } catch (err) {
                console.error("Error fetching facilities:", err);
                toast.error("Failed to load facilities. Please try again.");
                setError("Failed to load facilities. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (isAuthorized) {
            fetchFacilities();
        }
    }, [homeId, ownerId, isAuthorized, navigate]);

    const handleCheckboxChange = (facilityId) => {
        setFacilities((prev) =>
            prev.map((facility) =>
                facility.id === facilityId
                    ? { ...facility, isSelected: !facility.isSelected }
                    : facility
            )
        );
    };

    const handleSaveFacilities = async () => {
        try {
            let tokenData = localStorage.getItem("token");
            if (!tokenData) {
                toast.error("No token found, please log in.");
                throw new Error("No token found, please log in.");
            }
            try {
                const tokenObj = JSON.parse(tokenData);
                tokenData = tokenObj.token || tokenData;
            } catch (e) { }

            const selectedFacilityIds = facilities.filter(f => f.isSelected).map(f => f.id);
            if (selectedFacilityIds.length === 0) {
                toast.warning("Please select at least one facility before saving.");
                return;
            }

            await axios.post(
                `https://localhost:7194/api/Home/SaveFacilities/${homeId}`,
                selectedFacilityIds,
                {
                    headers: {
                        Authorization: `Bearer ${tokenData}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            toast.success("Facilities updated successfully!");

            if (ownerId) {
                navigate(`/OwnerHomes/${ownerId}`);
            } else {
                toast.error("Owner ID not found. Please log in again.");
                setError("Owner ID not found. Please log in again.");
            }
        } catch (err) {
            console.error("Error saving facilities:", err);
            toast.error("Failed to update facilities. Please try again.");
            setError("Failed to update facilities. Please try again.");
        }
    };

    if (loading) return <p className="loading">Loading facilities...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="facilities-container">
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
                    <h2>Facilities for Home {homeId}</h2>
                    <div className="facilities-list">
                        {facilities.length > 0 ? (
                            facilities.map((facility) => (
                                <div key={facility.id} className="facility-item">
                                    <span className="facility-name-hom">{facility.name}</span>
                                    <input
                                        type="checkbox"
                                        className="facility-checkbox"
                                        checked={facility.isSelected}
                                        onChange={() => handleCheckboxChange(facility.id)}
                                    />
                                </div>
                            ))
                        ) : (
                            <p>No facilities available.</p>
                        )}
                    </div>
                    <button className="button-33" onClick={handleSaveFacilities}>
                        Save Facilities
                    </button>
                </div>
            ) : (
                <div className="facilityy-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default HomeFacilities;