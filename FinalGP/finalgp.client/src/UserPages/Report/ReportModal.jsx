import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReportModal.css';
import Lottie from 'lottie-react';
import submitAnimation from '../../assets/submit-animation.json';
import editAnimation from "../../assets/black.json";
import deleteAnimation from "../../assets/black-bin.json";

const ReportModal = ({ isOpen, onClose, homeId, onSuccess }) => {
    const [userId, setUserId] = useState('');
    const [reportText, setReportText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [userReports, setUserReports] = useState([]);
    const [editingReport, setEditingReport] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
            fetchUserReports(storedUserId);
        }
    }, [homeId, isOpen]);

    const token = localStorage.getItem('token');
    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    const fetchUserReports = async (userId) => {
        if (!userId || !homeId) return;
        setLoading(true);
        try {
            const response = await axios.get(
                `https://localhost:7194/api/Report/UserReports/${homeId}/${userId}`,
                config // Add Authorization header
            );
            if (response.status === 200) {
                setUserReports(response.data || []);
            } else {
                setError('Failed to fetch reports. Please try again.');
            }
        } catch (err) {
            console.error('Error fetching user reports:', err);
            setError(
                err.response?.status === 401
                    ? 'Authentication failed. Please log in again.'
                    : err.response?.data?.message || 'Failed to fetch reports.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!reportText.trim()) {
            setError('Report reason cannot be empty');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const payload = { userId, reason: reportText };
            await axios.post(
                `https://localhost:7194/api/Report/ReportHome/${homeId}`,
                payload,
                config
            );

            setSuccess(true);
            setReportText('');
            fetchUserReports(userId);
            if (onSuccess) onSuccess();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error submitting report:', err);
            setError(
                err.response?.data?.message || 'Failed to submit report. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleEditReport = (report) => {
        setEditingReport(report.reportId);
        setEditText(report.reason);
    };

    const cancelEdit = () => {
        setEditingReport(null);
        setEditText('');
    };

    const saveEditedReport = async (reportId) => {
        if (!editText.trim()) {
            setError('Report reason cannot be empty');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await axios.put(
                `https://localhost:7194/api/Report/EditReport/${reportId}`,
                { newReason: editText },
                config
            );

            setUserReports((prev) =>
                prev.map((r) =>
                    r.reportId === reportId ? { ...r, reason: editText } : r
                )
            );
            setEditingReport(null);
            setEditText('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error editing report:', err);
            setError(
                err.response?.data?.message || 'Failed to edit report. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        setLoading(true);
        setError(null);
        try {
            await axios.delete(
                `https://localhost:7194/api/Report/DeleteReport/${reportId}`,
                config
            );

            setUserReports((prev) => prev.filter((r) => r.reportId !== reportId));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error deleting report:', err);
            setError(
                err.response?.data?.message || 'Failed to delete report. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="report-modal-overlay">
            <div className="report-modal">
                <div className="report-modal-header">
                    <h2>Report Home</h2>
                    <button className="close-modal-btn" onClick={onClose}>
                        <p>✖</p>
                    </button>
                </div>

                {error && <div className="report-error-message">{error}</div>}
                {success && (
                    <div className="report-success-message">
                        <Lottie animationData={submitAnimation} style={{ width: 40, height: 40 }} />
                        Action completed successfully!
                    </div>
                )}

                {/* New Report Form */}
                <form onSubmit={handleSubmitReport} className="report-form">
                    <div className="form-group">
                        <label htmlFor="reportReason">Reason for Report:</label>
                        <textarea
                            id="reportReason"
                            className="report-textarea"
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Please describe why you are reporting this home..."
                            rows={4}
                            required
                        />
                    </div>
                    <button type="submit" className="report-submit-btn" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                </form>

                {/* User's Previous Reports */}
                {userReports.length > 0 && (
                    <div className="user-reports-section">
                        <h3>Your Previous Reports</h3>
                        <div className="user-reports-list">
                            {userReports.map((report) => {
                                const statusValue = report.status ?? '';
                                const statusClass =
                                    typeof statusValue === 'string'
                                        ? statusValue.toLowerCase()
                                        : String(statusValue).toLowerCase();

                                return (
                                    <div key={report.reportId} className="user-report-item">
                                        {editingReport === report.reportId ? (
                                            <div className="edit-report-form">
                                                <textarea
                                                    className="report-textarea"
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    rows={3}
                                                />
                                                <div className="edit-actions">
                                                    <button
                                                        className="report-submit-btn save-editrepoo-btn"
                                                        onClick={() => saveEditedReport(report.reportId)}
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        className="cancel-editreportt-btn"
                                                        onClick={cancelEdit}
                                                        disabled={loading}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="report-content">
                                                <p>{report.reason}</p>
                                                <span className="report-date">
                                                    {new Date(report.date).toLocaleDateString()}
                                                </span>

                                                <div className="status-and-actions">
                                                    <span className={`report-status ${statusClass}`}>
                                                        {report.status === "Pending" ? 'Pending' : report.status === "Resolved" ? 'Resolved' : 'Rejected'}
                                                    </span>

                                                    {report.status === "Pending" && (
                                                        <div className="report-actions-inline">
                                                            <button
                                                                className="edit-report-btn icon-btn"
                                                                onClick={() => handleEditReport(report)}
                                                            >
                                                                <Lottie
                                                                    animationData={editAnimation}
                                                                    style={{ width: 30, height: 30 }}
                                                                />
                                                            </button>
                                                            <button
                                                                className="delete-report-btn icon-btn"
                                                                onClick={() => handleDeleteReport(report.reportId)}
                                                                disabled={loading}
                                                            >
                                                                <Lottie
                                                                    animationData={deleteAnimation}
                                                                    style={{ width: 30, height: 30 }}
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportModal;