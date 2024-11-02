import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

function GoogleAuth() {
    const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
        console.error('Error signing in:', error.message);
      } else {
        sessionStorage.setItem("auth", "true");
        navigate("/home");
      }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="flex items-center justify-center w-full py-2 mt-4 space-x-2 text-white bg-red-600 rounded-md hover:bg-red-700"
    >
      <img
        src="https://img.icons8.com/color/16/000000/google-logo.png"
        alt="Google icon"
        className="w-5 h-5"
      />
      <span>Sign in with Google</span>
    </button>
  );
}

export default GoogleAuth;
