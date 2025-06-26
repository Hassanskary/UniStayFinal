import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./EditProfile.css";
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

const EditProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        userName: "",
        email: "",
        phoneNumber: "",
        address: "",
        gender: "Male",
        ssn: ""
    });
    const [errors, setErrors] = useState({});
    const [userRole, setUserRole] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
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
                const currentUserId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                if (!currentUserId) throw new Error("User ID not found in token.");
                setUserRole(role);

                const ownershipResponse = await axios.get(
                    `https://localhost:7194/api/AccountUser/CheckProfileOwnership/${id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const response = await axios.get(
                    `https://localhost:7194/api/AccountUser/Profile/${id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setProfile(response.data);
                setFormData({
                    userName: response.data.userName || "",
                    email: response.data.email || "",
                    phoneNumber: response.data.phoneNumber || "",
                    address: response.data.address || "",
                    gender: Number(response.data.gender) === 0 ? "Male" : "Female",
                    ssn: response.data.ssn || ""
                });
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
                    setError(err.response?.data?.message || err.message || "Failed to load profile.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // ✅ Inline validation for SSN during input
        if (name === "ssn" && value.length !== 14) {
            setErrors((prev) => ({ ...prev, ssn: "SSN must be exactly 14 digits." }));
        } else {
            setErrors((prev) => ({ ...prev, ssn: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // clear previous errors

        try {
            const tokenData = localStorage.getItem("token");
            if (!tokenData) throw new Error("Authentication error. Please log in again.");

            let token;
            try {
                token = JSON.parse(tokenData).token;
            } catch {
                token = tokenData;
            }

            if (!token) throw new Error("Invalid token format.");

            const payload = {
                UserName: formData.userName,
                Email: formData.email,
                Address: formData.address,
                Phone: formData.phoneNumber,
                Gender: formData.gender === "Male" ? 0 : 1 // Explicitly map Male to 0, Female to 1
            };

            console.log("Payload being sent:", payload); // Log to verify Gender value

            if (profile?.ssn !== undefined) {
                payload.SSN = formData.ssn;
            }

            let endpoint;
            if (userRole?.toLowerCase() === "admin") {
                endpoint = `https://localhost:7194/api/AccountAdmin/Edit/${id}`;
            } else if (profile?.ssn !== undefined) {
                endpoint = `https://localhost:7194/api/AccountOwner/Edit/${id}`;
            } else {
                endpoint = `https://localhost:7194/api/AccountUser/Edit/${id}`;
            }

            const response = await axios.put(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Profile updated successfully!",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            }).then(() => {
                navigate(`/Profile/${id}`);
            });
        } catch (err) {
            console.error("Update error:", err.response?.data);
            console.log("Full Error Response:", JSON.stringify(err.response?.data, null, 2));

            // If the response contains an errors object, parse it
            if (err.response?.data?.errors) {
                const apiErrors = err.response.data.errors;
                const formattedErrors = {};

                // Check for duplicate username error
                if (
                    apiErrors.UserName &&
                    apiErrors.UserName.errors &&
                    apiErrors.UserName.errors.length > 0
                ) {
                    formattedErrors.userName = apiErrors.UserName.errors[0].errorMessage;
                }

                // Check for duplicate email error
                if (
                    apiErrors.Email &&
                    apiErrors.Email.errors &&
                    apiErrors.Email.errors.length > 0
                ) {
                    formattedErrors.email = apiErrors.Email.errors[0].errorMessage;
                }

                setErrors(formattedErrors);
            } else if (err.response?.status === 403) {
                Swal.fire({
                    icon: "warning",
                    title: "Not Authorized",
                    text: "You do not have permission to edit this profile.",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#3085d6",
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to update profile.",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#3085d6",
                });
            }
        }
    };

    if (loading) return <div className="loading">Loading profile...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!isAuthorized) return <div className="edit-profile-unauthorized-background-unique" />;

    return (
        <div className="edit-profile-container">
            <Navbar />
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <h2 className="title-edit">Edit Profile</h2>

                <label>Username:</label>
                <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    required
                />
                {errors.userName && <p className="error-message">{errors.userName}</p>}

                <label>Email:</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                {errors.email && <p className="error-message">{errors.email}</p>}

                <label>Phone:</label>
                <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                />

                {userRole?.toLowerCase() !== "admin" && (
                    <>
                        <label>Address:</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                    </>
                )}

                <label>Gender:</label>
                <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>

                {profile?.ssn !== undefined && (
                    <>
                        <label>SSN:</label>
                        <input
                            type="text"
                            name="ssn"
                            value={formData.ssn}
                            onChange={handleChange}
                            required
                        />
                        {errors.ssn && <p className="error-message">{errors.ssn}</p>}
                    </>
                )}
                <br />
                <button type="submit">Save Changes</button>
                <br />
                <button
                    type="button"
                    className="button-33"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate(`/ChangePassword/${id}`);
                    }}
                >
                    Change Password
                </button>
            </form>
        </div>
    );
};

export default EditProfile;