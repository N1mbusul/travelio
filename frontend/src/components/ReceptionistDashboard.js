import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const ROOM_STATUSES = [
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "maintenance", label: "Maintenance" },
];

function bookingStatusLabel(status) {
  if (status === "confirmata") return "Confirmed";
  if (status === "asteptare") return "Pending";
  if (status === "anulata") return "Cancelled";
  if (status === "finalizata") return "Completed";
  return status || "—";
}

export default function ReceptionistDashboard({ profile }) {
  const [receptionBookings, setReceptionBookings] = useState([]);
  const [receptionRooms, setReceptionRooms] = useState([]);
  const [receptionLoading, setReceptionLoading] = useState(false);
  const [bookingActionId, setBookingActionId] = useState(null);
  const [roomSavingId, setRoomSavingId] = useState(null);

  const loadReceptionDesk = useCallback(async () => {
    const propId = profile?.assigned_property?.id;
    if (!propId) return;
    setReceptionLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get("bookings/reception/"),
        api.get(`listings/properties/${propId}/rooms/`),
      ]);
      setReceptionBookings(Array.isArray(bRes.data) ? bRes.data : []);
      setReceptionRooms(Array.isArray(rRes.data) ? rRes.data : []);
    } catch (e) {
      console.error(e);
      setReceptionBookings([]);
      setReceptionRooms([]);
    } finally {
      setReceptionLoading(false);
    }
  }, [profile?.assigned_property?.id]);

  useEffect(() => {
    if (profile?.assigned_property?.id) {
      loadReceptionDesk();
    } else {
      setReceptionBookings([]);
      setReceptionRooms([]);
    }
  }, [profile, loadReceptionDesk]);

  const handleBookingConfirm = async (bid) => {
    setBookingActionId(bid);
    try {
      await api.post(`bookings/${bid}/confirm/`);
      await loadReceptionDesk();
    } catch (e) {
      alert(e?.response?.data?.detail || "Could not confirm.");
    } finally {
      setBookingActionId(null);
    }
  };

  const handleBookingCheckIn = async (bid) => {
    setBookingActionId(bid);
    try {
      await api.post(`bookings/${bid}/check-in/`);
      await loadReceptionDesk();
    } catch (e) {
      alert(e?.response?.data?.detail || "Could not check in.");
    } finally {
      setBookingActionId(null);
    }
  };

  const handleBookingCheckOut = async (bid) => {
    setBookingActionId(bid);
    try {
      await api.post(`bookings/${bid}/check-out/`);
      await loadReceptionDesk();
    } catch (e) {
      alert(e?.response?.data?.detail || "Could not check out.");
    } finally {
      setBookingActionId(null);
    }
  };

  const setRoomAvailability = async (roomId, status) => {
    setRoomSavingId(roomId);
    try {
      await api.patch(`listings/rooms/${roomId}/`, { availability_status: status });
      await loadReceptionDesk();
    } catch (e) {
      alert(e?.response?.data?.detail || "Could not update room.");
    } finally {
      setRoomSavingId(null);
    }
  };

  if (!profile?.assigned_property) {
    return (
      <section style={s.wrap}>
        <h2 style={s.h2}>Front desk</h2>
        <p style={s.muted}>
          You are not assigned to a property yet. Ask an owner to assign your account.
        </p>
      </section>
    );
  }

  return (
    <section style={s.wrap}>
      <h2 style={s.h2}>Front desk</h2>
      <p style={s.intro}>
        <strong>{profile.assigned_property.name}</strong> — {profile.assigned_property.city},{" "}
        {profile.assigned_property.country}
      </p>

      {receptionLoading ? (
        <p>Loading…</p>
      ) : (
        <>
          <h3 style={s.h3}>Bookings</h3>
          {receptionBookings.length === 0 ? (
            <p style={s.muted}>No bookings yet.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Guest</th>
                    <th style={s.th}>Room</th>
                    <th style={s.th}>Dates</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receptionBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={s.td}>{b.guest_username}</td>
                      <td style={s.td}>{b.room_label}</td>
                      <td style={s.td}>
                        {b.check_in_date} → {b.check_out_date}
                      </td>
                      <td style={s.td}>
                        {bookingStatusLabel(b.booking_status)}
                        {b.checked_in_at ? <span style={s.small}> · Checked in</span> : null}
                        {b.checked_out_at ? <span style={s.small}> · Checked out</span> : null}
                      </td>
                      <td style={s.td}>
                        <div style={s.actions}>
                          {b.booking_status === "asteptare" ? (
                            <button
                              type="button"
                              style={s.btnSm}
                              disabled={bookingActionId !== null}
                              onClick={() => handleBookingConfirm(b.id)}
                            >
                              Confirm
                            </button>
                          ) : null}
                          {b.booking_status === "confirmata" && !b.checked_in_at ? (
                            <button
                              type="button"
                              style={s.btnSm}
                              disabled={bookingActionId !== null}
                              onClick={() => handleBookingCheckIn(b.id)}
                            >
                              Check in
                            </button>
                          ) : null}
                          {b.checked_in_at && !b.checked_out_at ? (
                            <button
                              type="button"
                              style={s.btnPrimary}
                              disabled={bookingActionId !== null}
                              onClick={() => handleBookingCheckOut(b.id)}
                            >
                              Check out
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={{ ...s.h3, marginTop: "24px" }}>Rooms</h3>
          <p style={s.muted}>Set availability to maintenance when a room must not be booked.</p>
          {receptionRooms.length === 0 ? (
            <p style={s.muted}>No rooms configured.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Room</th>
                    <th style={s.th}>Capacity</th>
                    <th style={s.th}>Price / night</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Set status</th>
                  </tr>
                </thead>
                <tbody>
                  {receptionRooms.map((room) => (
                    <tr key={room.id}>
                      <td style={s.td}>{room.room_type}</td>
                      <td style={s.td}>{room.capacity}</td>
                      <td style={s.td}>{room.price_per_night}</td>
                      <td style={s.td}>{room.availability_status}</td>
                      <td style={s.td}>
                        <select
                          style={s.select}
                          value={room.availability_status}
                          disabled={roomSavingId === room.id}
                          onChange={(e) => setRoomAvailability(room.id, e.target.value)}
                        >
                          {ROOM_STATUSES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const s = {
  wrap: { marginTop: "8px" },
  h2: {
    fontSize: "20px",
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "2px solid #e5e7eb",
  },
  h3: { fontSize: "16px", margin: "0 0 10px 0" },
  intro: { fontSize: "15px", marginBottom: "16px", color: "#374151" },
  muted: { color: "#6b7280", fontSize: "14px", marginBottom: "12px" },
  small: { color: "#6b7280", fontSize: "12px" },
  tableWrap: { overflowX: "auto", marginBottom: "8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "520px" },
  th: {
    textAlign: "left",
    padding: "8px",
    borderBottom: "2px solid #e5e7eb",
    color: "#374151",
  },
  td: { padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  actions: { display: "flex", flexWrap: "wrap", gap: "6px" },
  btnSm: {
    padding: "6px 10px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
  btnPrimary: {
    padding: "6px 10px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
  select: {
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "13px",
    maxWidth: "160px",
  },
};
