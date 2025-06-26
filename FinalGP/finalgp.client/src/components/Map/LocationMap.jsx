
import React, { useState } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

const libraries = ["places"];
const mapContainerStyle = {
    width: "100%",
    height: "400px",
};

const LocationMap = ({ lat, lng, address = "Property Location" }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: "AIzaSyDBfwTdU3K78y2llS6TtBHp9MF04134cwA", // Replace with your API key
        libraries,
    });

    const [showInfo, setShowInfo] = useState(false);

    // Default to Cairo coordinates if no valid coordinates provided
    const defaultCenter = { lat: 30.0444, lng: 31.2357 };
    const center = lat && lng ? { lat, lng } : defaultCenter;

    if (loadError) return <div className="map-error">Error loading map</div>;
    if (!isLoaded) return <div className="map-loading">Loading map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={lat && lng ? 15 : 10}
            center={center}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            }}
        >
            {lat && lng && (
                <>
                    <Marker
                        position={{ lat, lng }}
                        onClick={() => setShowInfo(true)}
                    />
                    {showInfo && (
                        <InfoWindow
                            position={{ lat, lng }}
                            onCloseClick={() => setShowInfo(false)}
                        >
                            <div style={{ padding: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px' }}>Property Location</h4>
                                <p style={{ margin: '5px 0 0', fontSize: '12px' }}>{address}</p>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: '8px',
                                        color: '#1976D2',
                                        fontSize: '12px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Get Directions
                                </a>
                            </div>
                        </InfoWindow>
                    )}
                </>
            )}
        </GoogleMap>
    );
};

export default LocationMap;
