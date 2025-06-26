import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./NewHome.css";
import Navbar from "../../components/Navbar";
import MapPicker from "../../components/Map/MapPicker"; // Ensure this component exists and works correctly
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

// List of cities for the dropdown
const cities = [
    "General", "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia",
    "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", "Matruh",
    "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea",
    "Sharqia", "Sohag", "South Sinai", "Suez"
];

const AddHome = () => {
    const navigate = useNavigate();
    const [showMap, setShowMap] = useState(false);
    const [homeData, setHomeData] = useState({
        title: "",
        description: "",
        city: "",
        location: "",
        distance: "",
        latitude: "",
        longitude: "",
        gender: "",
        floor: "",
        homeType: "",
        contractPhoto: null,
        photos: [],
    });
    // errorMessages is an object where keys are field names and values are arrays of error messages
    const [errorMessages, setErrorMessages] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    // Update text field values
    const handleChange = (e) => {
        const { name, value } = e.target;
        setHomeData((prev) => ({ ...prev, [name]: value }));
    };

    // Receive coordinates from the MapPicker component
    const handleLocationSelect = (lat, lng) => {
        setHomeData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        setShowMap(false);
    };

    // Handle file inputs for contract photo and property photos
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (name === "contractPhoto") {
            setHomeData((prev) => ({ ...prev, contractPhoto: files[0] }));
        } else if (name === "photos") {
            setHomeData((prev) => ({
                ...prev,
                photos: [...prev.photos, ...Array.from(files)]
            }));
        }
    };

    // Remove photo from list
    const removePhoto = (index) => {
        setHomeData((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    // Clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            homeData.photos.forEach((photo) => URL.revokeObjectURL(photo));
        };
    }, [homeData.photos]);

    const API_URL = "https://localhost:7194/api/Home/Add";

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessages({});

        // Validate that contract photo and at least one property photo are provided
        if (!homeData.contractPhoto || homeData.photos.length === 0) {
            setErrorMessages({ ContractFile: ["Contract photo and at least one property photo are required."] });
            toast.error("⚠Please upload a contract photo and at least one property photo.");
            return;
        }

        const formData = new FormData();
        formData.append("Title", homeData.title);
        formData.append("Description", homeData.description);
        // Send the city as its index in the cities array
        formData.append("City", cities.indexOf(homeData.city));
        formData.append("LocationDetails", homeData.location);
        formData.append("DistanceFromUniversity", parseFloat(homeData.distance));
        formData.append("Latitude", homeData.latitude);
        formData.append("Longitude", homeData.longitude);
        formData.append("Gender", homeData.gender === "Male" ? 0 : 1);
        formData.append("Floor", parseInt(homeData.floor));
        formData.append("Type", homeData.homeType === "Shared" ? 0 : 1);
        formData.append("ContractFile", homeData.contractPhoto);

        homeData.photos.forEach((photo) => {
            formData.append("PhotoFiles", photo);
        });

        // Extract token from localStorage (ensure it's stored as a plain string)
        const token = localStorage.getItem("token");
        console.log("Extracted Token:", token);

        if (!token) {
            setErrorMessages({ general: ["No token found. Please log in."] });
            toast.error("⚠No token found. Please log in.");
            return;
        }

        try {
            const response = await axios.post(API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            if (response.status === 200) {
                const newHomeId = response.data.homeId;
                console.log("Showing success toast");
                toast.success("🏠 New home added successfully!");
                setTimeout(() => {
                    navigate(`/AddRoom/${newHomeId}`);
                }, 2000); // Delay navigation by 2 seconds
            }
            else {
                toast.error("⚠Failed to add home!");

                //alert(response.data.message);
            }
        } catch (error) {
            console.error("Error adding home:", error);
            if (error.response && error.response.data && error.response.data.errors) {
                setErrorMessages(error.response.data.errors);
                toast.error("⚠Failed to add home!");
            } else {
                setErrorMessages({ general: ["Something went wrong!"] });
                toast.error("⚠Something went wrong!");
            }
        }
    };

    useEffect(() => {
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
                text: "You do not have permission to add a home.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        }
    }, [navigate]);

    return (
        <div className="add-home-container">
            <Navbar />
            <ToastContainer
                position="top-center"
                autoClose={5000}
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
                <div className="add-home-box">
                    <h2>Add Home</h2>
                    {errorMessages.general && errorMessages.general.map((msg, idx) => (
                        <p key={idx} className="error-message">{msg}</p>
                    ))}
                    <form className="form-grid" onSubmit={handleSubmit}>
                        <div className="form-field">
                            {/*<label>Title</label>*/}
                            <input
                                type="text"
                                name="title"
                                className="half-width"
                                placeholder="Title"
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.Title && errorMessages.Title.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            {/*<label>Location Details</label>*/}
                            <input
                                type="text"
                                name="location"
                                className="half-width"
                                placeholder="Location Details"
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.LocationDetails && errorMessages.LocationDetails.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            {/*<label>Distance from University (km)</label>*/}
                            <input
                                type="text"
                                name="distance"
                                className="half-width"
                                placeholder="Distance from University (km)"
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.DistanceFromUniversity && errorMessages.DistanceFromUniversity.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            {/*<label>Floor Number</label>*/}
                            <input
                                type="number"
                                name="floor"
                                className="half-width"
                                placeholder="Floor Number"
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.Floor && errorMessages.Floor.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            {/*<label>Select City</label>*/}
                            <select name="city" className="homeType" onChange={handleChange} required>
                                <option value="">Select City</option>
                                {cities.map((city, index) => (
                                    <option key={index} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                            {errorMessages.City && errorMessages.City.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        {/*<div className="form-field">*/}
                        <textarea
                            name="description"
                            placeholder="Description"
                            className="full-width"
                            onChange={handleChange}
                            required
                        />
                        {errorMessages.Description && errorMessages.Description.map((msg, idx) => (
                            <span key={idx} className="error-message">{msg}</span>
                        ))}
                        {/*</div>*/}
                        <div className="form-field inline-group">
                            <label>Gender:</label>
                            <div className="gender-options">
                                <label>
                                    <input type="radio" name="gender" value="Male" onChange={handleChange} required /> Male
                                </label>
                                <label>
                                    <input type="radio" name="gender" value="Female" onChange={handleChange} required /> Female
                                </label>
                            </div>
                            {errorMessages.Gender && errorMessages.Gender.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field inline-group">
                            <label></label>
                            <select name="homeType" className="homeType" onChange={handleChange} required>
                                <option value="">Select Type</option>
                                <option value="Shared">Shared</option>
                                <option value="Private">Private</option>
                            </select>
                            {errorMessages.Type && errorMessages.Type.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field file-upload">
                            <label>Upload Contract:</label>
                            <input type="file" name="contractPhoto" onChange={handleFileChange} required />
                            {errorMessages.ContractPhoto && errorMessages.ContractPhoto.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field file-upload">
                            <label>Add Photos for Home:</label>
                            <div className="photo-preview-container">
                                {homeData.photos.map((photo, index) => (
                                    <div key={index} className="photo-preview">
                                        <img src={URL.createObjectURL(photo)} alt="Home" />
                                        <button type="button" className="remove-photo" onClick={() => removePhoto(index)}>
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <label className="add-photo-box">
                                    +
                                    <input type="file" name="photos" multiple onChange={handleFileChange} style={{ display: "none" }} />
                                </label>
                            </div>
                            {errorMessages.PhotoFiles && errorMessages.PhotoFiles.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <button type="button" className="button-nh" onClick={() => setShowMap(true)}>
                            Pick Location
                        </button>
                        {showMap && (
                            <div className="map-modal">
                                <div className="map-modal-content">
                                    <h3>Pick Location</h3>
                                    <div className="map-picker-container">
                                        <MapPicker onLocationSelect={handleLocationSelect} />
                                    </div>
                                    <button type="button" className="button-nh close-map-btn" onClick={() => setShowMap(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                        {homeData.latitude && homeData.longitude && (
                            <p className="full-width">
                                Selected Location: {homeData.latitude}, {homeData.longitude}
                            </p>
                        )}
                        <button type="submit" className="button-nh">
                            Save Home
                        </button>
                    </form>
                </div>
            ) : (
                <div className="add-home-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default AddHome;