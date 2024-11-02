// src/Login.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import GoogleAuth from "./GoogleAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // const CLIENT_ID =
  //   "942733539949-p4svlgoif7doutrll8gru20vu4b558i5.apps.googleusercontent.com";

  // useEffect(() => {
  //   window.gapi.load("auth2", () => {
  //     window.gapi.auth2.init({
  //       client_id: CLIENT_ID,
  //     });
  //   });
  // }, []);

  const handleGoogleSignIn = async () => {
    const auth2 = window.gapi.auth2.getAuthInstance();
    try {
      const googleUser = await auth2.signIn();
      const idToken = googleUser.getAuthResponse().id_token;

      // Send the ID token to the backend
      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (response.ok) {
        console.log("Login Successful");
        navigate("/home");
      } else {
        console.error("Login Failed");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/home");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-yellow-100 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-yellow-900">
          Login
        </h2>
        <p className="text-center text-yellow-800">
          Please enter your Login and your Password
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2 bg-yellow-50 rounded-md border border-yellow-300">
            <FaUser className="ml-3 text-yellow-900" />
            <input
              type="email"
              className="w-full px-4 py-2 text-yellow-900 placeholder-yellow-500 bg-transparent focus:outline-none"
              placeholder="Username or Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2 bg-yellow-50 rounded-md border border-yellow-300">
            <FaLock className="ml-3 text-yellow-900" />
            <input
              type="password"
              className="w-full px-4 py-2 text-yellow-900 placeholder-yellow-500 bg-transparent focus:outline-none"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="text-right">
            <a href="#" className="text-sm text-yellow-800 hover:underline">
              Forgot password?
            </a>
          </div>
          <button
            type="submit"
            className="w-full py-2 font-semibold text-yellow-900 bg-yellow-200 rounded-md hover:bg-yellow-300"
          >
            Login
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center w-full py-2 mt-4 space-x-2 text-yellow-900 bg-black rounded-md hover:bg-gray-800"
          >
            <img
              src="https://img.icons8.com/color/16/000000/google-logo.png"
              alt="Google icon"
            />
            <span className="text-white">Or, sign-in with Google</span>
          </button>
        </form>
        <p className="text-center text-yellow-800">
          Not a member yet?{" "}
          <a href="#" className="text-yellow-600 hover:underline">
            Register!
          </a>
        </p>
        <GoogleAuth></GoogleAuth>
      </div>
    </div>
  );
}

export default Login;
