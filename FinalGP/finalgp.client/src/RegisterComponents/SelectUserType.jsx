
import React from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/jsonn.json";
import "./SelectUserType.css"; // استخدمنا نفس CSS الخاص بـ Login

const SelectUserType = () => {
    const navigate = useNavigate();

    return (
        <div className="login-container">
            {/* الجزء الخاص بالفورم */}
            <div className="login-form">
                <Lottie animationData={animationData} className="logo" />
                <h2>Owner or User?</h2>
                <div className="button-group">
                    <button className="button-33" onClick={() => navigate("/RegisterUser")}>User</button>
                    <button className="button-33" onClick={() => navigate("/RegisterOwner")}>Owner</button>
                </div>
            </div>

            {/* الجزء الخاص بالصورة الخلفية */}
            <div className="login-image"></div>
        </div>
    );
};

export default SelectUserType;


