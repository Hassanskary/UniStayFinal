import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, Polygon, useLoadScript } from "@react-google-maps/api";
import governoratesCoords from "../../utils/governoratesCoords";
import governorateNameMap from "../../utils/governorateNameMap";
import geojson from "../../data/egypt-governorates.json";

const libraries = ["places", "geometry"];
const mapContainerStyle = {
    width: "100%",
    height: "400px",
};

const defaultCenter = { lat: 30.0444, lng: 31.2357 };

const MapPicker = ({ onLocationSelect, initialCity }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: "AIzaSyDBfwTdU3K78y2llS6TtBHp9MF04134cwA",
        libraries,
    });

    const [selectedLocation, setSelectedLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [polygonCoords, setPolygonCoords] = useState([]);
    const polygonRef = useRef(null);

    useEffect(() => {
        if (initialCity && governoratesCoords[initialCity]) {
            setMapCenter(governoratesCoords[initialCity]);

            const governorateGeoName = governorateNameMap[initialCity];
            const feature = geojson.features.find(f => f.properties.name === governorateGeoName);

            if (feature) {
                const coords = feature.geometry.coordinates[0][0].map(coord => ({
                    lat: coord[1],
                    lng: coord[0],
                }));
                setPolygonCoords(coords);
            } else {
                setPolygonCoords([]);
            }
        }
    }, [initialCity]);

    const handleClick = (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const clicked = new window.google.maps.LatLng(lat, lng);

        if (polygonRef.current) {
            const inside = window.google.maps.geometry.poly.containsLocation(clicked, polygonRef.current);
            if (!inside) {
                alert("Please pick a location inside the selected city.");
                return;
            }
        }

        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng);
    };

    if (loadError) return <p>Œÿ√ ›Ì  Õ„Ì· «·Œ—Ìÿ…</p>;
    if (!isLoaded) return <p> Õ„Ì· «·Œ—Ìÿ…...</p>;

    return (
        <div>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={selectedLocation || mapCenter}
                onClick={handleClick}
            >
                {selectedLocation && <Marker position={selectedLocation} />}
                {polygonCoords.length > 0 && (
                    <Polygon
                        path={polygonCoords}
                        options={{
                            fillColor: "#FF0000",
                            fillOpacity: 0.1,
                            strokeColor: "#FF0000",
                            strokeOpacity: 0.8,
                        }}
                        onLoad={(polygon) => {
                            polygonRef.current = polygon;
                        }}
                    />
                )}
            </GoogleMap>
        </div>
    );
};

export default MapPicker;
