import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { ADMIN_SITE_URL } from "../api/axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");

    try {
      const res = await api.post("auth/login/", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      localStorage.setItem("username", username.trim());

      navigate("/home");
    } catch (err) {
      const apiMessage = err?.response?.data?.error;
      setError(apiMessage || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <p className="auth-subtitle">Access your account to search and manage properties.</p>

        <input className="auth-input" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
        <input
          className="auth-input"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="button" className="auth-button" onClick={login}>
          Login
        </button>
        {error ? <p className="auth-error">{error}</p> : null}

        <p className="auth-footnote">
          New to Travelio? <Link to="/register">Create account</Link>
        </p>
        <div className="auth-portal-links" role="navigation" aria-label="Other entry points">
          <span className="auth-portal-label">Also:</span>
          <a href={ADMIN_SITE_URL} target="_blank" rel="noopener noreferrer">
            Django admin (staff)
          </a>
        </div>
      </div>
    </div>
  );
}
