import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 30.0444, 
    lng: 31.2357
};

function MapFilterComponent({ onLocationSelect }) {
    const [selectedLocation, setSelectedLocation] = useState(null);

    const handleMapClick = (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setSelectedLocation({ lat, lng });
        onLocationSelect({ lat, lng });
    };

    return (
        <LoadScript
            googleMapsApiKey="AIzaSyDBfwTdU3K78y2llS6TtBHp9MF04134cwA" 
            onError={(error) => console.error("LoadScript Error: ", error)}
        >
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={selectedLocation || defaultCenter}
                zoom={10}
                onClick={handleMapClick}
            >
                {selectedLocation && <Marker position={selectedLocation} />}
            </GoogleMap>
        </LoadScript>
    );
}

export default MapFilterComponent;