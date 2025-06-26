import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import "./AddRoom.css";
import Navbar from "../../components/Navbar";
import Swal from "sweetalert2";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

const AddRoom = () => {
    const navigate = useNavigate();
    const { homeId } = useParams();
    const location = useLocation();

    const [currentHomeId, setCurrentHomeId] = useState(
        homeId || location.state?.homeId || localStorage.getItem("currentHomeId")
    );

    const [roomData, setRoomData] = useState({
        roomCode: "",
        beds: "",
        price: "",
        isCompleted: false,
        photos: [],
    });

    const [errors, setErrors] = useState({});
    const [isAuthorized, setIsAuthorized] = useState(true); // New state to control authorization

    useEffect(() => {
        if (!currentHomeId) {
            const storedHomeId = localStorage.getItem("currentHomeId");
            if (storedHomeId) {
                setCurrentHomeId(storedHomeId);
            }
        }

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
                text: "You do not have permission to add a room.",
                confirmButtonText: "OK",
                confirmButtonColor: "#3085d6",
            });
        } else {
            // تحقق من ملكية الـ Home
            const checkOwnership = async () => {
                try {
                    const response = await axios.get(
                        `https://localhost:7194/api/Room/CheckOwnership?homeId=${currentHomeId}`,
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
            checkOwnership();
        }
    }, [currentHomeId, navigate]);

    console.log("Home ID:", currentHomeId);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setRoomData({ ...roomData, [name]: value });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setRoomData((prevData) => ({
            ...prevData,
            photos: [...prevData.photos, ...files],
        }));
    };

    const removePhoto = (index) => {
        setRoomData((prevData) => ({
            ...prevData,
            photos: prevData.photos.filter((_, i) => i !== index),
        }));
    };

    const isRoomDataFilled = () => {
        return (
            roomData.roomCode.trim() !== "" ||
            roomData.beds.trim() !== "" ||
            roomData.price.trim() !== ""
        );
    };

    // This function adds a room using the current roomData.
    // It does not navigate; it only resets the form upon success.
    const handleAddRoom = async () => {
        try {
            if (!currentHomeId) {
                // Swal.fire("Error", "Home ID is missing. Please try again.", "error");
                toast.error("Home ID is missing. Please try again.");
                return;
            }

            const formData = new FormData();
            formData.append("HomeId", currentHomeId);
            // The backend expects the room number field as "Number"
            formData.append("Number", roomData.roomCode);
            formData.append("NumOfBeds", parseInt(roomData.beds, 10));
            formData.append("Price", parseFloat(roomData.price));
            formData.append("IsCompleted", roomData.isCompleted);

            if (roomData.photos.length === 0) {
                // Swal.fire("Error", "Please upload at least one photo.", "error");
                toast.error("Please upload at least one photo.");
                return;
            }

            // Assuming only one photo is required for room creation
            formData.append("RoomPhoto", roomData.photos[0]);

            // Debug: log formData entries
            for (let pair of formData.entries()) {
                console.log(pair[0], pair[1]);
            }

            let token = localStorage.getItem("token");
            if (!token) {
                //Swal.fire("Error", "No token found, please log in.", "error");
                toast.error("No token found, please log in.");
                return;
            }
            if (token.startsWith("{") || token.startsWith("[")) {
                try {
                    const parsedToken = JSON.parse(token);
                    if (parsedToken.token) {
                        token = parsedToken.token;
                    }
                } catch (error) {
                    console.error("Token parsing error:", error);
                    // Swal.fire("Error", "Invalid token format. Please log in again.", "error");
                    toast.error("Invalid token format. Please log in again.");
                    return;
                }
            }

            console.log("Token being sent:", token);

            await axios.post(
                "https://localhost:7194/api/Room/Add",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            //Swal.fire("Success", "Room added successfully!", "success");
            toast.success("Room added successfully!");
            // Reset the form and errors after adding a room
            setRoomData({
                roomCode: "",
                beds: "",
                price: "",
                isCompleted: false,
                photos: [],
            });
            setErrors({});
        } catch (error) {
            console.error("Error adding room:", error);
            if (error.response) {
                console.log("Full error response:", error.response);
                setErrors(error.response.data.errors || { general: [error.response.data.message] });
                //Swal.fire("Error", error.response.data.message || "An error occurred while adding the room.", "error");
                toast.error(error.response.data.message || "An error occurred while adding the room.");
            } else {
                //Swal.fire("Error", "An unexpected error occurred. Please try again.", "error");
                toast.error("An unexpected error occurred. Please try again.");
            }
        }
    };

    const handleSaveAllRooms = async () => {
        try {
            if (isRoomDataFilled()) {
                await handleAddRoom();
            }
            // Swal.fire("Success", "All rooms added!", "success");
            toast.success("All rooms added successfully!");
            navigate(`/HomeFacility/${currentHomeId}`);
        } catch (error) {
            toast.error("Error in saving all rooms. Please try again.");
            console.error("Error in saving all rooms:", error);
        }
    };

    return (
        <div className="add-room-container">
            <Navbar />
            <ToastContainer
                position="top-center"
                autoClose={false}
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
                <div className="add-room-box">
                    <h2>Add Room</h2>
                    {/* Display general errors at the top */}
                    {errors.general &&
                        errors.general.map((err, index) => (
                            <p key={index} className="error-text">{err}</p>
                        ))}
                    <div className="form-grid">
                        <div className="form-field">
                            <input
                                type="text"
                                name="roomCode"
                                placeholder="Room Code"
                                onChange={handleChange}
                                value={roomData.roomCode}
                                className="half-width"
                            />
                            {errors.Number &&
                                errors.Number.map((msg, idx) => (
                                    <span key={idx} className="error-text"> {msg}</span>
                                ))}
                        </div>
                        <div className="form-field">
                            <input
                                type="number"
                                name="beds"
                                placeholder="Number of Beds"
                                onChange={handleChange}
                                value={roomData.beds}
                                className="half-width"
                            />
                            {errors.NumOfBeds &&
                                errors.NumOfBeds.map((msg, idx) => (
                                    <span key={idx} className="error-text"> {msg}</span>
                                ))}
                        </div>
                        <div className="form-field">
                            <input
                                type="text"
                                name="price"
                                placeholder="Price"
                                onChange={handleChange}
                                value={roomData.price}
                                className="half-width"
                            />
                            {errors.Price &&
                                errors.Price.map((msg, idx) => (
                                    <span key={idx} className="error-text"> {msg}</span>
                                ))}
                        </div>
                        <div className="form-checkbox">
                            <label htmlFor="isCompleted">Is Completed</label>
                            <input
                                type="checkbox"
                                id="isCompleted"
                                checked={roomData.isCompleted}
                                onChange={(e) =>
                                    setRoomData({ ...roomData, isCompleted: e.target.checked })
                                }
                            />
                        </div>
                    </div>
                    <div className="file-upload">
                        <label className="file-label">Add Photos for Room:</label>
                        <div className="custom-file-input">
                            <input type="file" multiple onChange={handleFileChange} id="fileInput" />
                            <label htmlFor="fileInput">
                                {roomData.photos.length > 0
                                    ? `${roomData.photos.length} file(s) selected`
                                    : "Choose Files"}
                            </label>
                        </div>
                        {roomData.photos.length > 0 && (
                            <div className="file-list">
                                {roomData.photos.map((file, index) => (
                                    <p key={index}>{file.name}</p>
                                ))}
                            </div>
                        )}
                        {errors.PhotoFiles &&
                            errors.PhotoFiles.map((msg, idx) => (
                                <span key={idx} className="error-text">⚠️ {msg}</span>
                            ))}
                    </div>
                    <div className="button-group">
                        <button className="button-nr-n" onClick={handleAddRoom}>
                            Add Room
                        </button>
                        <button className="button-nr-n" onClick={handleSaveAllRooms}>
                            Next
                        </button>
                    </div>
                </div>
            ) : (
                <div className="add-room-owner-unauthorized-background-unique">
                    {/* Empty div for white background */}
                </div>
            )}
        </div>
    );
};
export default AddRoom;
