import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

function formatBookingError(err) {
  if (!err.response) {
    return "Network error. Please try again.";
  }
  const { status, data } = err.response;
  if (status === 401) {
    return "Your session expired. Please log in again.";
  }
  if (status === 404) {
    return "Booking endpoint not found. Ensure the API is running and up to date.";
  }
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    const messages = [];
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) messages.push(...val.filter(Boolean));
      else if (typeof val === "string") messages.push(val);
    }
    if (messages.length) return messages[0];
  }
  return `Could not complete booking (HTTP ${status}).`;
}

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(true);

  // Data de azi pentru a bloca zilele trecute în calendar
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setProperty(null);
      try {
        const propRes = await api.get(`listings/properties/${id}/`);
        const propData = propRes.data;

        let me = null;
        try {
          const meRes = await api.get("auth/me/");
          me = meRes.data;
        } catch {
          me = null;
        }

        const pid = Number(id);
        if (me?.role === "owner") {
          const myRes = await api.get("listings/my-properties/");
          const ids = (Array.isArray(myRes.data) ? myRes.data : []).map((p) => p.id);
          if (!ids.includes(pid)) {
            if (!cancelled) navigate("/home", { replace: true });
            return;
          }
        } else if (me?.role === "receptionist") {
          const aid = me.assigned_property?.id;
          if (aid == null || aid !== pid) {
            if (!cancelled) navigate("/home", { replace: true });
            return;
          }
        }

        if (!cancelled) setProperty(propData);
      } catch (err) {
        console.error("Eroare la încărcarea proprietății:", err);
        if (!cancelled) setProperty(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Calculăm automat numărul de zile consecutive
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleBooking = async () => {
    const days = calculateDays();
    if (days <= 0) {
      alert("Te rugăm să selectezi o perioadă validă (minim 1 noapte).");
      return;
    }

    try {
      // Endpoint-ul are / la final pentru a evita problemele de redirect în Django
      await api.post("bookings/create/", {
        property: Number(id),
        check_in: startDate,
        check_out: endDate,
        number_of_guests: guests,
        number_of_days: days,
      });
      
      alert("Rezervare efectuată cu succes!");
      navigate("/profile");
    } catch (err) {
      console.error("Booking error:", err.response?.data ?? err.message);
      alert(formatBookingError(err));
    }
  };

  if (loading) return <p style={{ padding: "40px" }}>Se încarcă...</p>;
  if (!property) return <p style={{ padding: "40px" }}>Proprietatea nu a fost găsită.</p>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Înapoi</button>
      
      <div style={styles.content}>
        <div style={styles.imageGallery}>
          {property.images && property.images.length > 0 ? (
            property.images.map((img, idx) => (
              <img
                key={img.id ?? idx}
                src={img.image_url || img.image}
                style={styles.mainImg}
                alt={property.name}
              />
            ))
          ) : (
            <div style={styles.noImage}>Fără imagini disponibile</div>
          )}
        </div>

        <div style={styles.detailsCard}>
          <h1>{property.name}</h1>
          <p><strong>Proprietar:</strong> {property.owner_username || "Informație indisponibilă"}</p>
          <p><strong>Adresă:</strong> {property.address}, {property.city}, {property.country}</p>
          <p><strong>Capacitate:</strong> {property.capacity || "1"} persoane</p>
          
          <p style={{ marginTop: "15px", lineHeight: "1.6" }}>{property.description}</p>
          
          <div style={styles.bookingBox}>
            <h3>Rezervă acum</h3>
            
            <label style={styles.label}>Data Check-in:</label>
            <input 
              type="date" 
              min={today} 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              style={styles.input} 
            />
            
            <label style={styles.label}>Data Check-out:</label>
            <input 
              type="date" 
              min={startDate || today} 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              style={styles.input} 
            />

            {calculateDays() > 0 && (
              <p style={styles.infoText}>Durata șederii: <strong>{calculateDays()} zile</strong></p>
            )}
            
            <label style={styles.label}>Număr persoane (Max: {property.capacity}):</label>
            <input 
              type="number" 
              min="1" 
              max={property.capacity}
              value={guests} 
              onChange={(e) => setGuests(parseInt(e.target.value))} 
              style={styles.input} 
            />
            
            <button 
              onClick={handleBooking} 
              style={{
                ...styles.bookBtn, 
                opacity: (calculateDays() > 0 && guests <= property.capacity) ? 1 : 0.6
              }}
              disabled={calculateDays() <= 0 || guests > property.capacity}
            >
              Confirmă Rezervarea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", maxWidth: "1200px", margin: "0 auto" },
  backBtn: { background: "none", border: "none", color: "#2563eb", cursor: "pointer", marginBottom: "20px", fontSize: "16px" },
  content: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px" },
  mainImg: { width: "100%", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  noImage: { height: "300px", background: "#f3f4f6", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" },
  detailsCard: { background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", height: "fit-content" },
  bookingBox: { marginTop: "25px", padding: "20px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #f1f5f9" },
  label: { display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "600", color: "#374151" },
  input: { display: "block", width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "16px" },
  infoText: { marginBottom: "15px", color: "#2563eb", fontSize: "15px" },
  bookBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", transition: "all 0.2s" }
};