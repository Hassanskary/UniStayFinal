import React, { useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const libraries = ["places"];
const mapContainerStyle = {
    width: "100%",
    height: "400px",
};
const center = { lat: 30.0444, lng: 31.2357 }; // Ê”ÿ «·ﬁ«Â—… ﬂ„Êﬁ⁄ «› —«÷Ì

const MapPicker = ({ onLocationSelect }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: "AIzaSyDBfwTdU3K78y2llS6TtBHp9MF04134cwA", // «” »œ·Â« »„› «Õﬂ
        libraries,
    });

    const [selectedLocation, setSelectedLocation] = useState(null);

    if (loadError) return <p>Œÿ√ ›Ì  Õ„Ì· «·Œ—Ìÿ…</p>;
    if (!isLoaded) return <p> Õ„Ì· «·Œ—Ìÿ…...</p>;

    return (
        <div>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={selectedLocation || center}
                onClick={(event) => {
                    const lat = event.latLng.lat();
                    const lng = event.latLng.lng();
                    setSelectedLocation({ lat, lng });
                    onLocationSelect(lat, lng);
                }}
            >
                {selectedLocation && <Marker position={selectedLocation} />}
            </GoogleMap>
        </div>
    );
};

export default MapPicker;
