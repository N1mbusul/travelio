import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Properties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await api.get("auth/me/");
        const role = meRes.data?.role;
        if (role === "owner" || role === "receptionist") {
          if (!cancelled) {
            setBlocked(true);
            navigate("/home", { replace: true });
          }
          return;
        }
      } catch {
        /* continue — treat as unrestricted if /me fails */
      }

      try {
        const res = await api.get("listings/properties/");
        if (!cancelled) {
          setProperties(Array.isArray(res.data) ? res.data : []);
          setBlocked(false);
        }
      } catch {
        if (!cancelled) setProperties([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (blocked) {
    return null;
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>Properties</h2>

      {properties.map((p) => (
        <div
          key={p.id}
          style={{
            padding: "16px",
            marginBottom: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>{p.name}</h3>
          <p style={{ margin: 0, color: "#4b5563" }}>{p.city}</p>
        </div>
      ))}
    </div>
  );
}
