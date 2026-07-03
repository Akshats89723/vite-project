import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthScreen from "../components/AuthScreen";

export default function AuthPage({ defaultView = "login" }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("pc_token")) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  const onLogin = (user) => {
    navigate("/app/dashboard");
  };

  return <AuthScreen onLogin={onLogin} defaultView={defaultView} />;
}
