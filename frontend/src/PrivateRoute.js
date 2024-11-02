import React from "react";
import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem("auth") === "true";

  return isAuthenticated ? children : <Navigate to="/" />;
}

export default PrivateRoute;
