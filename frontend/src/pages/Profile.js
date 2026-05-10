import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function bookingStatusLabel(status) {
  if (status === "confirmata") return "Confirmed";
  if (status === "asteptare") return "Pending";
  if (status === "anulata") return "Cancelled";
  if (status === "finalizata") return "Completed";
  return status || "—";
}

/** Primary label for guests: reflects check-in / checkout timestamps when present. */
function guestBookingDisplay(booking) {
  if (booking.checked_out_at || booking.status === "finalizata") {
    return "Completed";
  }
  if (booking.checked_in_at) {
    return "Checked in";
  }
  return bookingStatusLabel(booking.status);
}

function canGuestCancel(booking) {
  if (booking.checked_in_at) return false;
  if (booking.status === "anulata" || booking.status === "finalizata") return false;
  return true;
}

function statusBadgeStyle(booking) {
  if (booking.status === "anulata") {
    return { backgroundColor: "#fee2e2", color: "#991b1b" };
  }
  if (booking.checked_out_at || booking.status === "finalizata") {
    return { backgroundColor: "#dcfce7", color: "#166534" };
  }
  if (booking.checked_in_at) {
    return { backgroundColor: "#dbeafe", color: "#1e40af" };
  }
  if (booking.status === "confirmata") {
    return { backgroundColor: "#dcfce7", color: "#166534" };
  }
  return { backgroundColor: "#fef9c3", color: "#854d0e" };
}

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const meRes = await api.get("auth/me/");
        if (cancelled) return;
        setProfile(meRes.data);

        const bookingsRes = await api.get("bookings/my-bookings/");
        if (cancelled) return;
        setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      } catch (e) {
        console.error("Profile load error:", e);
        if (!cancelled) {
          setProfile(null);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const username = profile?.username || localStorage.getItem("username") || "User";

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelId(bookingId);
    try {
      const res = await api.post(`bookings/${bookingId}/cancel/`);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...res.data } : b)));
    } catch (e) {
      alert(e?.response?.data?.detail || "Could not cancel this booking.");
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <Link to="/home" style={styles.backLink}>
          ← Back to home
        </Link>
        <div style={styles.userCircle}>{username[0]?.toUpperCase() || "?"}</div>
        <h1 style={styles.title}>Hello, {username}!</h1>
        <p style={styles.subtitle}>Your account and bookings</p>
        {profile?.role && (
          <p style={styles.roleBadge}>
            Role: <strong>{profile.role}</strong>
          </p>
        )}
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.mainContent}>
          <h2 style={styles.sectionTitle}>My bookings</h2>
          {loading ? (
            <p>Loading…</p>
          ) : bookings.length === 0 ? (
            <div style={styles.emptyState}>
              <p>You have no bookings yet.</p>
              <Link to="/home" style={styles.primaryBtn}>
                Search stays
              </Link>
            </div>
          ) : (
            <div style={styles.bookingList}>
              {bookings.map((booking) => (
                <div key={booking.id} style={styles.bookingCard}>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.propertyTitle}>{booking.property_name}</h3>
                    <p style={styles.cardDetail}>
                      <strong>Dates:</strong> {booking.start_date} → {booking.end_date}
                    </p>
                    <p style={styles.cardDetail}>
                      <strong>Total:</strong> {booking.total_price}
                    </p>
                    {(booking.checked_in_at || booking.checked_out_at) && (
                      <p style={styles.cardDetailMuted}>
                        {booking.checked_in_at ? (
                          <>
                            <strong>Checked in:</strong>{" "}
                            {new Date(booking.checked_in_at).toLocaleString()}
                          </>
                        ) : null}
                        {booking.checked_in_at && booking.checked_out_at ? " · " : null}
                        {booking.checked_out_at ? (
                          <>
                            <strong>Checked out:</strong>{" "}
                            {new Date(booking.checked_out_at).toLocaleString()}
                          </>
                        ) : null}
                      </p>
                    )}
                    {canGuestCancel(booking) && (
                      <button
                        type="button"
                        style={styles.cancelBtn}
                        disabled={cancelId !== null}
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        {cancelId === booking.id ? "Cancelling…" : "Cancel booking"}
                      </button>
                    )}
                  </div>
                  <div style={{ ...styles.statusBadge, ...statusBadgeStyle(booking) }}>
                    {guestBookingDisplay(booking)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>Account</h2>
          <div style={styles.infoBox}>
            <p style={styles.infoItem}>
              <strong>Username:</strong> {username}
            </p>
            {profile?.email && (
              <p style={styles.infoItem}>
                <strong>Email:</strong> {profile.email}
              </p>
            )}
            {profile?.role && (
              <p style={styles.infoItem}>
                <strong>Role:</strong> {profile.role}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    padding: "40px",
    background: "#f6f7fb",
    fontFamily: "system-ui, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  headerSection: { textAlign: "center", marginBottom: "40px" },
  backLink: {
    display: "block",
    marginBottom: "20px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600",
    textAlign: "left",
  },
  userCircle: {
    width: "72px",
    height: "72px",
    background: "#2563eb",
    color: "white",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    margin: "0 auto 16px",
    fontWeight: "700",
  },
  title: { fontSize: "28px", margin: "0 0 8px 0" },
  subtitle: { color: "#6b7280", margin: 0 },
  roleBadge: { color: "#4b5563", fontSize: "14px", marginTop: "8px" },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: "28px",
    alignItems: "start",
  },
  mainContent: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  sidebar: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "16px",
    paddingBottom: "10px",
    borderBottom: "2px solid #e5e7eb",
  },
  bookingList: { display: "flex", flexDirection: "column", gap: "12px" },
  bookingCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    gap: "12px",
    flexWrap: "wrap",
  },
  cardInfo: { flex: "1 1 220px" },
  propertyTitle: { margin: "0 0 6px 0", fontSize: "17px" },
  cardDetail: { margin: "4px 0", fontSize: "14px", color: "#4b5563" },
  cardDetailMuted: { margin: "8px 0 0 0", fontSize: "13px", color: "#6b7280" },
  cancelBtn: {
    marginTop: "12px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    cursor: "pointer",
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    alignSelf: "flex-start",
  },
  emptyState: { textAlign: "center", padding: "28px 0", color: "#6b7280" },
  primaryBtn: {
    display: "inline-block",
    marginTop: "12px",
    background: "#2563eb",
    color: "white",
    padding: "10px 18px",
    borderRadius: "8px",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  infoBox: { fontSize: "14px" },
  infoItem: { marginBottom: "10px" },
};

export default Profile;
