
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./NotificationModal.css";
import * as signalR from "@microsoft/signalr";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faSquare, faStar, faCheckSquare, faTimes } from "@fortawesome/free-solid-svg-icons";

const NotificationModal = ({ onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(1);
    const [totalNotifications, setTotalNotifications] = useState(0);
    const [loading, setLoading] = useState(false);
    const modalRef = useRef(null);
    const navigate = useNavigate();

    const userRole = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    // دالة لتحديد أيقونة الإشعار بناءً على نوعه
    const getNotificationIcon = (message) => {
        if (message.includes("New Home")) return faSquare; // مربع للمنازل
        if (message.includes("Booking")) return faCircle; // دائرة للحجوزات
        if (message.includes("Report")) return faStar; // نجمة للتقارير
        if (message.includes("accepted")) return faCheckSquare; // مربع مع علامة صح
        if (message.includes("rejected")) return faTimes; // علامة إلغاء
        return faCircle; // افتراضي
    };

    // جلب الإشعارات
    const fetchAllNotifications = async (pageNum = 1) => {
        if (!userId || !token) return;
        setLoading(true);
        try {
            const response = await axios.get(`https://localhost:7194/api/Notification/all?page=${pageNum}&pageSize=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const { notifications: fetchedNotifications, totalCount } = response.data;
            const formattedNotifications = fetchedNotifications.map((notif) => ({
                id: notif.id,
                message: notif.message,
                time: new Date(notif.date).toLocaleString(),
                isRead: notif.isRead,
            }));
            if (pageNum === 1) {
                setNotifications(formattedNotifications);
                setTotalNotifications(totalCount || 0);
            } else {
                setNotifications((prev) => [...prev, ...formattedNotifications]);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            if (pageNum === 1) {
                setNotifications([]);
                setTotalNotifications(0);
            }
        } finally {
            setLoading(false);
        }
    };

    // جلب المزيد من الإشعارات
    const fetchMoreNotifications = () => {
        if (!loading && notifications.length < totalNotifications) {
            setPage((prev) => prev + 1);
            fetchAllNotifications(page + 1);
        }
    };

    // تحديد الإشعار كمقروء
    const markAsRead = async (notificationId) => {
        try {
            await axios.put(
                `https://localhost:7194/api/Notification/mark-read/${notificationId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications((prev) =>
                prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif))
            );
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // تحديد كل الإشعارات كمقروءة
    const markAllAsRead = async () => {
        try {
            await axios.put(
                `https://localhost:7194/api/Notification/mark-all-read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    useEffect(() => {
        fetchAllNotifications();
    }, [userId]);

    // SignalR للإشعارات في الوقت الفعلي
    useEffect(() => {
        if (!userId || !token) return;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7194/notificationHub", {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

        connection
            .start()
            .then(() => connection.invoke("SetUserId", userId))
            .catch((err) => console.error("SignalR Error:", err));

        if (userRole === "Admin") {
            connection.on("ReceiveHomeAddedNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "New Home Added",
                    time: new Date(data.submitted || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
            connection.on("ReceiveReportNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "New Report Submitted",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
        } else if (userRole === "Owner") {
            connection.on("ReceiveBookingNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "New Booking Received",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
            connection.on("ReceiveReportResolvedNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "Your home has been banned due to reports",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
        } else if (userRole === "User") {
            connection.on("ReceiveBookingStatusNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "Booking Status Updated",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
            connection.on("ReceiveReportResolvedNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "Your report has been accepted and the home is banned",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
            connection.on("ReceiveReportRejectedNotification", (data) => {
                const newNotification = {
                    id: data.id || Date.now(),
                    message: data.message || "Your report has been rejected",
                    time: new Date(data.time || Date.now()).toLocaleString(),
                    isRead: false,
                };
                setNotifications((prev) => [newNotification, ...prev]);
                setTotalNotifications((prev) => prev + 1);
            });
        }

        return () => connection.stop();
    }, [userRole, userId, token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
        const homeIdPattern = /Home (\d+)/;
        const roomIdPattern = /room (\d+)/;
        const homeReportPattern = /home \(ID: (\d+)\)/;

        let url = null;
        const message = notification.message;
        if (message.includes("Owner") && message.includes("has added New Home")) {
            const match = message.match(homeIdPattern);
            if (match) url = `http://localhost:55559/home-details/${match[1]}`;
        } else if (message.includes("Admin was update home status")) {
            const match = message.match(homeIdPattern);
            if (match) url = `http://localhost:55559/home-details/${match[1]}`;
        } else if (message.includes("booking by user") && (message.includes("Cash") || message.includes("Stripe"))) {
            const match = message.match(roomIdPattern);
            if (match) url = `http://localhost:55559/RoomDetails/${match[1]}`;
        } else if (message.includes("Your booking for room") || message.includes("Your renewal booking for room")) {
            const match = message.match(roomIdPattern);
            if (match) url = `http://localhost:55559/RoomDetails/${match[1]}`;
        } else if (message.includes("has reported home")) {
            const match = message.match(homeReportPattern);
            if (match) url = `http://localhost:55559/HomeReports/${match[1]}`;
        } else if (message.includes("Your home (ID:") && message.includes("has been banned")) {
            const match = message.match(homeReportPattern);
            if (match) url = `http://localhost:55559/home-details/${match[1]}`;
        } else if (message.includes("Your report on home") && message.includes("has been rejected")) {
            const match = message.match(homeReportPattern);
            if (match) url = `http://localhost:55559/detailsH/${match[1]}`;
        }

        if (url) window.location.href = url;
    };

    if (userRole !== "Admin" && userRole !== "Owner" && userRole !== "User") return null;

    return (
        <div className="notification-modal-overlay">
            <div className="notification-modal" ref={modalRef}>
                <div className="notification-header">
                    <h3>Notifications</h3>
                    <div>
                        {notifications.some((notif) => !notif.isRead) && (
                            <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                        <button className="close-btn" onClick={onClose}>
                            ×
                        </button>
                    </div>
                </div>
                <div className="notification-list">
                    {loading && notifications.length === 0 ? (
                        <div className="skeleton-loading">
                            <div className="skeleton-item"></div>
                            <div className="skeleton-item"></div>
                            <div className="skeleton-item"></div>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`notification-item ${notif.isRead ? "read" : "unread"}`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <FontAwesomeIcon icon={getNotificationIcon(notif.message)} className="notification-icon" />
                                <div className="notification-content">
                                    <p>{notif.message}</p>
                                    <span className="notification-time">{notif.time}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-notifications">No notifications</div>
                    )}
                    {notifications.length < totalNotifications && !loading && (
                        <button className="show-more-btn" onClick={fetchMoreNotifications}>
                            Show more
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;