import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function CreateProperty() {
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    country: "",
    description: "",
    capacity: 1,
    property_type: "hotel",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [images, setImages] = useState([]);

  const create = async () => {
    if (!form.name || !form.city || !form.address || !form.country || !form.description || !form.property_type) {
      setSuccess("");
      setError("Please complete all fields before creating the property.");
      return;
    }

    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("city", form.city);
    formData.append("address", form.address);
    formData.append("country", form.country);
    formData.append("description", form.description);
    formData.append("capacity", String(form.capacity || 1));
    formData.append("property_type", form.property_type);

    for (let i = 0; i < images.length; i++) {
      formData.append("uploaded_images", images[i]);
    }

    try {
      await api.post("listings/properties/", formData);
      setSuccess("Property created successfully.");
      setForm({
        name: "",
        city: "",
        address: "",
        country: "",
        description: "",
        capacity: 1,
        property_type: "hotel",
      });
      setImages([]);
    } catch (err) {
      const details = err?.response?.data;
      if (typeof details === "string") {
        setError(details);
        return;
      }
      if (details && typeof details === "object") {
        const firstError = Object.values(details).flat().find(Boolean);
        setError(firstError || "Could not create property.");
        return;
      }
      setError("Could not create property.");
    }
  };

  return (
    <div className="create-page">
      <div className="create-card">
        <div className="create-header">
          <h2 className="create-title">Create Property</h2>
          <Link to="/home" className="create-back-link">
            Back to Home
          </Link>
        </div>

        <input
          className="create-input"
          value={form.name}
          placeholder="Property name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="create-input"
          value={form.city}
          placeholder="City"
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <input
          className="create-input"
          value={form.address}
          placeholder="Address"
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="create-input"
          value={form.country}
          placeholder="Country"
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
        <label className="create-field-label" htmlFor="property-capacity">
          Maximum guests
        </label>
        <p id="property-capacity-hint" className="create-field-hint">
          How many guests can stay here at the same time. Guests cannot book with a party larger than this number.
          Example: use <strong>8</strong> if up to eight guests are allowed.
        </p>
        <input
          id="property-capacity"
          className="create-input"
          type="number"
          min={1}
          value={form.capacity}
          aria-describedby="property-capacity-hint"
          onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value, 10) || 1 })}
        />
        <select
          className="create-input"
          value={form.property_type}
          onChange={(e) => setForm({ ...form, property_type: e.target.value })}
        >
          <option value="hotel">Hotel</option>
          <option value="apartment">Apartment</option>
          <option value="guesthouse">Guesthouse</option>
        </select>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>Add Images:</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])}
            className="create-input"
            style={{ padding: "5px" }}
          />
        </div>
        <textarea
          className="create-textarea"
          value={form.description}
          placeholder="Description"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <button type="button" className="create-button" onClick={create}>
          Create
        </button>

        {error ? <p className="create-error">{error}</p> : null}
        {success ? <p className="create-success">{success}</p> : null}
      </div>
    </div>
  );
}
