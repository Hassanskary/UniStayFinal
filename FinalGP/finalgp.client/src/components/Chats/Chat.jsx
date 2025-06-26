// src/pages/Chat.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import ChatList from "../Chats/ChatList";
import ChatRoom from "../Chats/ChatRoom";
import Navbar from "../../components/Navbar";
import "./Chat.css";
import axios from "axios";
import * as signalR from "@microsoft/signalr";

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

export default function Chat() {
    const { userId } = useParams();
    const navigate = useNavigate();

    // selected conversation state
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserName, setSelectedUserName] = useState("");
    const [error, setError] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // guard: must be logged in with role "User" or "Owner"
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        const claims = parseJwt(token);
        const role =
            claims?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            claims?.["http://schemas.microsoft.com/ws/2005/05/identity/claims/role"] ||
            claims?.role;
        if (role !== "User" && role !== "Owner") {
            Swal.fire({
                icon: "warning",
                title: "Not Authorized",
                text: "This page is only available to Users or Owners.",
            }).then(() => {
                navigate("/");
            });
            return;
        }
    }, [navigate]);

    // fetch a username for a given id
    const fetchUserName = async (id) => {
        try {
            const response = await axios.get(
                `https://localhost:7194/api/Chat/username/${id}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            return response.data.userName || "Unknown User";
        } catch (err) {
            console.error("Error fetching username:", err.response?.data || err.message);
            setError("Failed to fetch username.");
            return "Unknown User";
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7194/hubs/chat", {
                accessTokenFactory: () => token,
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets,
            })
            .withAutomaticReconnect()
            .build();

        connection
            .start()
            .then(() => connection.invoke("ResetChatCounter", userId).catch(console.error))
            .catch(console.error);

        const initialize = async () => {
            setLoadingUser(true);
            if (userId) {
                setSelectedUserId(userId);
                const name = await fetchUserName(userId);
                setSelectedUserName(name);
            } else {
                setSelectedUserId(null);
                setSelectedUserName("");
            }
            setLoadingUser(false);
            setIsInitialized(true);
        };

        initialize();

        return () => {
            connection.stop().catch(() => { });
        };
    }, [userId]);

    const handleSelectUser = (id, name) => {
        setSelectedUserId(id);
        setSelectedUserName(name);
        setError(null);
        setIsInitialized(true);
    };

    return (
        <div className="chat-container">
            <Navbar />
            <div className="chat-wrapper">
                <aside className="chat-list-panel">
                    <ChatList onSelectUser={handleSelectUser} />
                </aside>
                <section className="chat-room-panel">
                    {error && <div className="error-message">{error}</div>}
                    {loadingUser || !isInitialized ? (
                        <div className="loading-message">Loading data...</div>
                    ) : selectedUserId ? (
                        <ChatRoom
                            key={selectedUserId}
                            receiverId={selectedUserId}
                            receiverName={selectedUserName}
                        />
                    ) : (
                        <div className="empty-chat">
                            <p>Select a user to start chatting</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
