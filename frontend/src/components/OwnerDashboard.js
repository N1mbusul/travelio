import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const ROOM_STATUSES = [
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "maintenance", label: "Maintenance" },
];

const emptyRoomForm = {
  room_type: "",
  capacity: 1,
  price_per_night: "",
  availability_status: "available",
  description: "",
};

function formatAssignError(payload) {
  if (!payload) return "Could not assign receptionist.";
  const { detail } = payload;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) =>
        typeof entry === "string" ? entry : entry?.string || String(entry),
      )
      .join(" ");
  }
  return "Could not assign receptionist.";
}

export default function OwnerDashboard() {
  const [ownerProperties, setOwnerProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [newRoomByProperty, setNewRoomByProperty] = useState({});
  const [roomSavingId, setRoomSavingId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editRoomForm, setEditRoomForm] = useState(emptyRoomForm);
  const [receptionistByProperty, setReceptionistByProperty] = useState({});
  const [assignUsername, setAssignUsername] = useState({});
  const [assignErrorByProperty, setAssignErrorByProperty] = useState({});

  const loadOwnerProperties = useCallback(async () => {
    setPropertiesLoading(true);
    try {
      const res = await api.get("listings/my-properties/");
      setOwnerProperties(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setOwnerProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwnerProperties();
  }, [loadOwnerProperties]);

  useEffect(() => {
    if (!ownerProperties.length) return undefined;
    let cancelled = false;
    (async () => {
      const next = {};
      for (const p of ownerProperties) {
        try {
          const r = await api.get(`listings/properties/${p.id}/receptionist/`);
          if (!cancelled) next[p.id] = r.data.receptionist;
        } catch {
          if (!cancelled) next[p.id] = null;
        }
      }
      if (!cancelled) setReceptionistByProperty(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerProperties]);

  const updateNewRoomForm = (propertyId, patch) => {
    setNewRoomByProperty((prev) => ({
      ...prev,
      [propertyId]: { ...(prev[propertyId] || emptyRoomForm), ...patch },
    }));
  };

  const getNewRoomForm = (propertyId) => ({
    ...emptyRoomForm,
    ...(newRoomByProperty[propertyId] || {}),
  });

  const handleAddRoom = async (propertyId) => {
    const form = getNewRoomForm(propertyId);
    if (!form.room_type.trim() || !form.price_per_night) {
      alert("Please enter room type and price per night.");
      return;
    }
    const price = parseFloat(form.price_per_night);
    if (Number.isNaN(price) || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    setRoomSavingId(`new-${propertyId}`);
    try {
      await api.post(`listings/properties/${propertyId}/rooms/`, {
        room_type: form.room_type.trim(),
        capacity: parseInt(form.capacity, 10) || 1,
        price_per_night: price.toFixed(2),
        availability_status: form.availability_status,
        description: form.description?.trim() || "",
      });
      setNewRoomByProperty((prev) => ({ ...prev, [propertyId]: { ...emptyRoomForm } }));
      await loadOwnerProperties();
    } catch (e) {
      console.error(e?.response?.data);
      alert("Could not add room.");
    } finally {
      setRoomSavingId(null);
    }
  };

  const startEditRoom = (room) => {
    setEditingRoom(room.id);
    setEditRoomForm({
      room_type: room.room_type,
      capacity: room.capacity,
      price_per_night: String(room.price_per_night),
      availability_status: room.availability_status,
      description: room.description || "",
    });
  };

  const cancelEditRoom = () => {
    setEditingRoom(null);
    setEditRoomForm(emptyRoomForm);
  };

  const saveEditRoom = async () => {
    if (!editingRoom) return;
    const price = parseFloat(editRoomForm.price_per_night);
    if (Number.isNaN(price) || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    setRoomSavingId(editingRoom);
    try {
      await api.patch(`listings/rooms/${editingRoom}/`, {
        room_type: editRoomForm.room_type.trim(),
        capacity: parseInt(editRoomForm.capacity, 10) || 1,
        price_per_night: price.toFixed(2),
        availability_status: editRoomForm.availability_status,
        description: editRoomForm.description?.trim() || "",
      });
      cancelEditRoom();
      await loadOwnerProperties();
    } catch (e) {
      alert("Could not update room.");
    } finally {
      setRoomSavingId(null);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Delete this room?")) return;
    setRoomSavingId(roomId);
    try {
      await api.delete(`listings/rooms/${roomId}/`);
      if (editingRoom === roomId) cancelEditRoom();
      await loadOwnerProperties();
    } catch (e) {
      alert("Could not delete room.");
    } finally {
      setRoomSavingId(null);
    }
  };

  const assignReceptionist = async (propertyId) => {
    const u = (assignUsername[propertyId] || "").trim();
    if (!u) {
      setAssignErrorByProperty((prev) => ({
        ...prev,
        [propertyId]: "Enter the receptionist username.",
      }));
      return;
    }
    setAssignErrorByProperty((prev) => ({ ...prev, [propertyId]: "" }));
    try {
      await api.post(`listings/properties/${propertyId}/receptionist/`, { username: u });
      const r = await api.get(`listings/properties/${propertyId}/receptionist/`);
      setReceptionistByProperty((prev) => ({ ...prev, [propertyId]: r.data.receptionist }));
      setAssignUsername((prev) => ({ ...prev, [propertyId]: "" }));
      setAssignErrorByProperty((prev) => ({ ...prev, [propertyId]: "" }));
    } catch (e) {
      const msg = formatAssignError(e?.response?.data);
      setAssignErrorByProperty((prev) => ({ ...prev, [propertyId]: msg }));
    }
  };

  const unassignReceptionist = async (propertyId) => {
    if (!window.confirm("Remove the receptionist from this property?")) return;
    try {
      await api.delete(`listings/properties/${propertyId}/receptionist/`);
      setReceptionistByProperty((prev) => ({ ...prev, [propertyId]: null }));
    } catch (e) {
      alert("Could not remove assignment.");
    }
  };

  return (
    <section>
      <div style={styles.toolbar}>
        <h2 style={styles.title}>Your properties</h2>
        <Link to="/create-property" style={styles.addLink}>
          Add property
        </Link>
      </div>

      {propertiesLoading ? (
        <p style={styles.muted}>Loading…</p>
      ) : ownerProperties.length === 0 ? (
        <div style={styles.empty}>
          <p>You have no listings yet.</p>
          <Link to="/create-property" style={styles.primaryBtn}>
            Create a property
          </Link>
        </div>
      ) : (
        <div style={styles.propertyList}>
          {ownerProperties.map((prop) => {
            const expanded = expandedId === prop.id;
            const nf = getNewRoomForm(prop.id);
            return (
              <div key={prop.id} style={styles.propertyCard}>
                <button
                  type="button"
                  style={styles.propertyHeaderBtn}
                  onClick={() => setExpandedId(expanded ? null : prop.id)}
                >
                  <span style={styles.propertyHeaderTitle}>{prop.name}</span>
                  <span style={styles.propertyMeta}>
                    {prop.city}, {prop.country} · Max guests: {prop.capacity}
                  </span>
                  <span style={styles.chevron}>{expanded ? "▼" : "▶"}</span>
                </button>

                {expanded && (
                  <div style={styles.propertyBody}>
                    <p style={styles.propertyAddr}>
                      {prop.address}
                      {" · "}
                      <Link to={`/property/${prop.id}`} style={styles.inlineLink}>
                        Open listing (your property)
                      </Link>
                    </p>

                    <div style={styles.recBox}>
                      <h4 style={styles.subHeading}>Receptionist</h4>
                      {receptionistByProperty[prop.id] ? (
                        <div style={styles.recRow}>
                          <span>
                            Assigned: <strong>{receptionistByProperty[prop.id].username}</strong>
                          </span>
                          <button
                            type="button"
                            style={styles.secondaryBtn}
                            onClick={() => unassignReceptionist(prop.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div style={styles.recRow}>
                          <input
                            style={styles.input}
                            placeholder="Receptionist username"
                            value={assignUsername[prop.id] || ""}
                            onChange={(e) => {
                              setAssignUsername((prev) => ({
                                ...prev,
                                [prop.id]: e.target.value,
                              }));
                              setAssignErrorByProperty((prev) => ({
                                ...prev,
                                [prop.id]: "",
                              }));
                            }}
                          />
                          <button
                            type="button"
                            style={styles.primaryBtn}
                            onClick={() => assignReceptionist(prop.id)}
                          >
                            Assign
                          </button>
                        </div>
                      )}
                      {assignErrorByProperty[prop.id] ? (
                        <p style={styles.recError} role="alert">
                          {assignErrorByProperty[prop.id]}
                        </p>
                      ) : null}
                      <p style={styles.recHint}>
                        One receptionist per property. They manage bookings and room availability from their home page.
                      </p>
                      <p style={styles.recWarn}>
                        You cannot assign a receptionist who is already working at someone else&apos;s property. Their
                        current owner must remove them first; after that they appear available for your listing.
                      </p>
                    </div>

                    {editingRoom && (prop.rooms || []).some((r) => r.id === editingRoom) ? (
                      <div style={styles.editPanel}>
                        <h4 style={styles.subHeading}>Edit room</h4>
                        <div style={styles.formGrid}>
                          <input
                            style={styles.input}
                            value={editRoomForm.room_type}
                            placeholder="Room type"
                            onChange={(e) =>
                              setEditRoomForm((f) => ({ ...f, room_type: e.target.value }))
                            }
                          />
                          <input
                            style={styles.input}
                            type="number"
                            min={1}
                            value={editRoomForm.capacity}
                            onChange={(e) =>
                              setEditRoomForm((f) => ({
                                ...f,
                                capacity: parseInt(e.target.value, 10) || 1,
                              }))
                            }
                          />
                          <input
                            style={styles.input}
                            type="number"
                            step="0.01"
                            value={editRoomForm.price_per_night}
                            placeholder="Price / night"
                            onChange={(e) =>
                              setEditRoomForm((f) => ({
                                ...f,
                                price_per_night: e.target.value,
                              }))
                            }
                          />
                          <select
                            style={styles.input}
                            value={editRoomForm.availability_status}
                            onChange={(e) =>
                              setEditRoomForm((f) => ({
                                ...f,
                                availability_status: e.target.value,
                              }))
                            }
                          >
                            {ROOM_STATUSES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          style={{ ...styles.input, minHeight: "72px" }}
                          value={editRoomForm.description}
                          placeholder="Description (optional)"
                          onChange={(e) =>
                            setEditRoomForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                        <div style={styles.rowActions}>
                          <button type="button" style={styles.secondaryBtn} onClick={cancelEditRoom}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            style={styles.primaryBtn}
                            onClick={saveEditRoom}
                            disabled={roomSavingId === editingRoom}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Room</th>
                          <th style={styles.th}>Guests</th>
                          <th style={styles.th}>Price / night</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(prop.rooms || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={styles.tdEmpty}>
                              No rooms yet.
                            </td>
                          </tr>
                        ) : (
                          (prop.rooms || []).map((room) => (
                            <tr key={room.id}>
                              <td style={styles.td}>{room.room_type}</td>
                              <td style={styles.td}>{room.capacity}</td>
                              <td style={styles.td}>{room.price_per_night}</td>
                              <td style={styles.td}>{room.availability_status}</td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={styles.linkBtn}
                                  onClick={() => startEditRoom(room)}
                                  disabled={roomSavingId !== null}
                                >
                                  Edit
                                </button>
                                {" · "}
                                <button
                                  type="button"
                                  style={styles.dangerBtn}
                                  onClick={() => handleDeleteRoom(room.id)}
                                  disabled={roomSavingId !== null}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div style={styles.addRoom}>
                      <h4 style={styles.subHeading}>Add a room</h4>
                      <div style={styles.formGrid}>
                        <input
                          style={styles.input}
                          placeholder="Room type"
                          value={nf.room_type}
                          onChange={(e) =>
                            updateNewRoomForm(prop.id, { room_type: e.target.value })
                          }
                        />
                        <input
                          style={styles.input}
                          type="number"
                          min={1}
                          value={nf.capacity}
                          onChange={(e) =>
                            updateNewRoomForm(prop.id, {
                              capacity: parseInt(e.target.value, 10) || 1,
                            })
                          }
                        />
                        <input
                          style={styles.input}
                          type="number"
                          step="0.01"
                          placeholder="Price per night"
                          value={nf.price_per_night}
                          onChange={(e) =>
                            updateNewRoomForm(prop.id, { price_per_night: e.target.value })
                          }
                        />
                        <select
                          style={styles.input}
                          value={nf.availability_status}
                          onChange={(e) =>
                            updateNewRoomForm(prop.id, {
                              availability_status: e.target.value,
                            })
                          }
                        >
                          {ROOM_STATUSES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        style={{ ...styles.input, minHeight: "64px", marginTop: "8px" }}
                        placeholder="Description (optional)"
                        value={nf.description}
                        onChange={(e) =>
                          updateNewRoomForm(prop.id, { description: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        style={{ ...styles.primaryBtn, marginTop: "10px" }}
                        onClick={() => handleAddRoom(prop.id)}
                        disabled={roomSavingId === `new-${prop.id}`}
                      >
                        Add room
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  title: { fontSize: "20px", margin: 0 },
  addLink: {
    padding: "8px 14px",
    background: "#374151",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
  },
  muted: { color: "#6b7280" },
  empty: { textAlign: "center", padding: "24px", color: "#6b7280" },
  primaryBtn: {
    display: "inline-block",
    marginTop: "10px",
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
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
  propertyList: { display: "flex", flexDirection: "column", gap: "12px" },
  propertyCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#fafafa",
  },
  propertyHeaderBtn: {
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    border: "none",
    background: "#f3f4f6",
    cursor: "pointer",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
  },
  propertyHeaderTitle: { fontWeight: "700", fontSize: "16px", flex: "1 1 auto" },
  propertyMeta: { fontSize: "13px", color: "#6b7280", flex: "1 1 100%" },
  chevron: { fontSize: "12px", color: "#9ca3af" },
  propertyBody: { padding: "16px", background: "white" },
  propertyAddr: { fontSize: "14px", color: "#4b5563", marginTop: 0 },
  inlineLink: { color: "#2563eb" },
  subHeading: { fontSize: "15px", margin: "0 0 10px 0" },
  recBox: {
    marginBottom: "16px",
    padding: "14px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  recRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    marginBottom: "8px",
  },
  recHint: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.45,
  },
  recWarn: {
    margin: 0,
    fontSize: "12px",
    color: "#92400e",
    lineHeight: 1.45,
    paddingLeft: "10px",
    borderLeft: "3px solid #fbbf24",
  },
  recError: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    color: "#b91c1c",
    lineHeight: 1.45,
  },
  editPanel: {
    marginBottom: "16px",
    padding: "14px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "10px",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: "16px" },
  th: {
    textAlign: "left",
    padding: "8px",
    borderBottom: "2px solid #e5e7eb",
    color: "#374151",
  },
  td: { padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  tdEmpty: { padding: "16px", color: "#9ca3af", textAlign: "center" },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    padding: 0,
    fontWeight: "600",
  },
  dangerBtn: {
    background: "none",
    border: "none",
    color: "#b91c1c",
    cursor: "pointer",
    padding: 0,
    fontWeight: "600",
  },
  rowActions: { display: "flex", gap: "10px", marginTop: "10px" },
  addRoom: {
    marginTop: "8px",
    paddingTop: "16px",
    borderTop: "1px dashed #e5e7eb",
  },
};
