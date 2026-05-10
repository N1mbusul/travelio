import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import OwnerDashboard from "../components/OwnerDashboard";
import ReceptionistDashboard from "../components/ReceptionistDashboard";

export default function Home() {
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/");
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setMeLoading(true);
      try {
        const meRes = await api.get("auth/me/");
        if (!mounted) return;
        setMe(meRes.data);
      } catch {
        if (mounted) setMe(null);
      } finally {
        if (mounted) setMeLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const showDiscovery =
    me &&
    me.role !== "owner" &&
    me.role !== "receptionist";

  useEffect(() => {
    if (!showDiscovery) {
      setProperties([]);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    setLoading(true);

    api
      .get("listings/properties/")
      .then((res) => {
        if (mounted) {
          setProperties(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setProperties([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [showDiscovery]);

  const filteredProperties = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const cityValue = city.trim().toLowerCase();
    const countryValue = country.trim().toLowerCase();

    return properties.filter((property) => {
      const nameText = (property.name || "").toLowerCase();
      const cityText = (property.city || "").toLowerCase();
      const countryText = (property.country || "").toLowerCase();
      const descriptionText = (property.description || "").toLowerCase();

      const matchesSearch =
        !searchValue ||
        nameText.includes(searchValue) ||
        cityText.includes(searchValue) ||
        countryText.includes(searchValue) ||
        descriptionText.includes(searchValue);
      const matchesCity = !cityValue || cityText.includes(cityValue);
      const matchesCountry = !countryValue || countryText.includes(countryValue);

      return matchesSearch && matchesCity && matchesCountry;
    });
  }, [properties, search, city, country]);

  const subtitle =
    me?.role === "owner"
      ? "Manage your properties and rooms"
      : me?.role === "receptionist"
        ? "Front desk for your assigned property"
        : "Search and discover your next stay";

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.header}>
          <h1 style={styles.title}>Travelio</h1>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
        <div style={styles.rightButtons}>
          <Link to="/profile" style={styles.profileButton}>
            My Profile
          </Link>
          <button type="button" onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {meLoading ? (
        <p style={styles.status}>Loading…</p>
      ) : me?.role === "owner" ? (
        <OwnerDashboard />
      ) : me?.role === "receptionist" ? (
        <ReceptionistDashboard profile={me} />
      ) : (
        <>
          <div style={styles.filters}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, country..."
              style={styles.input}
            />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Filter by city" style={styles.input} />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Filter by country"
              style={styles.input}
            />
          </div>

          {loading ? (
            <p style={styles.status}>Loading properties...</p>
          ) : filteredProperties.length === 0 ? (
            <p style={styles.status}>No properties matched your search.</p>
          ) : (
            <div style={styles.list}>
              {filteredProperties.map((property) => (
                <article key={property.id} style={styles.card} onClick={() => navigate(`/property/${property.id}`)}>
                  <div style={styles.imageContainer}>
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0].image_url || property.images[0].image}
                        alt={property.name}
                        style={styles.cardImage}
                      />
                    ) : (
                      <div style={styles.placeholderImage}>
                        <span>Fără poză</span>
                      </div>
                    )}
                  </div>

                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{property.name}</h3>
                    <p style={styles.cardMeta}>
                      {property.city || "Unknown city"}, {property.country || "Unknown country"}
                    </p>
                    <p style={styles.cardText}>
                      {property.description ? property.description.substring(0, 80) + "..." : "No description available."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f6f7fb",
    color: "#111827",
  },
  header: {
    marginBottom: "16px",
  },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  title: {
    fontSize: "40px",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#4b5563",
    margin: 0,
  },
  filters: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    minWidth: "220px",
    fontSize: "14px",
  },
  logoutButton: {
    padding: "8px 14px",
    background: "#b91c1c",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  status: {
    color: "#4b5563",
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "14px",
  },
  rightButtons: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  profileButton: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "500",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s",
    cursor: "pointer",
  },
  cardTitle: {
    margin: "0 0 8px 0",
    fontSize: "18px",
  },
  cardMeta: {
    margin: "0 0 8px 0",
    color: "#374151",
    fontSize: "14px",
  },
  cardText: {
    margin: 0,
    color: "#4b5563",
    fontSize: "14px",
  },
  imageContainer: {
    width: "100%",
    height: "160px",
    background: "#e5e7eb",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#d1d5db",
    color: "#6b7280",
    fontSize: "14px",
  },
  cardContent: {
    padding: "14px",
  },
};
