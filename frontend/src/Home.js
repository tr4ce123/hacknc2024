import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome to Cliffnotes App</h1>
      <p>This is the home page accessible after login.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Home;
