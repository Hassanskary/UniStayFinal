import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import "./login.css";
import logo from "../assets/logo3.png";

// Parse JWT token
function parseJwt(token) {
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    try {
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Login: Failed to parse JWT:", e);
        return null;
    }
}

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Handle email/password login
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("https://localhost:7194/api/AccountUser/Login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            console.log("API Response:", data);
            if (response.ok) {
                const token = data.token?.token || data.token;
                let role = data.role;
                if (token) {
                    localStorage.setItem("token", token);
                    try {
                        const decodedToken = parseJwt(token);
                        const userId =
                            decodedToken["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                            decodedToken.sub ||
                            decodedToken.id;
                        if (userId) {
                            localStorage.setItem("userId", userId);
                            console.log("Login: Set userId:", userId);
                        } else {
                            console.error("Login: No userId found in token");
                        }
                        if (!role) {
                            role =
                                decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
                                decodedToken.role;
                        }
                    } catch (decodeError) {
                        console.error("Login: Error decoding token:", decodeError);
                    }
                    if (role) {
                        localStorage.setItem("role", role);
                        console.log("Login: Set role:", role);
                        Swal.fire({
                            icon: "success",
                            title: "Login Successful!",
                            text: "Redirecting to your dashboard...",
                            showConfirmButton: false,
                            timer: 1500,
                        }).then(() => {
                            switch (role.toLowerCase()) {
                                case "admin":
                                case "owner":
                                    navigate("/HeroSection");
                                    break;
                                case "user":
                                    navigate("/");
                                    break;
                                default:
                                    navigate("/default-home");
                                    break;
                            }
                        });
                    } else {
                        setError("Role:nth-child(3) Role not found in response or token.");
                    }
                } else {
                    setError("Token not found in response.");
                }
            } else {
                if (response.status >= 500) {
                    setError("Login failed. Please check your credentials.");
                } else {
                    if (data.errors && (data.errors.Password || data.errors.Email)) {
                        setError("Invalid email or password.");
                    } else {
                        setError(data.message || "Login failed. Please check your credentials.");
                    }
                }
            }
        } catch (error) {
            console.error("Login: Error logging in:", error);
            setError("An error occurred while logging in. Please try again.");
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;
            console.log("Google ID Token:", idToken);
            const response = await fetch("https://localhost:7194/api/Account/GoogleLogin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken: idToken }),
            });
            if (!response.ok) {
                const errorText = await response.text(); // Get the raw response text
                throw new Error(`Google login failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            console.log("Google Login Response:", data);
            if (response.ok) {
                const token = data.token?.token || data.token;
                let role = data.role;
                if (token) {
                    localStorage.setItem("token", token);
                    try {
                        const decodedToken = parseJwt(token);
                        const userId =
                            decodedToken["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
                            decodedToken.sub ||
                            decodedToken.id;
                        if (userId) {
                            localStorage.setItem("userId", userId);
                            console.log("Google Login: Set userId:", userId);
                        } else {
                            console.error("Google Login: No userId found in token");
                        }
                        if (!role) {
                            role =
                                decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
                                decodedToken.role;
                        }
                    } catch (decodeError) {
                        console.error("Google Login: Error decoding token:", decodeError);
                    }
                    if (role) {
                        localStorage.setItem("role", role);
                        console.log("Google Login: Set role:", role);
                        Swal.fire({
                            icon: "success",
                            title: "Google Login Successful!",
                            text: "Redirecting to your dashboard...",
                            showConfirmButton: false,
                            timer: 1500,
                        }).then(() => {
                            switch (role.toLowerCase()) {
                                case "admin":
                                case "owner":
                                    navigate("/HeroSection");
                                    break;
                                case "user":
                                    navigate("/");
                                    break;
                                default:
                                    navigate("/default-home");
                                    break;
                            }
                        });
                    } else {
                        setError("Role not found in response or token.");
                    }
                } else {
                    setError("Token not found in response.");
                }
            }
        } catch (error) {
            console.error("Google Login: Error:", error);
            setError("An error occurred during Google login. Please try again.");
        }
    };

    return (
        <GoogleOAuthProvider clientId="215693797532-gqo9s8f998jgdb5r3ingol2bmm4h5est.apps.googleusercontent.com">
           
            <div className="login-container">
                <div className="login-form">
                    <img src={logo} alt="Logo" className="logo" />
                    <h2>Log in</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="Email address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        {error && <div className="error">{error}</div>}
                        <button type="submit" className="button-33">
                            LOGIN
                        </button>

                        <div className="google-login">
                            <GoogleLogin
                                onSuccess={handleGoogleLogin}
                                onError={() => {
                                    setError("Google login failed. Please try again.");
                                    console.error("Google Login: Failed to authenticate with Google.");
                                }}
                                text="signin_with"
                                shape="rectangular"
                                theme="outline"
                                width="100%"
                            />
                        </div>

                        <p>
                            New member? <Link to="/SelectUserType">Register here</Link>
                        </p>
                    </form>
                </div>
                <div className="login-image"></div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;