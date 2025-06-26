import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import MapPicker from "../../components/Map/MapPicker";
import "./UpdateHome.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2"; // Added for SweetAlert2

const cities = [
    "General", "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia",
    "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", "Matruh",
    "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea",
    "Sharqia", "Sohag", "South Sinai", "Suez"
];

const getToken = () => {
    const tokenData = localStorage.getItem("token");
    if (!tokenData) return null;
    try {
        return tokenData.trim().startsWith("{")
            ? JSON.parse(tokenData).token
            : tokenData;
    } catch (err) {
        return tokenData;
    }
};

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

const UpdateHome = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [homeData, setHomeData] = useState({
        title: "",
        description: "",
        city: "",
        location: "",
        distance: "",
        gender: "",
        floor: "",
        homeType: "",
        latitude: "",
        longitude: "",
        photos: [] // ملفات الصور الجديدة (File objects)
    });
    // لتخزين الإحداثيات الأصلية من قاعدة البيانات
    const [originalCoordinates, setOriginalCoordinates] = useState({ latitude: 0, longitude: 0 });
    const [existingPhotos, setExistingPhotos] = useState([]); // روابط الصور الحالية
    const [errorMessages, setErrorMessages] = useState({});
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    // جلب بيانات المنزل الحالي من الباك إند
    useEffect(() => {
        const fetchHomeDetails = async () => {
            try {
                const token = getToken();
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
                        text: "You do not have permission to update a home.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else {
                    // تحقق من ملكية الـ Home
                    const checkOwnership = async () => {
                        try {
                            const response = await axios.get(
                                `https://localhost:7194/api/Room/CheckOwnership?homeId=${id}`,
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
                    await checkOwnership();
                }

                if (isAuthorized) {
                    const response = await axios.get(`https://localhost:7194/api/Home/GetHome/${id}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });
                    const data = response.data;
                    console.log("Fetched home data:", data);

                    // إصلاح عرض المدينة - البيانات بتجي كـ string مش رقم
                    const selectedCity = data.city || "";

                    setHomeData({
                        title: data.title || "",
                        description: data.description || "",
                        city: selectedCity, // استخدام اسم المدينة بدلاً من الرقم
                        location: data.locationDetails || "",
                        distance: data.distanceFromUniversity?.toString() || "",
                        gender: data.gender === 0 ? "Male" : "Female",
                        floor: data.floor?.toString() || "",
                        homeType: data.type === 0 ? "Shared" : "Private",
                        // إذا كانت القيم موجودة نستخدمها مباشرة
                        latitude: data.latitude !== null && data.latitude !== undefined ? data.latitude.toString() : "",
                        longitude: data.longitude !== null && data.longitude !== undefined ? data.longitude.toString() : "",
                        photos: [] // الصور الجديدة تبدأ فارغة
                    });
                    // تخزين الإحداثيات الأصلية لتكون مرجعاً في حال عدم تغيير الموقع
                    setOriginalCoordinates({
                        latitude: data.latitude !== null && data.latitude !== undefined ? data.latitude : 0,
                        longitude: data.longitude !== null && data.longitude !== undefined ? data.longitude : 0
                    });
                    let photoArray = [];
                    if (Array.isArray(data.photos)) {
                        photoArray = data.photos;
                    } else if (data.photos?.$values) {
                        photoArray = data.photos.$values;
                    }
                    setExistingPhotos(photoArray);
                }
            } catch (err) {
                console.error("Error fetching home details:", err);
                setErrorMessages({ general: ["Failed to load home details."] });
            } finally {
                setLoading(false);
            }
        };

        fetchHomeDetails();
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setHomeData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setHomeData((prev) => ({
            ...prev,
            photos: [...prev.photos, ...files]
        }));
    };

    const removeNewPhoto = (index) => {
        setHomeData((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    // وظيفة لاستلام إحداثيات الخريطة
    const handleLocationSelect = (lat, lng) => {
        setHomeData((prev) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
        setShowMap(false);
    };

    const API_URL = `https://localhost:7194/api/Home/Update/${id}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessages({});

        const formData = new FormData();
        formData.append("Title", homeData.title);
        formData.append("Description", homeData.description);
        formData.append("City", String(cities.indexOf(homeData.city)));
        formData.append("LocationDetails", homeData.location);
        formData.append("DistanceFromUniversity", parseFloat(homeData.distance || "0"));
        formData.append("Gender", homeData.gender === "Male" ? 0 : 1);
        formData.append("Floor", parseInt(homeData.floor || "0"));
        formData.append("Type", homeData.homeType === "Shared" ? 0 : 1);

        // إذا كانت homeData.latitude أو homeData.longitude غير صالحة نستخدم القيم الأصلية
        let latNum = parseFloat(homeData.latitude);
        let lngNum = parseFloat(homeData.longitude);
        if (isNaN(latNum) || latNum === 0) {
            latNum = originalCoordinates.latitude;
        }
        if (isNaN(lngNum) || lngNum === 0) {
            lngNum = originalCoordinates.longitude;
        }
        formData.append("Latitude", latNum);
        formData.append("Longitude", lngNum);

        // إضافة ملفات الصور الجديدة (إذا وُجدت)
        homeData.photos.forEach(photo => {
            formData.append("PhotoFiles", photo);
        });

        try {
            const token = getToken();
            if (!token) throw new Error("No token found. Please log in.");
            const response = await axios.put(API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            if (response.status === 200) {
                //alert("Home updated successfully!");
                toast.success("Home updated successfully!");
                const decoded = parseJwt(token);
                const ownerId =
                    decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                    decoded?.nameid;
                if (!ownerId) {
                    // alert("Owner ID not found!");
                    toast.error("Owner ID not found!");
                    return;
                }
                navigate(`/OwnerHomes/${ownerId}`);
            } else {
                // alert(response.data.message || "Failed to update home.");
                toast.error(response.data.message || "Failed to update home.");
            }
        } catch (err) {
            console.error("Error updating home:", err);
            if (err.response && err.response.data) {
                const errors = err.response.data.Errors || err.response.data.errors;
                if (errors) {
                    setErrorMessages(errors);
                } else if (err.response.data.Message) {
                    setErrorMessages({ general: [err.response.data.Message] });
                } else {
                    setErrorMessages({ general: ["An error occurred while updating the home."] });
                }
            } else {
                setErrorMessages({ general: ["An error occurred while updating the home."] });
            }
        }
    };

    // زر الرجوع إلى Homes باستخدام ownerId من التوكن
    const handleBackToHomes = () => {
        const token = getToken();
        if (!token) {
            // alert("No valid token found, please log in.");
            toast.error("No valid token found, please log in.");
            return;
        }
        const decoded = parseJwt(token);
        const ownerId =
            decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
            decoded?.nameid;
        if (!ownerId) {
            // alert("Owner ID not found!");
            toast.error("Owner ID not found!");
            return;
        }
        navigate(`/OwnerHomes/${ownerId}`);
    };

    if (loading) return <p className="loading">Loading home details...</p>;

    return (
        <div className="update-home-container">
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
                <div className="update-home-box">
                    <h2>Update Home</h2>
                    {errorMessages.general && (
                        <div className="error-message general-error">
                            {errorMessages.general.join(" ")}
                        </div>
                    )}
                    <form className="form-grid" onSubmit={handleSubmit}>
                        <div className="form-field">
                            <label>Title</label>
                            <input
                                type="text"
                                name="title"
                                className="half-width"
                                placeholder="Title"
                                value={homeData.title}
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.Title && errorMessages.Title.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            <label>Location Details</label>
                            <input
                                type="text"
                                name="location"
                                className="half-width"
                                placeholder="Location Details"
                                value={homeData.location}
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.LocationDetails && errorMessages.LocationDetails.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            <label>Distance from University (km)</label>
                            <input
                                type="text"
                                name="distance"
                                className="half-width"
                                placeholder="Distance from University (km)"
                                value={homeData.distance}
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.DistanceFromUniversity && errorMessages.DistanceFromUniversity.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            <label>Floor Number</label>
                            <input
                                type="number"
                                name="floor"
                                className="half-width"
                                placeholder="Floor Number"
                                value={homeData.floor}
                                onChange={handleChange}
                                required
                            />
                            {errorMessages.Floor && errorMessages.Floor.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field">
                            <label>Select City</label>
                            <select
                                name="city"
                                className="homeType"
                                value={homeData.city}
                                onChange={handleChange}
                                required
                            >
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
                        <br />

                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="Description"
                            className="full-width"
                            value={homeData.description}
                            onChange={handleChange}
                            required
                        ></textarea>
                        {errorMessages.Description && errorMessages.Description.map((msg, idx) => (
                            <span key={idx} className="error-message">{msg}</span>
                        ))}
                        <div className="form-field inline-group">
                            <label>Gender:</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Male"
                                        checked={homeData.gender === "Male"}
                                        onChange={handleChange}
                                        required
                                    /> Male
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Female"
                                        checked={homeData.gender === "Female"}
                                        onChange={handleChange}
                                        required
                                    /> Female
                                </label>
                            </div>
                            {errorMessages.Gender && errorMessages.Gender.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>
                        <div className="form-field inline-group">
                            <label>Home Type:</label>
                            <select
                                name="homeType"
                                className="homeType"
                                value={homeData.homeType}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="Shared">Shared</option>
                                <option value="Private">Private</option>
                            </select>
                            {errorMessages.Type && errorMessages.Type.map((msg, idx) => (
                                <span key={idx} className="error-message">{msg}</span>
                            ))}
                        </div>

                        <div className="form-field file-upload">
                            <label>Add New Photos (Optional):</label>
                            <div className="photo-preview-container">
                                {homeData.photos.map((photo, index) => (
                                    <div key={index} className="photo-preview">
                                        <img src={URL.createObjectURL(photo)} alt="New Home" />
                                        <button type="button" className="remove-photo" onClick={() => removeNewPhoto(index)}>
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
                        <button type="button" className="button-33" onClick={() => setShowMap(true)}>
                            Pick Location
                        </button>
                        {showMap && (
                            <div className="map-modal">
                                <div className="map-modal-content">
                                    <h3>Pick Location</h3>
                                    <div className="map-picker-container">
                                        <MapPicker onLocationSelect={handleLocationSelect} />
                                    </div>
                                    <button type="button" className="button-33 close-map-btn" onClick={() => setShowMap(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                        <p className="full-width">
                            Selected Location: {homeData.latitude && homeData.longitude
                                ? `${homeData.latitude}, ${homeData.longitude}`
                                : `${originalCoordinates.latitude}, ${originalCoordinates.longitude}`}
                        </p>
                        <button type="submit" className="button-33">
                            Update Home
                        </button>
                        <button type="button" className="button-33" onClick={handleBackToHomes}>
                            Back to Homes
                        </button>
                    </form>
                </div>
            ) : (
                <div className="update-home-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};
export default UpdateHome;