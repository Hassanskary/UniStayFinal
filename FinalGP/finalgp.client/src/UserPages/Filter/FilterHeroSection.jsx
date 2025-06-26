import React, { useState, useEffect, useRef } from "react";
import "./FilterPage.css";
import logo from "../../assets/logou.png";
import searchIcon from "../../assets/search.png";
import Navbar from "../../components/Navbar";
import bg1 from "../../assets/bg1.jpg";
import bg2 from "../../assets/bg2.jpeg";
import bg3 from "../../assets/bg3.jpeg";
import bg4 from "../../assets/bg4.jpg";
import bg5 from "../../assets/bg5.jpg";
import bg6 from "../../assets/bg6.jpg";
import { useNavigate } from "react-router-dom";

const backgrounds = [bg1, bg2, bg3, bg4, bg5, bg6];

export default function FilterHeroSection({ searchQuery, setSearchQuery }) {
    const [currentBgIndex, setCurrentBgIndex] = useState(0);
    const [suggestions, setSuggestions] = useState([]);
    const [inputValue, setInputValue] = useState(searchQuery || "");
    const inputRef = useRef(null);
    const searchBarRef = useRef(null); // Ref for the search bar container
    const navigate = useNavigate();

    // Preload backgrounds
    useEffect(() => {
        backgrounds.forEach((src) => new Image().src = src);
    }, []);

    // Cycle background
    useEffect(() => {
        const iv = setInterval(() => {
            setCurrentBgIndex((i) => (i + 1) % backgrounds.length);
        }, 3000);
        return () => clearInterval(iv);
    }, []);

    // Fetch suggestions
    const fetchSuggestions = async (q) => {
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
            console.error("FilterHeroSection: suggestions error:", e);
            setSuggestions([]);
        }
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Handlers
    const handleChange = (e) => {
        const v = e.target.value;
        setInputValue(v);
        fetchSuggestions(v);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            navigate(`/filter-results?search=${encodeURIComponent(inputValue)}`);
            setSuggestions([]);
            setSearchQuery(inputValue);
        }
    };

    const handleSearchClick = () => {
        navigate(`/filter-results?search=${encodeURIComponent(inputValue)}`);
        setSuggestions([]);
        setSearchQuery(inputValue);
    };

    const handleSuggestionClick = (item) => {
        setInputValue(item);
        navigate(`/filter-results?search=${encodeURIComponent(item)}`);
        setSuggestions([]);
        setSearchQuery(item);
    };

    return (
        <div
            className="filter-hero-section"
            style={{
                backgroundImage: `url(${backgrounds[currentBgIndex]})`,
                transition: "background-image 1s ease-in-out",
            }}
        >
            <div className="logo logo-uh">
                <img src={logo} alt="Unistay Logo" className="logo-uh" />
            </div>

            <Navbar />

            <div className="filter-hero-content">
                <div className="filter-search-bar-container">
                    <div className="filter-search-bar" ref={searchBarRef}>
                        <input
                            type="text"
                            placeholder="Search location or title"
                            className="filter-search-input"
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="filter-search-button" onClick={handleSearchClick}>
                            <img src={searchIcon} alt="Search" className="filter-search-icon" />
                        </button>
                        {suggestions.length > 0 && (
                            <ul className="filter-search-suggestions">
                                {suggestions.map((item, i) => (
                                    <li
                                        key={i}
                                        className="filter-suggestion-item"
                                        onClick={() => handleSuggestionClick(item)}
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}