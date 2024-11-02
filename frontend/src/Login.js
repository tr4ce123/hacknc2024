import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (email === "user@example.com" && password === "password") {
      localStorage.setItem("auth", "true");
      navigate("/home");
    } else {
      alert("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      <h2>Login!</h2>
      <form onSubmit={handleSubmit}>{/* Form fields */}</form>
    </div>
  );
}

export default Login;
