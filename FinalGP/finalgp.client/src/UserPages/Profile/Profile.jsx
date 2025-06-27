import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import {
    FaEnvelope,
    FaUser,
    FaPhone,
    FaMapMarkerAlt,
    FaVenusMars,
    FaIdCard,
    FaUserCircle
} from 'react-icons/fa';
import { MdEdit, MdBook, MdManageAccounts } from 'react-icons/md';
import "./Profile.css";

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

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const tokenData = localStorage.getItem("token");
                if (!tokenData) throw new Error("No token found, please log in.");

                const token = tokenData;
                const decodedToken = parseJwt(token);
                const role = decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
                const id = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                setUserRole(role);
                setUserId(id);

                const response = await axios.get(`https://localhost:7194/api/AccountUser/Profile/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProfile(response.data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError(err.response?.data || err.message || "Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="button-33" onClick={() => window.location.reload()}>Try Again</button>
        </div>
    );

    const genderText = profile && (Number(profile.gender) === 0 ? "Male" : "Female");

    return (
        <div className="profile-container">
            <Navbar />

            {profile && (
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-picture">
                            <FaUserCircle size={80} />
                        </div>
                        <h2>{profile.userName}</h2>
                    </div>

                    <div className="profile-info">
                        <div className="info-item">
                            <FaEnvelope className="icon" />
                            <div>
                                <span className="label">Email</span>
                                <span className="value">{profile.email}</span>
                            </div>
                        </div>

                        <div className="info-item">
                            <FaPhone className="icon" />
                            <div>
                                <span className="label">Phone</span>
                                <span className="value">{profile.phoneNumber}</span>
                            </div>
                        </div>

                        <div className="info-item">
                            <FaMapMarkerAlt className="icon" />
                            <div>
                                <span className="label">Address</span>
                                <span className="value">{profile.address}</span>
                            </div>
                        </div>

                        <div className="info-item">
                            <FaVenusMars className="icon" />
                            <div>
                                <span className="label">Gender</span>
                                <span className="value">{genderText}</span>
                            </div>
                        </div>

                        {profile.ssn && (
                            <div className="info-item">
                                <FaIdCard className="icon" />
                                <div>
                                    <span className="label">SSN</span>
                                    <span className="value">{profile.ssn}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="profile-buttons">
                        <button className="button-33" onClick={() => navigate(`/EditProfile/${userId}`)}>
                            <MdEdit /> Edit Profile
                        </button>

                        {userRole === "User" && (
                            <button className="button-33" onClick={() => navigate(`/user-bookings/${userId}`)}>
                                <MdBook /> My Bookings
                            </button>
                        )}

                        {userRole === "Owner" && (
                            <button className="button-33" onClick={() => navigate(`/manage-bookings/${userId}`)}>
                                <MdManageAccounts /> Manage Bookings
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;