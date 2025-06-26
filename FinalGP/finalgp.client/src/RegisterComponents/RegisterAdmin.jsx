import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./RegisterAdmin.css";
import Navbar from "../components/Navbar";
import logo from "../assets/logo3.png";

const RegisterAdmin = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); 
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const parseErrors = (data) => {
        let newErrors = {};
        if (Array.isArray(data.errors)) {
            data.errors.forEach((errMessage) => {
                const lower = errMessage.toLowerCase();
                if (lower.includes("username") || lower.includes("full name")) {
                    newErrors.Full_Name = errMessage;
                }
                if (lower.includes("email")) {
                    newErrors.Email = errMessage;
                }
                if (lower.includes("phone")) {
                    newErrors.Phone = errMessage;
                }
                if (lower.includes("password") && !lower.includes("confirm")) {
                    newErrors.Password = errMessage;
                }
                if (lower.includes("confirm")) {
                    newErrors.ConfirmPassword = errMessage;
                }
            });
        } else {
            newErrors = Object.entries(data.errors).reduce((acc, [key, messages]) => {
                acc[key] = Array.isArray(messages) ? messages.join(", ") : messages;
                return acc;
            }, {});
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthorized) return; 

        setErrors({});

        const data = {
            Full_Name: formData.fullName,
            Email: formData.email,
            Phone: formData.phone,
            Password: formData.password,
            ConfirmPassword: formData.confirmPassword,
        };

        try {
            const response = await fetch("https://localhost:7194/api/AccountAdmin/Register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}` // Add authorization header
                },
                body: JSON.stringify(data),
            });
            const jsonData = await response.json().catch(() => null);
            console.log("Server response:", jsonData);

            if (!response.ok) {
                let newErrors = {};
                if (jsonData && jsonData.errors) {
                    newErrors = parseErrors(jsonData);
                    console.log("Validation errors:", newErrors);
                    setErrors(newErrors);
                } else if (jsonData && jsonData.message) {
                    console.log("General error:", jsonData.message);
                    setErrors({ general: jsonData.message });
                } else {
                    setErrors({ general: "An error occurred. Please try again later." });
                }
                return;
            }

            Swal.fire({
                icon: "success",
                title: "Added Successful!",
                text: "Admin Added successfully!",
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                navigate("/HeroSection");
            });
        } catch (error) {
            console.error("Error during registration:", error);
            setErrors({ general: error.message || "An error occurred. Please try again later." });
        }
    };

    // Check authorization on component mount
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
                text: "You do not have permission to add an admin.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        }
    }, [navigate]);

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

    return (
        <div className="register-container-admin">
            <Navbar />
            {isAuthorized ? (
                <div className="register-form-admin">
                    <img src={logo} alt="Logo" className="logo" />
                    <h2>Add Admin</h2>
                    <form onSubmit={handleSubmit}>
                        {errors.general && <p className="error">{errors.general}</p>}
                        <input
                            type="text"
                            name="fullName"
                            placeholder="Full Name"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                        />
                        {errors.Full_Name && <p className="error">{errors.Full_Name}</p>}
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {errors.Email && <p className="error">{errors.Email}</p>}
                        <input
                            type="text"
                            name="phone"
                            placeholder="Phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                        {errors.Phone && <p className="error">{errors.Phone}</p>}
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {errors.Password && <p className="error">{errors.Password}</p>}
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        {errors.ConfirmPassword && <p className="error">{errors.ConfirmPassword}</p>}
                        <button type="submit" className="register-button">Add Admin</button>
                        {/*<p>*/}
                        {/*    Already Registered? <Link to="/AdminLogin">Login</Link>*/}
                        {/*</p>*/}
                    </form>
                </div>
            ) : (
                <div className="unauthorized-background">
                    {/* Empty div for white background */}
                </div>
            )}
            <div className="register-image-admin"></div>
        </div>
    );
};

export default RegisterAdmin;