import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "../Logincomponents/Login.css"; // Import your CSS file for styling"
const GoogleLoginComponent = () => {
    const CLIENT_ID = "1045586362728-26hbv9074uu7iviga3s0sd2echchi589.apps.googleusercontent.com";

    //console.log("Client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
    const handleSuccess = (googleResponse) => {
        const token = googleResponse.credential;
        const user = jwt_decode(token); // Ýß ÊÔÝíÑ ÈíÇäÇÊ ÇáãÓÊÎÏã

        console.log("Google Login Success:", user);
        localStorage.setItem("user", JSON.stringify(user)); // ÍÝÙ ÈíÇäÇÊ ÇáãÓÊÎÏã Ýí ÇáÊÎÒíä ÇáãÍáí
    };

    const handleFailure = (error) => {
        console.error("Google Login Failed:", error);
    };

    return (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
            <GoogleLogin onSuccess={handleSuccess} onError={handleFailure} />
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginComponent;
