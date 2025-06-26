import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ShowFacilities.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2"; // Added for SweetAlert2

// Helper to extract token from localStorage
const getToken = () => {
    const rawToken = localStorage.getItem("token");
    if (!rawToken) return null;
    try {
        return JSON.parse(rawToken)?.token || rawToken;
    } catch (error) {
        return rawToken;
    }
};

// Helper to decode a JWT token
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

const ShowFacilities = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    // Get the token and decode it to extract the user role
    const token = getToken();
    const decodedToken = parseJwt(token);
    const role =
        decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        decodedToken?.role ||
        "";
    const isAdmin = role.trim().toLowerCase() === "admin";
    const isOwner = role.trim().toLowerCase() === "owner";

    useEffect(() => {
        const fetchSelectedFacilities = async () => {
            try {
                // ÊÍÞÞ ãä ÇáÕáÇÍíÉ ÅÐÇ ßÇä Ýíå token
                if (!token) {
                    if (!isAdmin) {
                        setIsAuthorized(false);
                        Swal.fire({
                            icon: "warning",
                            title: "Not Authorized",
                            text: "Please log in to access this page.",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#3085d6",
                        }).then(() => {
                            navigate("/login"); // Redirect to login if not logged in and not admin
                        });
                        return;
                    }
                } else {
                    const decoded = parseJwt(token);
                    const userId = decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded?.nameid;

                    if (isOwner && userId) {
                        try {
                            await axios.get(
                                `https://localhost:7194/api/Room/CheckOwnership?homeId=${homeId}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                        } catch (ownershipErr) {
                            if (ownershipErr.response?.status === 403) {
                                setIsAuthorized(false);
                                Swal.fire({
                                    icon: "warning",
                                    title: "Not Authorized",
                                    text: "You do not own this home.",
                                    confirmButtonText: "OK",
                                    confirmButtonColor: "#3085d6",
                                });
                                return; // Stop further execution if not authorized
                            }
                        }
                    } else if (!isAdmin && !isOwner) {
                        setIsAuthorized(false); // Non-admin and non-owner users are not authorized
                        Swal.fire({
                            icon: "warning",
                            title: "Not Authorized",
                            text: "You do not have permission to view this page.",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#3085d6",
                        });
                        return;
                    }
                }

                // Fetch facilities with authorization header if token exists
                const response = await axios.get(
                    `https://localhost:7194/api/Home/GetSelectedFacilities/${homeId}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                console.log("Fetched selected facilities:", response.data);
                setFacilities(response.data.facilities || []);
            } catch (err) {
                console.error("Error fetching facilities:", err);
                if (err.response?.status === 401) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Session Expired",
                        text: "Your session has expired. Please log in again.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    }).then(() => {
                        navigate("/login"); // Redirect to login on 401
                    });
                } else {
                    setError("Failed to load facilities. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchSelectedFacilities();
    }, [homeId, token, isAdmin, isOwner, navigate]);

    // Handler for the back button: always navigate to the owner home details page
    const handleBack = () => {
        navigate(`/home-details/${homeId}`);
    };

    // Handler for editing facilities (only for non-admin users who own the home)
    const handleEditFacilities = () => {
        navigate(`/home-facilities/${homeId}`);
    };

    if (loading) return <p className="loading">Loading facilities...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!isAuthorized) return <div className="facilities-owner-unauthorized-background-unique" />;

    return (
        <div className="facilities-container">
            <Navbar />
            <div className="facilities-box">
                <h2>Show Facilities</h2>
                <div className="facilities-list">
                    {facilities.length > 0 ? (
                        facilities.map((facility) => (
                            <div key={facility.id} className="facility-item">
                                <span className="facility-name-ho">{facility.name}</span>
                            </div>
                        ))
                    ) : (
                        <p>No facilities available.</p>
                    )}
                </div>
                {/* Render the Edit Facilities button only for non-admin users who own the home */}
                {!isAdmin && isOwner && (
                    <button className="button-33" onClick={handleEditFacilities}>
                        Edit Facilities
                    </button>
                )}
                <button className="button-33" onClick={handleBack}>
                    Back to Home Details
                </button>
            </div>
        </div>
    );
};

export default ShowFacilities;