import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import "./Profile.css";
import Swal from "sweetalert2"; // Added for SweetAlert2

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

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    useEffect(() => {
        const fetchProfile = async () => {
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
                const role = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
                const id = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                if (!id) throw new Error("User ID not found in token.");

                setUserRole(role);
                setUserId(id);
                console.log("User Role:", role); // للتصحيح

                const ownershipResponse = await axios.get(
                    `https://localhost:7194/api/AccountUser/CheckProfileOwnership/${id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const response = await axios.get(`https://localhost:7194/api/AccountUser/Profile/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProfile(response.data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                if (err.response?.status === 403) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not own this profile.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else {
                    setError(err.response?.data || err.message || "Failed to load profile.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) return <div className="loading">Loading profile...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!isAuthorized) return <div className="profile-unauthorized-background-unique" />;

    /* const genderText = profile && (Number(profile.gender) === 0 ? "Male" : "Female");*/
    const genderText = profile && (profile.gender?.toLowerCase() === "male" ? "Male" : "Female");

    console.log("Gender value:", profile.gender);


    return (
        <div className="profile-container">
            <Navbar />

            {profile && (
                <div className="profile-card">
                    <h2 className="profile-title">Profile</h2>
                    <div className="profile-info-grid">
                        <div className="info-card"><strong>Email:</strong> {profile.email}</div>
                        <div className="info-card"><strong>Username:</strong> {profile.userName}</div>
                        <div className="info-card"><strong>Phone:</strong> {profile.phoneNumber}</div>
                        {userRole?.toLowerCase() !== "admin" && (
                            <div className="info-card"><strong>Address:</strong> {profile.address}</div>
                        )}
                        <div className="info-card"><strong>Gender:</strong> {genderText}</div>
                        {profile.ssn && <div className="info-card"><strong>SSN:</strong> {profile.ssn}</div>}
                    </div>
                    <div>
                        <button className="button-33" onClick={() => navigate(`/EditProfile/${userId}`)}>Edit Profile</button>
                        {userRole === "User" && (
                            <button className="button-33" onClick={() => navigate(`/user-bookings/${userId}`)}>My Bookings</button>
                        )}
                        {userRole === "Owner" && (
                            <button className="button-33" onClick={() => navigate(`/manage-bookings/${userId}`)}>Manage Bookings</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;