import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./UpdateRoom.css";
import Navbar from "../../components/Navbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2"; // Added for SweetAlert2

// Helper function to parse JWT token
function parseJwt(token) {
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
        return null;
    }
}

const UpdateRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomData, setRoomData] = useState({
        roomCode: "",
        beds: "",
        price: "",
        isCompleted: false,
        photo: null,
        homeId: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    const getToken = () => {
        const tokenData = localStorage.getItem("token");
        if (!tokenData) return null;
        return tokenData.trim().startsWith("{")
            ? JSON.parse(tokenData).token
            : tokenData;
    };

    useEffect(() => {
        const fetchRoomDetails = async () => {
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
                        text: "You do not have permission to update a room.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#3085d6",
                    });
                } else {
                    // تحقق من ملكية الـ Room
                    const checkOwnership = async () => {
                        try {
                            const response = await axios.get(
                                `https://localhost:7194/api/Room/CheckRoomOwnership/${roomId}`,
                                {
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );
                            // لو الـ API رجع 200، فالـ Owner يملك الـ Room
                        } catch (error) {
                            if (error.response && error.response.status === 403) {
                                setIsAuthorized(false);
                                Swal.fire({
                                    icon: "warning",
                                    title: "Not Authorized",
                                    text: "You do not own this room.",
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
                    const response = await axios.get(
                        `https://localhost:7194/api/Room/GetRoom/${roomId}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const data = response.data;
                    setRoomData({
                        roomCode: data.number || "",
                        beds: data.numOfBeds ? data.numOfBeds.toString() : "",
                        price: data.price ? data.price.toString() : "",
                        isCompleted: data.isCompleted,
                        photo: data.photo || null,
                        homeId: data.homeId ? data.homeId.toString() : "",
                    });
                }
            } catch (err) {
                console.error("Error fetching room details:", err);
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Failed to load room details."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchRoomDetails();
    }, [roomId, navigate, isAuthorized]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRoomData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setRoomData((prev) => ({
                ...prev,
                photo: file,
            }));
        }
    };

    const handleBackToRooms = () => {
        if (!roomData.homeId) {
            toast.error("Home ID not found!");
            return;
        }
        navigate(`/AllRooms/${roomData.homeId}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setFormErrors({});

        const formData = new FormData();
        formData.append("Number", roomData.roomCode);
        formData.append("NumOfBeds", roomData.beds);
        formData.append("Price", roomData.price);
        formData.append("IsCompleted", roomData.isCompleted);
        formData.append("HomeId", roomData.homeId);
        if (roomData.photo && roomData.photo instanceof File) {
            formData.append("RoomPhoto", roomData.photo);
        }

        try {
            const token = getToken();
            if (!token) throw new Error("No token found, please log in.");

            const response = await axios.put(
                `https://localhost:7194/api/Room/Update/${roomId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Room updated successfully!");
                navigate(`/AllRooms/${roomData.homeId}`);
            } else {
                toast.error(response.data.message || "Failed to update room.");
            }
        } catch (err) {
            console.error("Error updating room:", err);
            if (err.response && err.response.data && err.response.data.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setError(
                    err.response?.data?.message ||
                    "An error occurred while updating the room."
                );
            }
        }
    };

    if (loading) return <p className="loading">Loading room details...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="update-room-container">
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
                <div className="update-room-box">
                    <h2>Update Room</h2>
                    {roomData.photo && typeof roomData.photo === "string" && (
                        <div className="current-photo">
                            <img
                                src={roomData.photo}
                                alt="Current Room"
                                className="current-room-photo"
                            />
                        </div>
                    )}
                    <form className="form-grid" onSubmit={handleSubmit}>
                        <div className="form-group half-width">
                            <label htmlFor="roomCode">Room Code</label>
                            <input
                                type="text"
                                id="roomCode"
                                name="roomCode"
                                placeholder="Room Code"
                                value={roomData.roomCode}
                                onChange={handleChange}
                                required
                            />
                            {formErrors.Number && (
                                <span className="error-message">{formErrors.Number}</span>
                            )}
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="beds">Number of Beds</label>
                            <input
                                type="number"
                                id="beds"
                                name="beds"
                                placeholder="Number of Beds"
                                value={roomData.beds}
                                onChange={handleChange}
                                required
                            />
                            {formErrors.NumOfBeds && (
                                <span className="error-message">{formErrors.NumOfBeds}</span>
                            )}
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="price">Price</label>
                            <input
                                type="text"
                                id="price"
                                name="price"
                                placeholder="Price"
                                value={roomData.price}
                                onChange={handleChange}
                                required
                            />
                            {formErrors.Price && (
                                <span className="error-message">{formErrors.Price}</span>
                            )}
                        </div>
                        <div className="form-group form-checkbox half-width">
                            <label htmlFor="isCompleted">Is Completed</label>
                            <input
                                type="checkbox"
                                id="isCompleted"
                                name="isCompleted"
                                checked={roomData.isCompleted}
                                onChange={handleChange}
                            />
                            {formErrors.IsCompleted && (
                                <span className="error-message">{formErrors.IsCompleted}</span>
                            )}
                        </div>
                        <div className="form-group file-upload full-width">
                            <label htmlFor="roomPhoto">
                                Room Photo (Leave empty to keep current photo)
                            </label>
                            <input
                                type="file"
                                id="roomPhoto"
                                onChange={handleFileChange}
                                accept="image/*"
                            />
                            {formErrors.RoomPhoto && (
                                <span className="error-message">{formErrors.RoomPhoto}</span>
                            )}
                        </div>
                        <div className="form-group full-width">
                            <button type="submit" className="submit-btn">
                                Update Room
                            </button>
                            <button
                                type="button"
                                className="submit-btn"
                                onClick={handleBackToRooms}
                            >
                                Back to Rooms
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="update-room-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};

export default UpdateRoom;