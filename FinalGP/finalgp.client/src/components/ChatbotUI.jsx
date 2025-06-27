import React, { useState, useRef, useEffect } from 'react';
import './ChatbotUI.css';

const ChatbotUI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showFAQ, setShowFAQ] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Local Storage keys
    const STORAGE_KEYS = {
        MESSAGES: 'chatbot_messages',
        CHAT_HISTORY: 'chatbot_history',
        LAST_CHAT_DATE: 'chatbot_last_date'
    };

    // FAQ Data
    const faqData = [
        {
            category: "عام",
            questions: [
                {
                    question: "ما هي منصة سكن الطلاب؟",
                    answer: "منصة متخصصة في مساعدة الطلاب للعثور على سكن مناسب بناءً على تفضيلاتهم وميزانيتهم."
                },
                {
                    question: "كيف يمكنني التسجيل في المنصة؟",
                    answer: "يمكنك التسجيل كطالب أو مالك سكن عبر النموذج الإلكتروني، مع تقديم الوثائق المطلوبة."
                },
                {
                    question: "هل الخدمة مجانية؟",
                    answer: "نعم، الخدمة مجانية للطلاب، بينما قد توجد رسوم رمزية لمالكي السكنات لنشر الإعلانات المميزة."
                }
            ]
        },
        {
            category: "البحث والسكن",
            questions: [
                {
                    question: "كيف أبحث عن سكن يناسب ميزانيتي؟",
                    answer: "أخبرنا بميزانيتك وسنساعدك في العثور على خيارات مناسبة، مثل: 'أبحث عن سكن بـ 1500 جنيه'."
                },
                {
                    question: "كيف أعرف أن السكن آمن؟",
                    answer: "جميع السكنات تمر بمراجعة إدارية، كما يمكنك رؤية تقييمات الطلاب السابقين."
                }
            ]
        },
        {
            category: "الحجوزات والدفع",
            questions: [
                {
                    question: "ما هي طرق الدفع المتاحة؟",
                    answer: "نقبل الدفع نقدًا عند الوصول، أو عبر المحفظة الإلكترونية."
                },
                {
                    question: "هل يمكنني إلغاء الحجز؟",
                    answer: "نعم، وفقًا لسياسة الإلغاء المحددة من قبل مالك السكن."
                }
            ]
        },
        {
            category: "المرافق",
            questions: [
                {
                    question: "ما هي المرافق المتاحة عادةً في السكنات؟",
                    answer: "واي فاي - تكييف - غسالة - ثلاجة - ديب فريزر - مطبخ مشترك/خاص."
                },
                {
                    question: "كيف أطلب سكنًا بمرافق محددة؟",
                    answer: "اكتب: 'أريد سكنًا بواي فاي وتكييف' وسنعرض الخيارات المتاحة."
                }
            ]
        },
        {
            category: "التقييمات والشكاوى",
            questions: [
                {
                    question: "كيف أقيّم السكن بعد الإقامة؟",
                    answer: "يمكنك إضافة تقييم من صفحة تفاصيل السكن، من 1 إلى 5 نجوم."
                },
                {
                    question: "ماذا أفعل إذا واجهت مشكلة في السكن؟",
                    answer: "يمكنك إبلاغنا عبر نموذج الإبلاغ عن المشكلات أو عمل تقرير، وسنتواصل مع المالك لحلها."
                }
            ]
        }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Load messages from localStorage on component mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    // Save messages to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            saveChatHistory();
        }
    }, [messages]);

    const getDefaultMessage = () => ({
        id: 1,
        text: "أهلاً وسهلاً! أنا مساعدك الذكي لإيجاد السكن المناسب للطلاب. كيف يمكنني مساعدتك اليوم؟",
        sender: 'bot',
        timestamp: new Date()
    });

    const loadChatHistory = () => {
        try {
            const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
            const lastChatDate = localStorage.getItem(STORAGE_KEYS.LAST_CHAT_DATE);

            if (savedMessages && lastChatDate) {
                const parsedMessages = JSON.parse(savedMessages);
                const lastDate = new Date(lastChatDate);
                const now = new Date();

                // Check if the last chat was within the last 7 days
                const daysDifference = (now - lastDate) / (1000 * 60 * 60 * 24);

                if (daysDifference <= 7 && parsedMessages.length > 0) {
                    // Restore messages with proper Date objects
                    const restoredMessages = parsedMessages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }));
                    setMessages(restoredMessages);
                    return;
                }
            }

            // If no valid saved messages, start with default
            setMessages([getDefaultMessage()]);
        } catch (error) {
            console.error('Error loading chat history:', error);
            setMessages([getDefaultMessage()]);
        }
    };

    const saveChatHistory = () => {
        try {
            localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
            localStorage.setItem(STORAGE_KEYS.LAST_CHAT_DATE, new Date().toISOString());

            // Save to chat history for future reference
            const chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY) || '[]');
            const today = new Date().toDateString();

            // Update or add today's chat
            const existingChatIndex = chatHistory.findIndex(chat => chat.date === today);
            const chatSummary = {
                date: today,
                messageCount: messages.length,
                lastMessage: messages[messages.length - 1]?.text?.substring(0, 100) || '',
                timestamp: new Date().toISOString()
            };

            if (existingChatIndex >= 0) {
                chatHistory[existingChatIndex] = chatSummary;
            } else {
                chatHistory.push(chatSummary);
            }

            // Keep only last 30 days of history
            const recentHistory = chatHistory
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 30);

            localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(recentHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    };

    const toggleChatbot = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setShowFAQ(false);
        }
    };

    const toggleFAQ = () => {
        setShowFAQ(!showFAQ);
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('https://localhost:7194/api/Chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                },
                body: JSON.stringify({
                    message: inputMessage
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            let botResponseText = '';
            if (data.choices && data.choices.length > 0) {
                botResponseText = data.choices[0].message.content;
            } else {
                botResponseText = 'عذراً، حدث خطأ في الاستجابة. يرجى المحاولة مرة أخرى.';
            }

            const botMessage = {
                id: Date.now() + 1,
                text: botResponseText,
                sender: 'bot',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: 'عذراً، حدث خطأ في الاتصال. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.',
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatMessage = (text) => {
        // تحويل النص إلى HTML مع الحفاظ على التنسيق
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>') // Links
            .replace(/•/g, '•')
            .replace(/🏠/g, '🏠')
            .replace(/📍/g, '📍')
            .replace(/💰/g, '💰')
            .replace(/🚻/g, '🚻')
            .replace(/🏢/g, '🏢')
            .replace(/🔧/g, '🔧')
            .replace(/⭐/g, '⭐')
            .replace(/📏/g, '📏')
            .replace(/🔗/g, '🔗')
            .replace(/😊/g, '😊')
            .replace(/🎉/g, '🎉')
            .replace(/😔/g, '😔')
            .replace(/🤔/g, '🤔')
            .replace(/💡/g, '💡')
            .replace(/✨/g, '✨')
            .replace(/🔹/g, '🔹')
            .replace(/👋/g, '👋')
            .replace(/🔍/g, '🔍')
            .replace(/📋/g, '📋')
            .replace(/📅/g, '📅')
            .replace(/🌊/g, '🌊')
            .replace(/🏛️/g, '🏛️')
            .replace(/🕋/g, '🕋')
            .replace(/💬/g, '💬')
            .replace(/❓/g, '❓')
            .replace(/📞/g, '📞')
            .replace(/🎓/g, '🎓')
            .replace(/📱/g, '📱');
    };

    const clearChat = () => {
        const defaultMessage = getDefaultMessage();
        setMessages([defaultMessage]);

        // Clear from localStorage
        try {
            localStorage.removeItem(STORAGE_KEYS.MESSAGES);
            localStorage.removeItem(STORAGE_KEYS.LAST_CHAT_DATE);
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    };

    const clearAllHistory = () => {
        if (window.confirm('هل أنت متأكد من حذف جميع المحادثات السابقة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
                localStorage.removeItem(STORAGE_KEYS.MESSAGES);
                localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
                localStorage.removeItem(STORAGE_KEYS.LAST_CHAT_DATE);

                const defaultMessage = getDefaultMessage();
                setMessages([defaultMessage]);
            } catch (error) {
                console.error('Error clearing all history:', error);
            }
        }
    };

    const getChatStats = () => {
        try {
            const chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY) || '[]');
            return {
                totalChats: chatHistory.length,
                totalMessages: chatHistory.reduce((sum, chat) => sum + chat.messageCount, 0)
            };
        } catch (error) {
            return { totalChats: 0, totalMessages: 0 };
        }
    };

    const handleFAQClick = (question) => {
        setInputMessage(question);
        if (isOpen) {
            inputRef.current.focus();
        } else {
            setIsOpen(true);
            setTimeout(() => inputRef.current.focus(), 300);
        }
    };

    const stats = getChatStats();

    return (
        <>
            {/* Floating Chat Button */}
            <div className={`chatbot-float-button ${isOpen ? 'open' : ''}`} onClick={toggleChatbot}>
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <div className="chat-button-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {stats.totalMessages > 0 && (
                            <div className="chat-notification-badge" title={`${stats.totalMessages} رسالة في ${stats.totalChats} محادثة`}>
                                {stats.totalMessages > 99 ? '99+' : stats.totalMessages}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Interface */}
            {isOpen && (
                <div className="chatbot-container">
                    {/* Navbar */}
                    <div className="chatbot-navbar">
                        <div className="chatbot-navbar-title">مساعد السكن الذكي</div>
                        <div className="chatbot-navbar-actions">
                            <button
                                className="chatbot-navbar-button"
                                onClick={toggleFAQ}
                                title="الأسئلة الشائعة"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                className="chatbot-navbar-button"
                                onClick={clearChat}
                                title="مسح المحادثة"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* FAQ Panel */}
                    {showFAQ && (
                        <div className="chatbot-faq-panel">
                            <div className="chatbot-faq-header">
                                <h4>الأسئلة الشائعة</h4>
                                <button onClick={toggleFAQ} className="chatbot-faq-close">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <div className="chatbot-faq-content">
                                {faqData.map((section, index) => (
                                    <div key={index} className="chatbot-faq-section">
                                        <h5>{section.category}</h5>
                                        <ul>
                                            {section.questions.map((item, qIndex) => (
                                                <li
                                                    key={qIndex}
                                                    onClick={() => handleFAQClick(item.question)}
                                                    className="chatbot-faq-question"
                                                >
                                                    {item.question}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="chatbot-messages">
                        {messages.map((message) => (
                            <div key={message.id} className={`message ${message.sender}`}>
                                <div className="message-content">
                                    <div
                                        className="message-text"
                                        dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                                    />
                                    <div className="message-time">
                                        {message.timestamp.toLocaleTimeString('ar-EG', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="message bot">
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="chatbot-input">
                        <div className="input-container">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="اكتب رسالتك هنا..."
                                disabled={isLoading}
                                className="message-input"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="send-button"
                            >
                                {isLoading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="quick-suggestions">
                            <button
                                className="suggestion-btn"
                                onClick={() => setInputMessage('أبحث عن سكن للبنات في القاهرة')}
                                disabled={isLoading}
                            >
                                سكن للبنات في القاهرة
                            </button>
                            <button
                                className="suggestion-btn"
                                onClick={() => setInputMessage('ما هي المرافق المتاحة؟')}
                                disabled={isLoading}
                            >
                                المرافق المتاحة
                            </button>
                            <button
                                className="suggestion-btn"
                                onClick={() => setInputMessage('أريد سكن بميزانية 1500 جنيه مع واي فاي')}
                                disabled={isLoading}
                            >
                                سكن بميزانية محددة
                            </button>
                        </div>

                        {stats.totalChats > 0 && (
                            <div className="chat-stats">
                                <small>
                                    💾 تم حفظ {stats.totalMessages} رسالة في {stats.totalChats} محادثة
                                </small>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatbotUI;