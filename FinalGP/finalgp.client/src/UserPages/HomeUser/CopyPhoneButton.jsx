import { useState } from 'react';
import { Copy, Check, Phone } from 'lucide-react';

export default function CopyPhoneButton({ phoneNumber = "لا يوجد رقم هاتف", isLoading = false }) {
    const [copied, setCopied] = useState(false);

    const handleCopyClick = () => {
        if (!phoneNumber || isLoading || phoneNumber === "لا يوجد رقم هاتف") return;

        // نسخ رقم الهاتف إلى الحافظة
        navigator.clipboard.writeText(phoneNumber)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // إعادة الضبط بعد ثانيتين
            })
            .catch(err => {
                console.error('فشل النسخ: ', err);
            });
    };

    return (
        <button
            onClick={handleCopyClick}
            className="contactH-btn call-btn"
            disabled={isLoading || !phoneNumber || phoneNumber === "لا يوجد رقم هاتف"}
            style={{ opacity: isLoading || !phoneNumber || phoneNumber === "لا يوجد رقم هاتف" ? 0.7 : 1 }}
        >
            <Phone size={16} />
            <span>
                {isLoading ? 'جارٍ التحميل...' : phoneNumber || 'لا يوجد رقم هاتف'}
            </span>
            {copied ? (
                <Check size={16} style={{ color: '#4CAF50' }} />
            ) : (
                <Copy size={16} />
            )}
        </button>
    );
}