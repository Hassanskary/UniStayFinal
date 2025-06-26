import React, { useState, useEffect, useContext } from 'react';
import './detailsH.css';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Navbar from "../../components/Navbar";
import defaultAvatar from '../../assets/default-avatar.png';
import Lottie from "lottie-react";
import editAnimation from "../../assets/black.json";
import deleteAnimation from "../../assets/black-bin.json";
import ReportModal from '../Report/ReportModal';
import LocationMap from "../../components/Map/LocationMap";
import { CompareHomesContext } from "../../hooks/CompareHomesContext";
import CopyPhoneButton from "./CopyPhoneButton";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// إنشاء مثيل Axios مع رأس Authorization
const axiosInstance = axios.create({
    baseURL: 'https://localhost:7194/api',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});

const RoomDetails = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const { comparedHomes, addHomeToCompare, removeHome } = useContext(CompareHomesContext);

    // — user & auth state —
    const [userId, setUserId] = useState("");
    const [userRole, setUserRole] = useState("");
    const [currentUsername, setCurrentUsername] = useState("");

    // — loading & error states —
    const [loading, setLoading] = useState(true);
    const [homeDetailsLoading, setHomeDetailsLoading] = useState(true);
    const [error, setError] = useState(null);

    // — rating —
    const [ratingLoading, setRatingLoading] = useState(false);
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);

    // — report modal —
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // — photos gallery —
    const [photos, setPhotos] = useState([]);
    const [allPhotosCount, setAllPhotosCount] = useState(0);
    const [featuredImage, setFeaturedImage] = useState(0);

    // — comments state —
    const [comments, setComments] = useState([]);
    const [editingComment, setEditingComment] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // — new comment state —
    const [newComment, setNewComment] = useState({ text: '' });

    // — user’s rating state —
    const [userRating, setUserRating] = useState(0);
    const [hasRated, setHasRated] = useState(false);

    // — save button state —
    const [isSaved, setIsSaved] = useState(false);

    // — home details state —
    const [homeDetails, setHomeDetails] = useState(null);

    // Hardcoded data (ideally should come from API)
    const [ratingBreakdown] = useState({
        cleanliness: 4.9,
        accuracy: 4.7,
        communication: 4.8,
        location: 4.6,
        checkIn: 4.9,
        value: 4.7
    });

    // Facility icons mapping
    const facilityIcons = {
        'Air Conditioning': '❄️',
        'WiFi': '📶',
        'Washing Machine': '🧼',
        'Television': '📺',
        'Refrigerator': '🧊',
        'Fan': '🌀',
        'Heater': '🔥',
        'Kettle': '☕',
        'Desk': '🖥️',
        'Wardrobe': '👗',
        'Reception': '🛎️',
        'Water Filter': '💧',
        'Bathroom': '🛁',
        'Kitchen': '🍳',
        'Gym': '🏋️'
    };


    // إضافة هذا ال useEffect الجديد
    useEffect(() => {
        if (userId && homeId) {
            fetchUserRating();
        }
    }, [userId, homeId]);

    // التحقق من حالة الـ Save بناءً على الـ comparedHomes
    useEffect(() => {
        if (homeDetails && comparedHomes) {
            const isHomeSaved = comparedHomes.some((h) => h.id === homeDetails.id);
            setIsSaved(isHomeSaved);
        }
    }, [homeDetails, comparedHomes]);

    // Debug homeDetails state
    useEffect(() => {
        console.log('Current homeDetails state:', homeDetails);
    }, [homeDetails]);

    // Functions
    const fetchAverageRating = async () => {
        if (!homeId) return;
        try {
            const response = await axios.get(`https://localhost:7194/api/Rating/average/${homeId}`);
            setAverageRating(response.data.averageRating);
            setTotalRatings(127); // Hardcoded; consider fetching from API
        } catch (err) {
            console.error('Error fetching average rating:', err);
        }
    };

    // تعديل دالة fetchHomeDetails لجلب الصور مع التفاصيل ومعلومات المالك
    const fetchHomeDetails = async () => {
        setHomeDetailsLoading(true);
        try {
            const [homeResponse, photosResponse, ownerResponse] = await Promise.all([
                axios.get(`https://localhost:7194/api/DetailsHome/${homeId}`),
                axios.get(`https://localhost:7194/api/DetailsHome/photos/${homeId}`),
                axios.get(`https://localhost:7194/api/Chat/owner/${homeId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            const homeData = {
                ...homeResponse.data,
                id: parseInt(homeId, 10),
                photos: photosResponse.data.map(p => p.url || p),
                ownerId: ownerResponse.data.ownerId // إضافة ownerId من الاستجابة
            };
            console.log('Home details response with photos and owner:', homeData);
            setHomeDetails(homeData);
            setPhotos(homeData.photos); // تحديث حالة الصور للعرض
            setError(null);
        } catch (err) {
            console.error('Error fetching home details, photos, or owner:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError('Failed to load home details, photos, or owner information. Please try again.');
            setHomeDetails(null);
        } finally {
            setHomeDetailsLoading(false);
        }
    };

    // دالة لتحويل homeDetails للشكل المطلوب
    const formatHomeForSave = (homeDetails) => {
        return {
            id: homeDetails.id,
            title: homeDetails.title,
            city: homeDetails.address ? homeDetails.address.split(',')[0].trim() : 'Unknown',
            rate: homeDetails.rate || 0,
            photos: homeDetails.photos || []
        };
    };

    const handleCommentChange = (e) => {
        setNewComment({ text: e.target.value });
    };

    const handleEditCommentChange = (e) => {
        setEditCommentText(e.target.value);
    };

    const handleRatingChange = async (value) => {
        setUserRating(value);
        await submitRating(value);
    };

    const submitRating = async (score) => {
        if (!userId || !homeId) {
            toast.error("⚠️ Please login!");
            return;
        }
        try {
            setRatingLoading(true);
            console.log(`Submitting rating ${score} for user ${userId} and home ${homeId}`);

            const payload = { homeId: parseInt(homeId, 10), userId: userId.toString(), score };
            const response = await axios.post('https://localhost:7194/api/Rating', payload);

            console.log('Rating submission response:', response.data);
            setAverageRating(response.data.avgRating || averageRating);
            setHasRated(true);
            setUserRating(score); // ضمان تحديث الحالة المحلية بالقيمة الجديدة

            // تخزين التقييم في localStorage كحل احتياطي إضافي
            localStorage.setItem(`rating_${userId}_${homeId}`, score.toString());

            console.log(`Rating saved successfully. New user rating: ${score}`);
            setError(null);
        } catch (err) {
            console.error('Error submitting rating:', err);
            toast.error("⚠️ Failed to submit rating!");
        } finally {
            setRatingLoading(false);
        }
    };

    const API_BASE_URL = 'https://localhost:7194/api';
    const fetchUserRating = async () => {
        if (!userId || !homeId) return;

        try {
            console.log(`جلب تقييم المستخدم ${userId} للمنزل ${homeId}`);
            setLoading(true);

            // استخدام مسار API الصحيح الذي أضفناه للواجهة الخلفية
            const response = await axios.get(`${API_BASE_URL}/Rating/user/${userId}/home/${homeId}`);

            console.log('استجابة API تقييم المستخدم:', response.data);

            if (response.data && response.data.score !== undefined) {
                console.log(`تعيين تقييم المستخدم إلى ${response.data.score}`);
                setUserRating(response.data.score);
                setHasRated(true);
            } else {
                console.log('لم يتم العثور على بيانات التقييم في الاستجابة');
                setUserRating(0);
                setHasRated(false);
            }
        } catch (err) {
            console.error('خطأ في جلب تقييم المستخدم:', err);

            // لا نعتبر 404 خطأ لأنه يعني أن المستخدم لم يقم بالتقييم بعد
            if (err.response?.status === 404) {
                console.log('المستخدم ليس لديه تقييم سابق (404)');
                setUserRating(0);
                setHasRated(false);
            } else {
                setError('فشل في تحميل تقييمك السابق');
                toast.error("⚠️ Failed to load your rate!");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        if (!homeId) return;
        try {
            setLoading(true);
            const response = await axios.get(`https://localhost:7194/api/Comment/home/${homeId}`);
            const fetchedComments = response.data.map((c) => ({
                id: c.commentId || c.id,
                homeId: c.homeId,
                userId: c.userId,
                userName: c.userName || "user",
                user: {
                    name: c.userName || "user",
                    avatar: defaultAvatar,
                    date: new Date(c.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                },
                rating: 5,
                text: c.content || c.text,
                rawDate: c.date
            }));
            console.log('Fetched comments IDs:', fetchedComments.map(c => c.id));
            setComments(fetchedComments);
            setError(null);
        } catch (err) {
            console.error('Error fetching comments:', err.response?.data || err.message);
            toast.error("⚠️ Failed to load comments!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        let storedUsername = localStorage.getItem('username');
        const token = localStorage.getItem('token');

        function parseJwt(token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        }

        if (!storedUsername && token) {
            const decodedToken = parseJwt(token);
            storedUsername = decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
            const role = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decodedToken['role'] || '';
            setUserRole(role);
            localStorage.setItem('username', storedUsername);
        }

        console.log('Stored userId:', storedUserId);
        console.log('Stored username:', storedUsername);

        if (storedUserId) {
            setUserId(storedUserId);
            if (homeId) {
                fetchUserRating();
            }
        }
        if (storedUsername) setCurrentUsername(storedUsername);
        if (storedUsername) setCurrentUsername(storedUsername);

        fetchComments();
        fetchAverageRating();
        fetchHomeDetails();

        axios.get(`https://localhost:7194/api/DetailsHome/photos/all/${homeId}`)
            .then(res => {
                const count = res.data.map(p => typeof p === 'string' ? p : p.url || '').filter(u => u).length;
                setAllPhotosCount(count);
            })
            .catch(err => console.error("Error loading all photos count:", err));

        const commentConnection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7194/commentHub")
            .withAutomaticReconnect()
            .build();

        commentConnection.start()
            .then(() => console.log("Comment SignalR Connected"))
            .catch(err => console.error("Comment SignalR Connection Error: ", err));

        commentConnection.on("ReceiveCommentUpdate", (commentId, updatedHomeId, content, commentUserId, userName, date) => {
            if (updatedHomeId.toString() === homeId.toString()) {
                setComments(prev => {
                    const existingCommentIndex = prev.findIndex(c => c.id === commentId);
                    const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    const newCommentObj = {
                        id: commentId,
                        homeId: updatedHomeId,
                        userId: commentUserId,
                        userName: userName || currentUsername || "زائر",
                        user: {
                            name: userName || currentUsername || "زائر",
                            avatar: defaultAvatar,
                            date: formattedDate,
                        },
                        rating: 5,
                        text: content,
                        rawDate: date
                    };
                    if (existingCommentIndex !== -1) {
                        return prev.map(c => c.id === commentId ? newCommentObj : c);
                    } else {
                        return [newCommentObj, ...prev];
                    }
                });
            }
        });

        commentConnection.on("ReceiveCommentDelete", (commentId, deletedHomeId) => {
            if (deletedHomeId.toString() === homeId.toString()) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        });

        const ratingConnection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7194/ratingHub")
            .withAutomaticReconnect()
            .build();

        ratingConnection.start()
            .then(() => console.log("Rating SignalR Connected"))
            .catch(err => console.error("Rating SignalR Connection Error: ", err));

        ratingConnection.on("ReceiveRatingUpdate", (updatedHomeId, newAvgRating) => {
            if (updatedHomeId.toString() === homeId.toString()) {
                setAverageRating(newAvgRating);
            }
        });

        return () => {
            commentConnection.stop();
            ratingConnection.stop();
        };
    }, [homeId]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.text.trim()) {
            toast.warning("Comment should not be empty!");
            return;
        }
        if (!userId) {
            toast.warning("Please login to comment!");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const payload = { homeId: parseInt(homeId, 10), userId: userId.toString(), content: newComment.text };
            const response = await axiosInstance.post('https://localhost:7194/api/Comment', payload);
            const newCommentFromApi = response.data;
            console.log('New comment API response:', newCommentFromApi);
            await fetchComments();
            setNewComment({ text: '' });
        } catch (err) {
            console.error('Error posting comment:', err.response?.data || err.message);
            setError(`Failed to send comment: ${err.response?.data?.title || 'Please try again!'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!userId) {
            toast.warning("Please login to delete comment!");
            return;
        }
        try {
            setLoading(true);
            await axios.delete(`https://localhost:7194/api/Comment/${commentId}?userId=${userId}`);
            setComments(prev => prev.filter(c => c.id !== commentId));
            setError(null);
        } catch (err) {
            console.error('Error deleting comment:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                toast.warning("You can only delete your own comments");
            } else if (err.response?.status === 404) {
                toast.warning("Comment not found");
            } else {
                toast.warning('Failed to delete comment: ' + (err.response?.data?.errors?.commentId?.[0] || 'Please try again!'));
            }
        } finally {
            setLoading(false);
        }
    };

    const startEditComment = (comment) => {
        setEditingComment(comment.id);
        setEditCommentText(comment.text);
    };

    const cancelEditComment = () => {
        setEditingComment(null);
        setEditCommentText('');
    };

    const saveEditComment = async (commentId) => {
        if (!editCommentText.trim()) {
            toast.warning("Comment should not be empty");
            return;
        }
        if (!userId) {
            toast.warning("Please login to edit comment!");
            return;
        }
        try {
            setEditLoading(true);
            setError(null);
            const payload = { homeId: parseInt(homeId, 10), userId: userId.toString(), content: editCommentText };
            await axios.put(`https://localhost:7194/api/Comment/${commentId}`, payload);
            setComments(prev =>
                prev.map(c =>
                    c.id === commentId ? { ...c, text: editCommentText, rawDate: new Date().toISOString() } : c
                )
            );
            setEditingComment(null);
            setEditCommentText('');
        } catch (err) {
            console.error('Error updating comment:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                toast.warning("You can only edit your own comments");
            } else if (err.response?.status === 404) {
                toast.warning("Comment not found");
            } else {
                toast.error('Failed to update comment: ' + (err.response?.data?.errors?.commentId?.[0] || 'Please try again!'));
            }
        } finally {
            setEditLoading(false);
        }
    };

    const toggleSave = () => {
        if (!userId || userId === "guest") {
            setError('Please login to save homes');
            return;
        }
        if (isSaved) {
            removeHome(homeDetails.id);
            setIsSaved(false);
        } else {
            const formattedHome = formatHomeForSave(homeDetails);
            addHomeToCompare(formattedHome);
            setIsSaved(true);
        }
    };

    const navigateToRooms = () => navigate(`/Allrooms/${homeId}`);
    const handleChatNow = () => {
        if (!userId) {
            toast.error("⚠️ Please login to chat!");
            return;
        }
        if (!homeDetails) {
            toast.error("⚠️ Home details are still loading!");
            return;
        }
        if (!homeDetails.ownerId) {
            toast.error("⚠️ Owner information not available!");
            return;
        }
        if (userId === homeDetails.ownerId.toString()) {
            toast.error("⚠️ You cannot chat with yourself!");
            return;
        }
        console.log("Navigating to chat with ownerId:", homeDetails.ownerId);
        navigate(`/Chat/${homeDetails.ownerId}`);
    };

    const isCommentOwner = (comment) => {
        if (!userId || !comment.userId) return false;
        return String(userId) === String(comment.userId);
    };

    const openReportModal = () => setIsReportModalOpen(true);
    const closeReportModal = () => setIsReportModalOpen(false);
    const handleReportSuccess = () => { };

    return (
        <div className="details-page-body">
            <div className="detailsH-container">
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
                <Navbar />
                <div className="deH-header">
                    <h1 className="deH-title">{homeDetails?.title || (homeDetailsLoading ? 'Loading...' : 'No title available')}</h1>
                    <div className="deH-actions">
                        <button className="report-btn" onClick={openReportModal}>
                            <i className="icon-report"></i> Report
                        </button>
                        <button className={`save-btn ${isSaved ? 'saved' : ''}`} onClick={toggleSave}>
                            <i className={`icon-heart ${isSaved ? 'filled' : ''}`}></i> Save
                        </button>
                    </div>
                </div>
                <div className="image-gallery">
                    <div className="featured-image">
                        {photos.length > 0 ? (
                            <img src={photos[featuredImage]} alt={`Photo ${featuredImage + 1}`} />
                        ) : (
                            <div>Loading images...</div>
                        )}
                    </div>
                    <div className="gallery-grid">
                        {photos.slice(0, 4).map((url, idx) => ( // عرض 4 صور فقط كمعاينة
                            <div
                                key={idx}
                                className={`gallery-item ${idx === featuredImage ? 'selected' : ''}`}
                                onClick={() => setFeaturedImage(idx)}
                            >
                                <img src={url} alt={`Photo ${idx + 1}`} />
                            </div>
                        ))}
                        {allPhotosCount > 4 && ( // إظهار الزر إذا كان هناك أكثر من 4 صور
                            <button className="show-all-photos" onClick={() => navigate(`/all-photos/${homeId}`)}>
                                Show All Photos ({allPhotosCount})
                            </button>
                        )}
                    </div>
                </div>
                <div className="rooms-navigation">
                    <p className="rooms-navigation-text">You can see rooms from here</p>
                    <button className="buttons-detailsH navigate-rooms-btn" onClick={navigateToRooms}>
                        View All Rooms
                    </button>
                </div>

                <div className="rating-section">
                    <div className="overall-rating">
                        <div className="rating-star">★ {averageRating.toFixed(1)}</div>
                    </div>
                    <div className="user-rating-section">
                        <h3>Rate Home</h3>
                        {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                        <div className="rating-selector">
                            <span>Your Rate:</span>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span
                                        key={star}
                                        className={`star ${userRating >= star ? 'selected' : ''}`}
                                        onClick={() => handleRatingChange(star)}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            {ratingLoading && <span className="rating-loading">loading ...</span>}
                            {hasRated && !ratingLoading && <span className="rating-success">Thank you!</span>}
                        </div>
                    </div>
                </div>

                <div className="description-section">
                    <h2>Description</h2>
                    <p>{homeDetails?.description || (homeDetailsLoading ? 'Loading description...' : 'No description available')}</p>
                    <p><strong>Floor: </strong>    {homeDetails?.floor ?? 'N/A'}</p>

                </div>
                <div className="facilities-section-h">
                    <h2>Facilities</h2>
                    <div className="facilities-grid-h">
                        {homeDetails?.facilities?.length > 0 ? (
                            homeDetails.facilities.map((name, i) => (
                                <div className="facility-item-h" key={i}>
                                    <span className="facility-icon-h">{facilityIcons[name] || '❓'}</span>
                                    <span className="facility-name-h">{name}</span>
                                </div>
                            ))
                        ) : (
                            <p>{homeDetailsLoading ? 'Loading facilities...' : 'No facilities available'}</p>
                        )}
                    </div>
                </div>

                <div className="location-section">
                    <h2>Location</h2>
                    <div className="location-container">
                        <div className="location-info">
                            <p className="location-address">
                                {homeDetails?.address || (homeDetailsLoading ? 'Loading address...' : 'No address available')}
                            </p>
                            <p className="location-description">
                                {homeDetails?.locationDescription || (homeDetailsLoading ? 'Loading description...' : 'No location details available')}
                            </p>
                            {!homeDetailsLoading && homeDetails?.latitude && homeDetails?.longitude && (
                                <div className="location-actions">
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${homeDetails.latitude},${homeDetails.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="directions-button"
                                    >
                                        Get Directions
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="location-map">
                            {homeDetailsLoading ? (
                                <div className="map-placeholder">
                                    <div className="map-text">Loading map...</div>
                                </div>
                            ) : homeDetails?.latitude && homeDetails?.longitude ? (
                                <LocationMap
                                    lat={homeDetails.latitude}
                                    lng={homeDetails.longitude}
                                />
                            ) : (
                                <div className="map-placeholder">
                                    <div className="map-text">Location not available</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="contactH-section">
                    <h2>Contact Host</h2>
                    <div className="contactH-buttons">
                        <button
                            className="buttons-detailsH chat-btn"
                            onClick={handleChatNow}
                            disabled={homeDetailsLoading || !homeDetails?.ownerId || userId === homeDetails?.ownerId?.toString()}
                        >
                            <i className="icon-chat"></i> Chat Now
                        </button>
                        <CopyPhoneButton
                            phoneNumber={homeDetails?.ownerPhoneNumber}
                            isLoading={homeDetailsLoading}
                        />
                    </div>
                </div>

                <div className="commentsH-section">
                    <h2>Guest Reviews</h2>
                    <div className="commentsH-summary">
                        <div className="commentsH-rating">★ {averageRating.toFixed(1)}</div>
                        <div className="commentsH-count">{comments.length} reviews</div>
                    </div>
                    <div className="add-commentsH-form">
                        <h3>Add Comment</h3>
                        {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                        <form onSubmit={handleSubmitComment}>
                            <div className="commentsH-input-container">
                                <textarea
                                    className="commentsH-input"
                                    placeholder="Share your opinion..."
                                    value={newComment.text}
                                    onChange={handleCommentChange}
                                    required
                                />
                            </div>
                            <button type="submit" className="buttons-detailsH commentsH-btn" disabled={loading}>
                                {loading ? "Loading..." : "Submit"}
                            </button>
                        </form>
                    </div>
                    <div className="comments-list">
                        {loading && comments.length === 0 ? (
                            <div className="loading-comments">loading comments...</div>
                        ) : comments.length > 0 ? (
                            comments.map(c => (
                                <div className="comment-item" key={c.id}>
                                    <div className="comment-header">
                                        <div className="comment-user">
                                            <img src={defaultAvatar} alt="User avatar" className="comment-avatar" />
                                            <div className="comment-user-info">
                                                <div className="comment-username">{c.user.name}</div>
                                                <div className="comment-date">{c.user.date}</div>
                                            </div>
                                        </div>
                                        {isCommentOwner(c) && (
                                            <div className="comment-actions">
                                                <button
                                                    className="comment-edit-btn"
                                                    onClick={() => startEditComment(c)}
                                                    disabled={editingComment === c.id}
                                                >
                                                    <Lottie animationData={editAnimation} style={{ width: 30, height: 30 }} />
                                                </button>
                                                <button
                                                    className="comment-delete-btn"
                                                    onClick={() => handleDeleteComment(c.id)}
                                                    disabled={loading}
                                                >
                                                    <Lottie animationData={deleteAnimation} style={{ width: 30, height: 30 }} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {editingComment === c.id ? (
                                        <div className="edit-comment-form">
                                            <textarea
                                                className="commentsH-input edit-input"
                                                value={editCommentText}
                                                onChange={handleEditCommentChange}
                                                required
                                            />
                                            <div className="edit-actions">
                                                <button
                                                    className="buttons-detailsH save-editcomment-btn"
                                                    onClick={() => saveEditComment(c.id)}
                                                    disabled={editLoading}
                                                >
                                                    {editLoading ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    className="buttons-detailsH cancel-editcomment-btn"
                                                    onClick={cancelEditComment}
                                                    disabled={editLoading}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="comment-text">{c.text}</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="no-comments">No Comments yet, Be first one!</div>
                        )}
                    </div>
                </div>

                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={closeReportModal}
                    homeId={homeId}
                    onSuccess={handleReportSuccess}
                    axiosInstance={axiosInstance}
                />
            </div>
        </div>
    );
};

export default RoomDetails;