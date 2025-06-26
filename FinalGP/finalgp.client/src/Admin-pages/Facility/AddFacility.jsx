import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Lottie from "lottie-react";
import Navbar from "../../components/Navbar";
import loadingAnimation from "../../assets/loading.json";
import emptyAnimation from "../../assets/empty.json";
import editAnimation from "../../assets/edit.json";
import deleteAnimation from "../../assets/delete.json";
import addAnimation from "../../assets/add.json";
import saveAnimation from "../../assets/save.json";
import "./AddFacility.css";

const API_URL = "https://localhost:7194/api/Facility";

const getAuthToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        return token.startsWith("{") ? JSON.parse(token).token : token;
    } catch (error) {
        console.error("Invalid token format", error);
        return null;
    }
};

const FacilityManager = () => {
    const [facilities, setFacilities] = useState([]);
    const [name, setName] = useState("");
    const [editingFacilityId, setEditingFacilityId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization
    const navigate = useNavigate();
    const location = useLocation();

    const fetchFacilities = useCallback(async () => {
        setLoading(true);
        setError(null);

        const token = getAuthToken();
        if (!token) {
            setError("Authentication token is missing");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/GetAll`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log("Facilities API Response:", response.data);

            // Check if the API returns a plain array or an object with $values
            let facilitiesData = [];
            if (Array.isArray(response.data)) {
                facilitiesData = response.data;
            } else if (response.data && Array.isArray(response.data.$values)) {
                facilitiesData = response.data.$values;
            } else {
                facilitiesData = [];
            }

            setFacilities(facilitiesData);
        } catch (err) {
            console.error(
                "Fetch Error:",
                err.response ? err.response.data : err.message
            );
            setError("Error fetching facilities");
        } finally {
            setLoading(false);
        }
    }, []);

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
                text: "You do not have permission to manage facilities.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            fetchFacilities();
        }
    }, [navigate, location.pathname]);

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

    const handleAddFacility = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Facility name cannot be empty.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setError("Authentication token is missing");
            return;
        }

        try {
            await axios.post(
                `${API_URL}/Add`,
                { name },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setName("");
            fetchFacilities();
        } catch (err) {
            console.error(
                "Add Facility Error:",
                err.response ? err.response.data : err.message
            );
            setError("Error adding facility");
        }
    };

    const handleDeleteFacility = async (id) => {
        const token = getAuthToken();
        if (!token) {
            setError("Authentication token is missing");
            return;
        }

        try {
            await axios.delete(`${API_URL}/Delete/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setFacilities((prev) => prev.filter((facility) => facility.id !== id));
        } catch (err) {
            console.error(
                "Delete Error:",
                err.response ? err.response.data : err.message
            );
            setError("Error deleting facility");
        }
    };

    const handleEditFacility = (facility) => {
        setEditingFacilityId(facility.id);
        setEditingName(facility.name);
    };

    const handleSaveEdit = async (id) => {
        if (!editingName.trim()) {
            setError("Facility name cannot be empty.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setError("Authentication token is missing");
            return;
        }

        try {
            await axios.put(
                `${API_URL}/Update/${id}`,
                { name: editingName },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setFacilities((prev) =>
                prev.map((facility) =>
                    facility.id === id ? { ...facility, name: editingName } : facility
                )
            );
            setEditingFacilityId(null);
        } catch (err) {
            console.error(
                "Update Error:",
                err.response ? err.response.data : err.message
            );
            setError("Error updating facility");
        }
    };

    return (
        <div className="facility-container">
            <Navbar />
            {isAuthorized ? (
                <>
                    <br />
                    <br />

                    <div className="addfacility-box">
                        <h2>Facility Management</h2>
                        <form onSubmit={handleAddFacility} className="addfacility-form">
                            <div className="input-container">
                                <input
                                    type="text"
                                    placeholder="facility Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="addfacility-input"
                                />
                                <button type="submit" className="add-addfacility-btn">
                                    <Lottie animationData={addAnimation} className="add-icon" />
                                </button>
                            </div>
                        </form>
                        {loading && (
                            <div className="loading-container">
                                <Lottie animationData={loadingAnimation} loop />
                            </div>
                        )}
                        {error && <p className="error">{error}</p>}
                        {facilities.length === 0 && !loading ? (
                            <div className="empty-container">
                                <Lottie animationData={emptyAnimation} className="empty-icon" />
                                <p>No facilities found</p>
                            </div>
                        ) : (
                            <ul className="addfacility-list">
                                {facilities.map((facility) => (
                                    <li key={facility.id} className="addfacility-list-item">
                                        {editingFacilityId === facility.id ? (
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="edit-input"
                                            />
                                        ) : (
                                            <span>{facility.name}</span>
                                        )}
                                        <div className="icons">
                                            {editingFacilityId === facility.id ? (
                                                <Lottie
                                                    animationData={saveAnimation}
                                                    className="icon save"
                                                    style={{ width: 30, height: 30, cursor: "pointer" }}
                                                    onClick={() => handleSaveEdit(facility.id)}
                                                />
                                            ) : (
                                                <Lottie
                                                    animationData={editAnimation}
                                                    className="icon edit"
                                                    style={{ width: 30, height: 30, cursor: "pointer" }}
                                                    onClick={() => handleEditFacility(facility)}
                                                />
                                            )}
                                            <Lottie
                                                animationData={deleteAnimation}
                                                className="icon delete"
                                                style={{ width: 30, height: 30, cursor: "pointer" }}
                                                onClick={() => handleDeleteFacility(facility.id)}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            ) : (
                <div className="unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default FacilityManager;