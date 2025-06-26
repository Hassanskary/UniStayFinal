import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { syncSavesWithServer } from "../UserPages/Saves/syncSaves";
import "./Navbar.css";
import logo from "../assets/logo4.png";
import chatIcon from "../assets/chat.png";
import saveIcon from "../assets/save.png";
import bellIcon from "../assets/bell.png";
import NotificationModal from "../components/Notification/NotificationModal";
import JsNotification from "../components/Notification/JsNotification";
import * as signalR from "@microsoft/signalr";
import axios from "axios";

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
        console.error("Failed to parse JWT:", e);
        return null;
    }
}

const Navbar = () => {
    const [role, setRole] = useState("");
    const [username, setUsername] = useState("");
    const [profileLink, setProfileLink] = useState("/Profile");
    const [homesLink, setHomesLink] = useState("/OwnerHomes");
    const [chatCounter, setChatCounter] = useState(0);
    const [notificationCounter, setNotificationCounter] = useState(0);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [isSignalRConnected, setIsSignalRConnected] = useState(false);

    const navigate = useNavigate();

    const fetchUnreadCount = async (token) => {
        try {
            const response = await axios.get(`https://localhost:7194/api/Notification/unread?page=1&pageSize=10`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            console.log("Initial Unread Notification Count:", response.data);
            setNotificationCounter(response.data.totalCount || 0);
        } catch (err) {
            console.error("Error fetching unread notification count:", err);
        }
    };

    const fetchChatCounter = async (token) => {
        try {
            const response = await fetch(`https://localhost:7194/api/Chat/unread-chats-count`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Unread chats count from API:", data);
            setChatCounter(Math.max(0, Number(data) || 0));
        } catch (err) {
            console.error("Error fetching chat counter:", err);
            setChatCounter(0);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        let connection;
        let notificationConnection;

        if (token) {
            try {
                let parsedToken = token;
                if (token.trim().startsWith("{")) {
                    parsedToken = JSON.parse(token).token || token;
                }
                const decoded = parseJwt(parsedToken);
                console.log("Navbar: Parsed Token:", decoded);

                if (decoded && decoded.exp) {
                    const isExpired = decoded.exp * 1000 < Date.now();
                    if (isExpired) {
                        console.log("Navbar: Token is expired. Clearing token and resetting Navbar state.");
                        localStorage.removeItem("token");
                        localStorage.removeItem("role");
                        localStorage.removeItem("username");
                        localStorage.removeItem("userId");
                        setRole("");
                        setUsername("");
                        setChatCounter(0);
                        setNotificationCounter(0);
                        return;
                    }
                }

                const userRole =
                    decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
                    decoded?.role ||
                    "";
                console.log("Navbar: Retrieved Role:", userRole);
                setRole(userRole);

                const name =
                    decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
                    decoded?.name ||
                    "";
                setUsername(name);

                const userId =
                    decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                    decoded?.nameid ||
                    decoded?.sub;
                if (userId) {
                    setProfileLink(`/Profile/${userId}`);
                    if (userRole && userRole.toLowerCase() === "owner") {
                        setHomesLink(`/OwnerHomes/${userId}`);
                    }
                    console.log("Navbar: Set userId:", userId);

                    fetchUnreadCount(parsedToken);

                    connection = new signalR.HubConnectionBuilder()
                        .withUrl("https://localhost:7194/hubs/chat", {
                            accessTokenFactory: () => parsedToken,
                            skipNegotiation: true,
                            transport: signalR.HttpTransportType.WebSockets,
                        })
                        .withAutomaticReconnect()
                        .configureLogging(signalR.LogLevel.Information)
                        .build();

                    connection
                        .start()
                        .then(() => {
                            console.log("SignalR Connected in Navbar");
                            setIsSignalRConnected(true);
                            fetchChatCounter(parsedToken);

                            connection.on("UpdateChatCounter", (count) => {
                                console.log("Received chat counter update:", count);
                                setChatCounter(Math.max(0, Number(count) || 0));
                            });

                            connection.on("ReceiveMessage", (message) => {
                                console.log("New message received in Navbar:", message);
                                fetchChatCounter(parsedToken);
                            });

                            connection.on("MessageStatusUpdated", (messageId, status) => {
                                console.log(`MessageStatusUpdated in Navbar: messageId=${messageId}, status=${status}`);
                                fetchChatCounter(parsedToken);
                            });
                        })
                        .catch((err) => {
                            console.error("SignalR Connection Error:", err);
                            setIsSignalRConnected(false);
                        });

                    if (userRole === "Admin" || userRole === "Owner" || userRole === "User") {
                        console.log("Initializing SignalR for Notifications for", userRole);
                        notificationConnection = new signalR.HubConnectionBuilder()
                            .withUrl("https://localhost:7194/notificationHub", {
                                accessTokenFactory: () => parsedToken,
                            })
                            .withAutomaticReconnect()
                            .configureLogging(signalR.LogLevel.Information)
                            .build();

                        notificationConnection.start()
                            .then(() => {
                                console.log("SignalR Connected for Notifications in Navbar");
                                if (userId) {
                                    return notificationConnection.invoke("SetUserId", userId);
                                }
                            })
                            .then(() => console.log("UserId set in SignalR for Notifications:", userId))
                            .catch((err) => console.error("SignalR Connection Error for Notifications:", err));

                        notificationConnection.onreconnecting((error) => {
                            console.log("SignalR Reconnecting for Notifications:", error);
                        });

                        notificationConnection.onreconnected((connectionId) => {
                            console.log("SignalR Reconnected for Notifications. ConnectionId:", connectionId);
                            if (userId) {
                                notificationConnection.invoke("SetUserId", userId);
                            }
                        });

                        if (userRole === "Admin") {
                            notificationConnection.on("ReceiveHomeAddedNotification", (data) => {
                                console.log("Received SignalR Notification in Navbar (Admin):", data);
                                const notificationMessage = data?.message || data?.Message || "New Home Added";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                            notificationConnection.on("ReceiveReportNotification", (data) => {
                                console.log("Received SignalR Report Notification in Navbar (Admin):", data);
                                const notificationMessage = data?.message || "New Report Submitted";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                        }

                        if (userRole === "Owner") {
                            notificationConnection.on("ReceiveBookingNotification", (data) => {
                                console.log("Received SignalR Notification in Navbar (Owner):", data);
                                const notificationMessage = data?.message || data?.Message || "Home Status Updated";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                            notificationConnection.on("ReceiveReportResolvedNotification", (data) => {
                                console.log("Received SignalR Report Resolved Notification in Navbar (Owner):", data);
                                const notificationMessage = data?.message || "Your home has been banned due to reports";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                        }

                        if (userRole === "User") {
                            notificationConnection.on("ReceiveBookingStatusNotification", (data) => {
                                console.log("Received SignalR Notification in Navbar (User):", data);
                                const notificationMessage = data?.message || "Booking Status Updated";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                            notificationConnection.on("ReceiveReportResolvedNotification", (data) => {
                                console.log("Received SignalR Report Resolved Notification in Navbar (User):", data);
                                const notificationMessage = data?.message || "Your report has been accepted and the home is banned";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                            notificationConnection.on("ReceiveReportRejectedNotification", (data) => {
                                console.log("Received SignalR Report Rejected Notification in Navbar (User):", data);
                                const notificationMessage = data?.message || "Your report has been rejected";
                                setToastMessage(notificationMessage);
                                setNotificationCounter((prev) => prev + 1);
                            });
                        }
                    }
                } else {
                    console.warn("Navbar: User ID not found in token");
                }
            } catch (error) {
                console.error("Navbar: Error decoding token:", error);
            }
        }

        return () => {
            if (connection) {
                connection.stop().then(() => console.log("SignalR Disconnected for Chat in Navbar"));
            }
            if (notificationConnection) {
                notificationConnection.stop().then(() => console.log("SignalR Disconnected for Notifications in Navbar"));
            }
            setIsSignalRConnected(false);
        };
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        try {
            await syncSavesWithServer();
            const response = await fetch("https://localhost:7194/api/AccountUser/Logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });
            if (response.ok) {
                console.log("Navbar: Logout successful. Clearing localStorage for user:", userId);
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("username");
                localStorage.removeItem("userId");
                if (userId) {
                    localStorage.removeItem(`comparedHomes_${userId}`);
                    console.log(`Navbar: Removed localStorage key comparedHomes_${userId}`);
                }
                setRole("");
                setUsername("");
                setChatCounter(0);
                setNotificationCounter(0);
                navigate("/");
                window.location.reload();
            } else {
                const errorText = await response.text();
                console.error("Navbar: Logout failed:", errorText);
            }
        } catch (err) {
            console.error("Navbar: Error during logout:", err);
        }
    };

    const markAllAsRead = async () => {
        const token = localStorage.getItem("token");
        try {
            await axios.post("https://localhost:7194/api/Notification/MarkAllAsRead", {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setNotificationCounter(0);
        } catch (err) {
            console.error("Error marking all notifications as read:", err);
        }
    };

    const getLinks = () => {
        const notificationIcon = {
            path: "#",
            label: (
                <div
                    className="notification-icon-container"
                    onClick={async () => {
                        await markAllAsRead();
                        setShowNotificationModal(true);
                    }}
                >
                    <img src={bellIcon} alt="Notifications" className="navbar-icon" />
                    {notificationCounter > 0 && (
                        <span className="notification-counter">{notificationCounter}</span>
                    )}
                </div>
            ),
            isIcon: true,
        };

        switch (role) {
            case "Owner":
                return [
                    { path: "/NewHome", label: "Add Home" },
                    { path: homesLink, label: "My Homes" },
                    {
                        path: "/Chat",
                        label: (
                            <div className="chat-icon-container">
                                <img src={chatIcon} alt="Chat" className="navbar-icon" />
                                {chatCounter > 0 && (
                                    <span className="chat-counter">{chatCounter}</span>
                                )}
                            </div>
                        ),
                        isIcon: true,
                    },
                    notificationIcon,
                    { path: profileLink, label: "Profile" },
                    { path: "/HeroSection", label: "Home" },
                ];
            case "Admin":
                return [
                    { path: "/AddFacility", label: "Add Facility" },
                    { path: "/AdminPendingHomes", label: "Home Approvel" },
                    { path: "/RegisterAdmin", label: "Add Admin" },
                    { path: "/ReportedHomes", label: "Manage Reports" },
                    notificationIcon,
                    { path: profileLink, label: "Profile" },
                    { path: "/HeroSection", label: "Home" },
                ];
            case "User":
                return [
                    { path: "/", label: "Home" },
                    {
                        path: "/Chat",
                        label: (
                            <div className="chat-icon-container">
                                <img src={chatIcon} alt="Chat" className="navbar-icon" />
                                {chatCounter > 0 && (
                                    <span className="chat-counter">{chatCounter}</span>
                                )}
                            </div>
                        ),
                        isIcon: true,
                    },
                    { path: "/compare-homes", label: <img src={saveIcon} alt="Saved Homes" className="navbar-icon" />, isIcon: true },
                    notificationIcon,
                    { path: profileLink, label: "Profile" },
                ];
            default:
                return [{ path: "/", label: "Home" }];
        }
    };

    const getRoleClass = () => {
        switch (role) {
            case "Owner":
                return "owner-link";
            case "Admin":
                return "admin-link";
            case "User":
                return "user-link";
            default:
                return "default-link";
        }
    };

    return (
        <nav className="navbar">
            <div className="logo">
                <img src={logo} alt="Logo" className="navbar-logo" />
            </div>
            <ul className="nav-links">
                {getLinks().map((link, index) => (
                    <li key={index}>
                        <Link
                            to={link.path}
                            className={`nav-link ${getRoleClass()} ${link.isIcon ? "icon-link" : ""}`}
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
                {role ? (
                    <>
                        <li className="nav-welcome">Welcome, {username}</li>
                        <li>
                            <button className="nav-logout" onClick={handleLogout}>
                                <div className="sign">
                                    <svg viewBox="0 0 512 512">
                                        <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                                    </svg>
                                </div>
                                <div className="text">Logout</div>
                            </button>
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <Link to="/login" className="nav-link default-link">
                                Login
                            </Link>
                        </li>
                        <li>
                            <Link to="/SelectUserType" className="nav-link default-link">
                                Sign Up
                            </Link>
                        </li>
                    </>
                )}
            </ul>
            {showNotificationModal && (
                <NotificationModal onClose={() => setShowNotificationModal(false)} />
            )}
            {toastMessage && (
                <JsNotification
                    message={toastMessage}
                    onClose={() => {
                        setToastMessage(null);
                        console.log("Notification closed, toastMessage set to null");
                    }}
                />
            )}
        </nav>
    );
};

export default Navbar;