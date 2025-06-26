import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import "./ChangePassword.css";
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

const ChangePassword = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(true); // New state for authorization

    useEffect(() => {
        const checkAuthorization = async () => {
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
                const currentUserId = decodedToken?.sub || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
                if (!currentUserId) throw new Error("User ID not found in token.");

                const ownershipResponse = await axios.get(
                    `https://localhost:7194/api/AccountUser/CheckProfileOwnership/${id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("Error checking authorization:", err);
                if (err.response?.status === 403) {
                    setIsAuthorized(false);
                    Swal.fire({
                        icon: "warning",
                        title: "Not Authorized",
                        text: "You do not own this profile.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                }
            }
        };

        checkAuthorization();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        let tempErrors = {};

        if (!formData.oldPassword.trim()) {
            tempErrors.oldPassword = "Current password is required.";
        }

        if (!formData.newPassword.match(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d]{6,}$/)) {
            tempErrors.newPassword =
                "Password must be at least 6 characters long and include an uppercase letter, a lowercase letter, and a number.";
        }

        if (formData.newPassword !== formData.confirmPassword) {
            tempErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage("");

        if (!validate()) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No token found, please log in.");

            const payload = {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            };

            console.log("🔄 Sending request to change password...", payload);

            await axios.put(
                `https://localhost:7194/api/AccountUser/ChangePassword/${id}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log("✅ Password changed successfully!");
            setSuccessMessage("✅ Password changed successfully!");

            setTimeout(() => navigate(`/Profile/${id}`), 2000);
        } catch (err) {
            console.error("❌ Error changing password:", err.response?.data);

            // ✅ طباعة الرسالة الفعلية من الـ API لمعرفة ما يتم إرساله
            console.log("Error message from API:", err.response?.data?.message);

            // ✅ تحديث الشرط لمطابقة الرسالة الفعلية
            if (err.response?.data?.message?.toLowerCase().includes("old password is incorrect")) {
                setErrors({ oldPassword: "Incorrect current password." });
            } else {
                setErrors({ oldPassword: "Incorrect current password." });
            }
        }
    };

    if (!isAuthorized) return <div className="change-password-unauthorized-background-unique" />;

    return (
        <div className="change-password-container">
            <Navbar />

            {errors.general && <div className="error">{errors.general}</div>}
            {successMessage && <div className="success">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="change-password-form">
                <h2>Change Password</h2>

                <input
                    type="password"
                    name="oldPassword"
                    placeholder="Current Password"
                    value={formData.oldPassword}
                    onChange={handleChange}
                    required
                />
                {errors.oldPassword && <span className="error-message">{errors.oldPassword}</span>}

                <input
                    type="password"
                    name="newPassword"
                    placeholder="New Password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                />
                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}

                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}

                <button type="submit">Change Password</button>
            </form>
        </div>
    );
};

export default ChangePassword;