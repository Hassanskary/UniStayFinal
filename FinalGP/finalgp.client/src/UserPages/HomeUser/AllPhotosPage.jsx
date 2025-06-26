import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AllPhotosPage.css'; // ملف CSS للتنسيق
import Navbar from '../../components/Navbar';

const AllPhotosPage = () => {
    const { homeId } = useParams();
    const navigate = useNavigate();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllPhotos = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`https://localhost:7194/api/DetailsHome/photos/all/${homeId}`);
                const fetchedPhotos = response.data.map(p => typeof p === 'string' ? p : p.url || '').filter(u => u);
                setPhotos(fetchedPhotos);
                setError(null);
            } catch (err) {
                console.error('Error fetching all photos:', err);
                setError('Failed to load photos. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllPhotos();
    }, [homeId]);

    return (
        <div className="all-photos-page-container">
        <div className="all-photos-page">
            <Navbar />
            <div className="all-photos-container">
                <h2>All Photos</h2>
                <button className="back-btn" onClick={() => navigate(-1)}>
                    Back
                </button>
                {loading ? (
                    <div>Loading photos...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : photos.length > 0 ? (
                    <div className="photos-grid">
                        {photos.map((photo, idx) => (
                            <div key={idx} className="photo-item">
                                <img src={photo} alt={`Photo ${idx + 1}`} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>No photos available.</div>
                )}
            </div>
            </div>
        </div>
    );
};

export default AllPhotosPage;