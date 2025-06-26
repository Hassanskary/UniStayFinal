//export default JsNotification;
import React, { useEffect } from "react";
import "./JsNotification.css";
import PropTypes from "prop-types";

// الأنواع المدعومة للنوتيفيكيشن
const notificationTypes = {
    success: "success",
    error: "error",
    warning: "warning",
    info: "info",
};

const JsNotification = ({
    message,
    onClose,
    type = notificationTypes.info, // نوع افتراضي
    duration = 3000, // مدة العرض
    position = "top-right", // مكان النوتيفيكيشن
    ariaLabel = "إشعار", // لتحسين Accessibility
}) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [onClose, duration]);

    // تحديد كلاس النوتيفيكيشن بناءً على النوع والموقع
    const notificationClass = `js-notification js-notification--${type} js-notification--${position}`;

    return (
        <div
            className={notificationClass}
            role="alert" // لدعم Screen Readers
            aria-live="assertive"
            aria-label={ariaLabel}
        >
            <div className="js-notification-content">
                <span className={`js-notification-icon js-notification-icon--${type}`}>
                    {getIcon(type)} {/* عرض أيقونة حسب النوع */}
                </span>
                <p className="js-notification-message">{message}</p>
                <button
                    className="js-notification-close"
                    onClick={onClose}
                    aria-label="إغلاق الإشعار"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};

// دالة لتحديد الأيقونة بناءً على نوع النوتيفيكيشن
const getIcon = (type) => {
    switch (type) {
        case notificationTypes.success:
            return "✔";
        case notificationTypes.error:
            return "✖";
        case notificationTypes.warning:
            return "⚠";
        case notificationTypes.info:
            return "ℹ";
        default:
            return null;
    }
};

// PropTypes لتحديد أنواع الـ Props
JsNotification.propTypes = {
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    type: PropTypes.oneOf(Object.values(notificationTypes)),
    duration: PropTypes.number,
    position: PropTypes.oneOf([
        "top-right",
        "top-left",
        "bottom-right",
        "bottom-left",
    ]),
    ariaLabel: PropTypes.string,
};

export default JsNotification;