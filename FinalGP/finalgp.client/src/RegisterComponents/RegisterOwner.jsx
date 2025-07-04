import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./RegisterOwner.css";
import logo from "../assets/logo3.png";


const OwnerRegister = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        address: "",
        gender: false,
        ssn: "",
    });
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: name === "gender" ? value === "Female" : value,
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
                if (lower.includes("ssn")) {
                    newErrors.SSN = errMessage;
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
        setErrors({});

        const data = {
            Full_Name: formData.fullName,
            Email: formData.email,
            Phone: formData.phone,
            Password: formData.password,
            ConfirmPassword: formData.confirmPassword,
            Address: formData.address,
            Gender: formData.gender ? 1 : 0,
            SSN: formData.ssn,
        };

        try {
            const response = await axios.post("https://localhost:7194/api/AccountOwner/Register", data, {
                headers: { "Content-Type": "application/json" },
            });
            console.log("Server response:", response.data);

            Swal.fire({
                icon: "success",
                title: "Registration Successful!",
                text: "Redirecting to login page...",
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                navigate("/Login");
            });
        } catch (err) {
            console.log("Error response from server:", err.response && err.response.data);
            let newErrors = {};
            if (err.response && err.response.data) {
                const data = err.response.data;
                if (data.errors) {
                    newErrors = Array.isArray(data.errors)
                        ? parseErrors(data)
                        : Object.entries(data.errors).reduce((acc, [key, messages]) => {
                            acc[key] = Array.isArray(messages) ? messages.join(", ") : messages;
                            return acc;
                        }, {});
                } else if (data.message) {
                    newErrors.general = data.message;
                } else {
                    newErrors.general = "An error occurred. Please try again later.";
                }
            } else {
                newErrors.general = "An error occurred. Please try again later.";
            }
            setErrors(newErrors);
        }
    };

    return (
        <div className="register-container-owner">
            <div className="register-form-owner">
                <img src={logo} alt="Logo" className="logo" />
                <h2>Register Owner</h2>
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
                    <input
                        type="text"
                        name="address"
                        placeholder="Address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                    />
                    {errors.Address && <p className="error">{errors.Address}</p>}
                    <input
                        type="text"
                        name="ssn"
                        placeholder="SSN"
                        value={formData.ssn}
                        onChange={handleChange}
                        required
                    />
                    {errors.SSN && <p className="error">{errors.SSN}</p>}
                    <div className="gender-box">
                        <label className="genderLabel">Gender</label>
                        <div className="gender-options">
                            <input
                                type="radio"
                                value="Male"
                                name="gender"
                                onChange={handleChange}
                                required
                                checked={!formData.gender}
                            />
                            <label>Male</label>
                            <input
                                type="radio"
                                value="Female"
                                name="gender"
                                onChange={handleChange}
                                required
                                checked={formData.gender}
                            />
                            <label>Female</label>
                        </div>
                        {errors.Gender && <p className="error">{errors.Gender}</p>}
                    </div>
                    <button type="submit" className="button-33">REGISTER</button>
                    <p>
                        Already Registered? <Link to="/Login">Login here</Link>
                    </p>
                </form>
            </div>
            <div className="register-image-owner"></div>
        </div>
    );
};

export default OwnerRegister;
