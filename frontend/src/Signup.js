import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { supabase } from "./supabaseClient";
import { useEffect } from "react";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(event, session);
        if (event === "SIGNED_IN" && session) {
          sessionStorage.setItem("auth", "true");
          navigate("/home");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Implement Supabase email/password authentication
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error.message);
    } else {
      sessionStorage.setItem("auth", "true");
      navigate("/home");
    }
  };

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });

    if (error) {
      console.error("Error signing in:", error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-yellow-100 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-yellow-900">
          Sign Up
        </h2>
        <p className="text-center text-yellow-800">
          Please enter your email and password to sign up
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2 bg-yellow-50 rounded-full border border-yellow-300">
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
          <div className="flex items-center space-x-2 bg-yellow-50 rounded-full border border-yellow-300">
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
          <button
            type="submit"
            className="w-full py-2 font-semibold text-yellow-900 bg-yellow-200 rounded-full hover:bg-yellow-300"
          >
            Sign Up
          </button>
          <div className="flex items-center justify-center mt-4">
            <span className="text-yellow-800 mr-2">OR</span>
          </div>
        </form>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center w-full py-2 mt-4 space-x-2 text-white bg-black rounded-full hover:bg-gray-800"
        >
          <img
            src="https://img.icons8.com/color/16/000000/google-logo.png"
            alt="Google icon"
            className="w-5 h-5"
          />
          <span>Sign in with Google</span>
        </button>
        <p className="text-center text-yellow-800">
          Already have an account?{" "}
          <a href="/login" className="text-yellow-600 hover:underline">
            Log In!
          </a>
        </p>
      </div>
    </div>
  );
}

export default Signup;
