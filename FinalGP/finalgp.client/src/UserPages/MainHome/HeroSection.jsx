import React, { useState, useEffect, useRef } from "react";
import "./Userhome.css";
import logo from "../../assets/logou.png";
import searchIcon from "../../assets/search.png";
import Navbar from "../../components/Navbar";
import bg1 from "../../assets/bg1.jpg";
import bg2 from "../../assets/bg2.jpeg";
import bg3 from "../../assets/bg3.jpeg";
import bg4 from "../../assets/bg4.jpg";
import bg5 from "../../assets/bg5.jpg";
import bg6 from "../../assets/bg6.jpg";
import Lottie from "lottie-react";
import scrollDownAnimation from "../../assets/scroll.json";
import { useNavigate } from "react-router-dom";

// Rotating backgrounds
const backgrounds = [bg1, bg2, bg3, bg4, bg5, bg6];

export default function HeroSection({ searchQuery, setSearchQuery, onSearch, role }) {
    const [currentBgIndex, setCurrentBgIndex] = useState(0);
    const [suggestions, setSuggestions] = useState([]);
    const [inputValue, setInputValue] = useState(searchQuery || "");
    const inputRef = useRef(null);
    const searchBarRef = useRef(null); // Add ref for the search bar
    const navigate = useNavigate();

    // Preload backgrounds
    useEffect(() => {
        backgrounds.forEach(src => new Image().src = src);
    }, []);

    // Cycle background
    useEffect(() => {
        const iv = setInterval(() => {
            setCurrentBgIndex(i => (i + 1) % backgrounds.length);
        }, 3000);
        return () => clearInterval(iv);
    }, []);

    // Handle clicks outside to hide suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setSuggestions([]); // Hide suggestions when clicking outside
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Determine role
    const effectiveRole = role || localStorage.getItem("role") || "";

    // Fetch suggestions
    const fetchSuggestions = async q => {
        if (!q.trim()) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await fetch(
                `https://localhost:7194/api/HomePage/suggestions?Search=${encodeURIComponent(q)}`
            );
            if (!res.ok) throw new Error("Failed to get suggestions");
            const data = await res.json();
            setSuggestions(data);
        } catch (e) {
            console.error("HeroSection: suggestions error:", e);
            setSuggestions([]);
        }
    };

    // Handlers
    const handleChange = e => {
        const v = e.target.value;
        setInputValue(v);
        fetchSuggestions(v);
    };

    const handleKeyDown = e => {
        if (e.key === "Enter") {
            navigate(`/filter-results?search=${encodeURIComponent(inputValue)}`);
            setSuggestions([]);
        }
    };

    const handleSearchClick = () => {
        navigate(`/filter-results?search=${encodeURIComponent(inputValue)}`);
        setSuggestions([]);
    };

    const handleSuggestionClick = item => {
        setInputValue(item);
        navigate(`/filter-results?search=${encodeURIComponent(item)}`);
        setSuggestions([]);
    };

    const handleScrollDown = () => {
        window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    };

    return (
        <div className="hero-section" style={{
            backgroundImage: `url(${backgrounds[currentBgIndex]})`,
            transition: "background-image 1s ease-in-out",
        }}>
            <div className="hero-logo-container">
                <img src={logo} alt="Unistay Logo" className="hero-logo" />
            </div>

            <Navbar />

            {(!effectiveRole || effectiveRole.toLowerCase() === "user") && (
                <div className="search-bar" ref={searchBarRef}>
                    <input
                        type="text"
                        placeholder="Title or Description"
                        className="search-input"
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="search-button" onClick={handleSearchClick}>
                        <img src={searchIcon} alt="Search" className="search-icon" />
                    </button>

                    {suggestions.length > 0 && (
                        <ul className="search-suggestions">
                            {suggestions.map((item, i) => (
                                <li
                                    key={i}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(item)}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <Lottie
                animationData={scrollDownAnimation}
                className="scroll-icon"
                loop
                autoplay
                onClick={handleScrollDown}
            />
        </div>
    );
}