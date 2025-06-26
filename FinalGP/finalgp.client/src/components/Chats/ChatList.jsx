import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import "./ChatList.css";

export default function ChatList({ onSelectUser }) {
    const [conversations, setConversations] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});
    const [error, setError] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const token = localStorage.getItem("token");
    const currentUserId = localStorage.getItem("userId");
    const connRef = useRef(null);

    useEffect(() => {
        const fetchChatList = async () => {
            try {
                const response = await axios.get("https://localhost:7194/api/chat/chat-list", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setConversations(response.data);
                console.log("Chat list API response:", response.data);
            } catch (err) {
                console.error("Error fetching chat list:", err.response?.data || err.message);
                setError("Failed to load Chats");
            }
        };
        fetchChatList();

        const conn = new HubConnectionBuilder()
            .withUrl("https://localhost:7194/hubs/chat", { accessTokenFactory: () => token })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        conn.on("UpdateChatList", (updatedConv) => {
            // منع إضافة المحادثات الذاتية
            if (updatedConv.otherUserId === currentUserId) {
                return;
            }
            setConversations(prev => {
                const index = prev.findIndex(c => c.otherUserId === updatedConv.otherUserId);
                if (index !== -1) {
                    const newConvs = [...prev];
                    newConvs[index] = updatedConv;
                    return newConvs;
                } else {
                    return [updatedConv, ...prev];
                }
            });
            setTypingUsers(prev => ({ ...prev, [updatedConv.otherUserId]: false }));
        });

        conn.on("RemoveFromChatList", (otherUserId) => {
            setConversations(prev => prev.filter(c => c.otherUserId !== otherUserId));
        });

        conn.on("UserTyping", (userId) => {
            setTypingUsers(prev => ({ ...prev, [userId]: true }));
        });

        conn.on("UserStoppedTyping", (userId) => {
            setTypingUsers(prev => ({ ...prev, [userId]: false }));
        });

        conn.start()
            .then(() => console.log("SignalR connected for chat list"))
            .catch(err => console.error("SignalR connection error:", err));

        connRef.current = conn;
        return () => {
            conn.stop();
        };
    }, [token, currentUserId]);

    const handleConversationClick = (otherUserId, otherUserName) => {
        setSelectedChat(otherUserId);
        onSelectUser(otherUserId, otherUserName);
    };

    // دالة لتنسيق الوقت بطريقة أفضل
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();

        // نفس اليوم - نعرض الساعة فقط
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // خلال الأسبوع الحالي - نعرض اسم اليوم
        const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            return days[date.getDay()];
        }

        // تاريخ أقدم - نعرض التاريخ المختصر
        return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    return (
        <div className="chat-list-container">
            <div className="chat-list-header">
                <h2>Chats</h2>
            </div>
            {error && <div className="error-message">{error}</div>}
            {conversations.length === 0 ? (
                <div className="no-chats">No Chats Yet</div>
            ) : (
                <ul className="chat-list">
                    {conversations.map((conv) => (
                        <li
                            key={conv.otherUserId}
                            className={`chat-item ${selectedChat === conv.otherUserId ? 'selected' : ''}`}
                            onClick={() => handleConversationClick(conv.otherUserId, conv.otherUserName)}
                        >
                            <div className="chat-avatar">
                                {/* أول حرف من اسم المستخدم */}
                                {conv.otherUserName.charAt(0).toUpperCase()}
                            </div>
                            <div className="chat-item-content">
                                <div className="chat-item-top">
                                    <div className="chat-item-name">{conv.otherUserName}</div>
                                    <div className="chat-item-time">
                                        {formatTime(conv.timestamp)}
                                    </div>
                                </div>
                                <div className="chat-item-bottom">
                                    <div className="chat-item-message">
                                        {typingUsers[conv.otherUserId] ? "typing..." : conv.lastMessage}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="unread-count">{conv.unreadCount}</div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}