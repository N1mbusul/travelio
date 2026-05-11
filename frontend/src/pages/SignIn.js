import { Link } from "react-router-dom";
import { ADMIN_SITE_URL } from "../api/axios";

export default function SignIn() {
  return (
    <div className="signin-page">
      <div className="signin-card">
        <h1 className="signin-title">Welcome to Travelio</h1>
        <p className="signin-subtitle">Sign in to search properties, save time, and manage your stays.</p>

        <div className="signin-actions">
          <Link to="/login" className="signin-btn signin-btn-primary">
            Login
          </Link>
          <Link to="/register" className="signin-btn signin-btn-secondary">
            Register
          </Link>
        </div>
        <p className="signin-admin-hint">
          Site operators with a staff account can open the{" "}
          <a href={ADMIN_SITE_URL} target="_blank" rel="noopener noreferrer">
            admin panel
          </a>
          .
        </p>
      </div>
    </div>
  );
}
