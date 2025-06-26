import React, { useEffect, useState, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import axios from "axios";
import "./ChatRoom.css";

// استيراد الأيقونات
import sendIcon from "../../assets/send.png";
import attachmentIcon from "../../assets/attach-file.png";
import editIcon from "../../assets/edit.png";
import deleteIcon from "../../assets/bin.png";
import saveIcon from "../../assets/check.png";
import cancelIcon from "../../assets/cancel.png";

function parseJwt(token) {
    try {
        const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(b));
    } catch {
        return {};
    }
}

export default function ChatRoom({ receiverId, receiverName }) {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [isOnline, setIsOnline] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [skip, setSkip] = useState(0);
    const [isSignalRConnected, setIsSignalRConnected] = useState(false);
    const connRef = useRef(null);
    const chatHistoryRef = useRef(null);
    const messagesEndRef = useRef(null);
    const initialLoad = useRef(true);

    const baseUrl = "https://localhost:7194";

    const raw = localStorage.getItem("token") || "";
    const jwt = raw.startsWith("{") ? JSON.parse(raw).token : raw;
    const claims = parseJwt(jwt);
    const senderId = claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || claims.sub;

    // Reset state and fetch messages when receiverId changes, but only after SignalR is connected
    useEffect(() => {
        if (!receiverId || !isSignalRConnected) return;

        setMessages([]);
        setDraft("");
        setIsTyping(false);
        setEditingMessageId(null);
        setEditContent("");
        setFile(null);
        setLoading(false);
        setHasMore(true);
        setSkip(0);
        initialLoad.current = true;

        fetchMessages(0);
    }, [receiverId, isSignalRConnected]);

    const fetchMessages = async (skipCount) => {
        if (!receiverId || receiverId === "undefined") {
            console.warn("Cannot fetch messages: receiverId is undefined");
            setError("Cannot load messages: Invalid receiver ID");
            return;
        }
        if (!senderId) {
            console.warn("Cannot fetch messages: senderId is undefined");
            setError("Cannot load messages: Invalid sender ID");
            return;
        }
        setLoading(true);
        try {
            console.log(`Fetching messages for senderId: ${senderId}, receiverId: ${receiverId}, skip: ${skipCount}`);
            const response = await fetch(`${baseUrl}/api/chat/history/${senderId}/${receiverId}?skip=${skipCount}&take=50`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Fetched messages:", data);
            if (data.length < 50) {
                setHasMore(false);
            }
            setMessages(prev => [...data.reverse(), ...prev]);
            setSkip(skipCount + 50);
            if (data && connRef.current && connRef.current.state === "Connected") {
                data.forEach(msg => {
                    if (msg.receiverId === senderId && msg.status !== 2 && msg.id && senderId) {
                        console.log(`Marking message ${msg.id} as read for user ${senderId}`);
                        console.log("Message data:", msg);
                        console.log("Sender ID:", senderId);
                        connRef.current.invoke("MarkAsRead", msg.id, senderId).catch(err => {
                            console.error("MarkAsRead error:", err);
                            setError("فشل في تحديث حالة الرسالة: " + err.message);
                        });
                    }
                });
            } else {
                console.warn("SignalR not connected or invalid data, cannot mark messages as read");
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
            setError("Failed to load messages: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!receiverId || receiverId === "undefined") {
            return;
        }

        const conn = new HubConnectionBuilder()
            .withUrl(`${baseUrl}/hubs/chat`, { accessTokenFactory: () => jwt })
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        conn.on("ReceiveMessage", msg => {
            if ((msg.senderId === senderId && msg.receiverId === receiverId) ||
                (msg.senderId === receiverId && msg.receiverId === senderId)) {
                console.log("Received message:", msg);
                setMessages(ms => {
                    const dup = ms.some(m => m.id === msg.id);
                    return dup ? ms : [...ms, msg];
                });
                if (msg.receiverId === senderId && connRef.current && connRef.current.state === "Connected") {
                    console.log(`Marking message ${msg.id} as read for user ${senderId}`);
                    console.log("Message data:", msg);
                    console.log("Sender ID:", senderId);
                    conn.invoke("MarkAsRead", msg.id, senderId).catch(err => {
                        -console.error("MarkAsRead error:", err);
                        setError("فشل في تحديث حالة الرسالة: " + err.message);
                    });
                } else {
                    console.warn("SignalR not connected or invalid data, cannot mark message as read");
                }
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        });

        conn.on("UserOnlineStatus", (userId, online) => {
            if (userId === receiverId) setIsOnline(online);
        });

        conn.on("UserTyping", userId => {
            if (userId === receiverId) setIsTyping(true);
        });

        conn.on("UserStoppedTyping", userId => {
            if (userId === receiverId) setIsTyping(false);
        });

        conn.on("MessageEdited", (updatedMessage) => {
            setMessages(prev => prev.map(msg =>
                msg.id === updatedMessage.id ? updatedMessage : msg
            ));
        });

        conn.on("MessageDeleted", (messageId) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        });

        conn.on("MessageStatusUpdated", (messageId, status) => {
            console.log(`Status updated for message ${messageId}:`, status, typeof status);
            setMessages(prev => {
                const updatedMessages = prev.map(msg =>
                    msg.id === messageId ? { ...msg, status: Number(status) } : msg
                );
                console.log("Updated messages:", updatedMessages);
                return [...updatedMessages];
            });
        });

        conn.on("Error", (error) => {
            console.error("Error from server:", error);
            setError(error);
        });

        connRef.current = conn;
        conn.start()
            .then(() => {
                console.log("SignalR connected, sending online status for:",

                    receiverId);
                setIsSignalRConnected(true);
                return conn.invoke("SendOnlineStatus", receiverId);
            })
            .catch(err => {
                console.error("SignalR connection error:", err);
                setError("فشل في الاتصال بـ SignalR: " + err.message);
            });

        return () => {
            conn.invoke("StopTyping", receiverId).catch(() => { });
            conn.stop();
            setIsSignalRConnected(false);
        };
    }, [receiverId, senderId, jwt]);

    const handleScroll = () => {
        if (chatHistoryRef.current &&
            chatHistoryRef.current.scrollTop === 0 &&
            hasMore &&
            !loading) {
            const previousHeight = chatHistoryRef.current.scrollHeight;
            fetchMessages(skip).then(() => {
                chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight - previousHeight;
            });
        }
    };

    useEffect(() => {
        const chatHistory = chatHistoryRef.current;
        if (chatHistory) {
            chatHistory.addEventListener('scroll', handleScroll);
            return () => {
                chatHistory.removeEventListener('scroll', handleScroll);
            };
        }
    }, [hasMore, loading, skip]);

    useEffect(() => {
        if (initialLoad.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            initialLoad.current = false;
        }
    }, [messages]);

    const handleChange = e => {
        const text = e.target.value;
        setDraft(text);
        if (!connRef.current) return;
        if (text.trim().length > 0) {
            connRef.current.invoke("Typing", receiverId).catch(console.error);
        } else {
            connRef.current.invoke("StopTyping", receiverId).catch(console.error);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const sendMessage = () => {
        const text = draft.trim();
        if (!text || !connRef.current) return;
        const msg = {
            senderId,
            receiverId,
            message: text,
            timestamp: new Date().toISOString()
        };
        connRef.current.invoke("SendMessage", msg).catch(console.error);
        connRef.current.invoke("StopTyping", receiverId).catch(console.error);
        setDraft("");
    };

    const sendFile = async () => {
        if (!file || !connRef.current) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${baseUrl}/api/chat/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            const fileUrl = response.data.fileUrl;
            const msg = {
                senderId,
                receiverId,
                message: fileUrl,
                timestamp: new Date().toISOString()
            };

            await connRef.current.invoke("SendMessage", msg);
            setFile(null);

            // إعادة تعيين حقل اختيار الملف
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            console.error("Error uploading file:", err.response?.data || err.message);
            setError("فشل في رفع الملف");
        }
    };

    const startEditing = (message) => {
        if (!message.id) {
            console.error("Message ID is missing:", message);
            setError("لا يمكن تعديل الرسالة: معرف الرسالة مفقود");
            return;
        }
        setEditingMessageId(message.id);
        setEditContent(message.message);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setEditContent("");
    };

    const saveEdit = async () => {
        if (!connRef.current || !editContent.trim() || !editingMessageId) return;
        await connRef.current.invoke("EditMessage", editingMessageId, editContent.trim())
            .catch(err => console.error("Error editing message:", err));
        setEditingMessageId(null);
        setEditContent("");
    };

    const deleteMessage = async (messageId) => {
        if (!connRef.current || !messageId) {
            console.error("Invalid message ID for deletion:", messageId);
            setError("لا يمكن حذف الرسالة: معرف غير صالح");
            return;
        }
        await connRef.current.invoke("DeleteMessage", messageId)
            .catch(err => console.error("Error deleting message:", err));
    };

    const isFileMessage = (message) => {
        const fileExtensions = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt)$/i;
        return fileExtensions.test(message);
    };

    const isImageMessage = (message) => {
        const imageExtensions = /\.(jpg|jpeg|png|gif)$/i;
        return imageExtensions.test(message);
    };

    const getOriginalFileName = (url) => {
        const fileNameWithGuid = url.split('/').pop();
        const parts = fileNameWithGuid.split('_');
        if (parts.length > 1) {
            return parts.slice(1).join('_');
        }
        return fileNameWithGuid;
    };

    const openInNewTab = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const getStatusIndicator = (status) => {
        console.log("Message status:", status, typeof status);
        if (status === null || status === undefined) {
            console.warn("Invalid status value:", status);
            return null;
        }
        const statusMap = {
            0: "Sent",
            1: "Received",
            2: "Read",
            "Sent": "Sent",
            "Received": "Received",
            "Read": "Read",
            "0": "Sent",
            "1": "Received",
            "2": "Read"
        };
        const statusString = statusMap[status] || "غير معروف";
        console.log("Mapped status:", statusString);
        switch (statusString) {
            case "Sent":
                return <span className="status-indicator">✔</span>;
            case "Received":
                return <span className="status-indicator">✔✔</span>;
            case "Read":
                return <span className="status-indicator status-read">✔✔</span>;
            default:
                return null;
        }
    };

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!receiverId) {
        return null; // Don't render anything if receiverId is not available
    }

    return (
        <div className="chat-room">
            <div className="chat-room-header">
                <div className="receiver-info">
                    <div className="receiver-avatar">
                        {receiverName && receiverName.charAt(0).toUpperCase()}
                    </div>
                    <div className="receiver-details">
                        <div className="receiver-name">{receiverName}</div>
                        <div className="receiver-status">
                            {isOnline ? "Online" : "Offline"}
                            {isTyping && <div className="typing-indicator">typing...</div>}
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="chat-messages" ref={chatHistoryRef}>


                {messages.length === 0 && !loading && !error ? (
                    <div className="no-messages">No Chats yet, Start yours!</div>
                ) : (
                    <>
                        {messages.map((m) => {
                            const isSender = m.senderId === senderId;
                            return (
                                <div key={m.id || `${m.senderId}-${m.timestamp}`}
                                    className={`message ${isSender ? "outgoing" : "incoming"}`}>
                                    {editingMessageId === m.id ? (
                                        <div className="edit-message">
                                            <input
                                                type="text"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="edit-actions">
                                                <button onClick={saveEdit} className="savess-btn">
                                                    <img
                                                        src={saveIcon}
                                                        alt="Save"
                                                        className="edit-icon"
                                                    />
                                                </button>
                                                <button onClick={cancelEditing} className="cancelss-btn">
                                                    <img
                                                        src={cancelIcon}
                                                        alt="Cancel"
                                                        className="edit-icon"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {isFileMessage(m.message) ? (
                                                isImageMessage(m.message) ? (
                                                    <div className="image-message">
                                                        <img
                                                            src={`${baseUrl}${m.message}`}
                                                            alt="Chat Picture"
                                                            onClick={() => openInNewTab(`${baseUrl}${m.message}`)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="file-message">
                                                        <span className="file-name">
                                                            {getOriginalFileName(m.message)}
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="message-text">{m.message}</div>
                                            )}

                                            <div className="message-footer">
                                                <span className="message-time">
                                                    {formatMessageTime(m.timestamp)}
                                                </span>

                                                {isSender && (
                                                    <div className="message-actions">
                                                        {getStatusIndicator(m.status)}

                                                        {!isFileMessage(m.message) && (
                                                            <button
                                                                className="edit-button"
                                                                onClick={() => startEditing(m)}
                                                            >
                                                                <img
                                                                    src={editIcon}
                                                                    alt="Edit"
                                                                    className="action-icon"
                                                                    width="14"
                                                                    height="14"
                                                                />
                                                            </button>
                                                        )}

                                                        <button
                                                            className="delete-button"
                                                            onClick={() => deleteMessage(m.id)}
                                                        >
                                                            <img
                                                                src={deleteIcon}
                                                                alt="Delete"
                                                                className="action-icon"
                                                                width="14"
                                                                height="14"
                                                            />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="chat-input-area">
                <div className="file-input-container">
                    <label htmlFor="file-input" className="file-button">
                        <img
                            src={attachmentIcon}
                            alt="Attach file"
                            className="attachment-icon"
                            width="20"
                            height="20"
                        />
                    </label>
                    <input
                        type="file"
                        id="file-input"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="message-input-container">
                    <input
                        type="text"
                        className="message-input"
                        placeholder="Type Here..."
                        value={draft}
                        onChange={handleChange}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                    />
                </div>

                {file ? (
                    <button className="send-button file-selected" onClick={sendFile}>
                        <span className="file-name-preview">{file.name}</span>
                        <img
                            src={sendIcon}
                            alt="Send"
                            className="send-icon"
                            width="20"
                            height="20"
                        />
                    </button>
                ) : (
                    <button className="send-button" onClick={sendMessage} disabled={!draft.trim()}>
                        <img
                            src={sendIcon}
                            alt="Send"
                            className="send-icon"
                            width="20"
                            height="20"
                        />
                    </button>
                )}
            </div>
        </div>
    );
}