// AuthCallback.js
import { useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Parse the URL fragment
      const params = new URLSearchParams(hash.substring(1)); // Remove the '#' character
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const expires_in = params.get("expires_in");
      const token_type = params.get("token_type");

      if (access_token && refresh_token) {
        // Set the session
        supabase.auth
          .setSession({
            access_token,
            refresh_token,
          })
          .then(({ data, error }) => {
            if (error) {
              console.error("Error setting session:", error.message);
            } else {
              // Session is set; navigate to the home page
              navigate("/home");
            }
          });
      } else {
        console.error("Access token or refresh token not found in URL.");
        navigate("/login");
      }
    } else {
      console.error("No URL fragment found.");
      navigate("/login");
    }
  }, []);

  return <div>Loading...</div>;
}

export default AuthCallback;
