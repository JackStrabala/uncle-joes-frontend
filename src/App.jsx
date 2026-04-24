import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Clock3, Coffee, Search, RefreshCw } from "lucide-react";

const API_BASE = "https://uncle-joes-api-338565689550.us-east1.run.app";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value ?? "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function safeText(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function normalizeLocation(loc, index) {
  return {
    id: loc.location_id ?? loc.id ?? index,
    city: loc.city ?? "Unknown City",
    state: loc.state ?? "",
    address: loc.address ?? loc.street_address ?? loc.street ?? "Address unavailable",
    hours: loc.hours ?? loc.store_hours ?? loc.open_hours ?? "Hours unavailable",
  };
}

function normalizeMenuItem(item, index) {
  return {
    id: item.item_id ?? item.id ?? index,
    name: item.item_name ?? item.name ?? "Unnamed item",
    category: item.category ?? "Other",
    size: item.size ?? "—",
    calories: item.calories ?? "—",
    price: item.price ?? item.base_price ?? "—",
  };
}

function Header({ page, setPage }) {
  return (
    <header style={{ borderBottom: "1px solid #ddd", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Uncle Joe&apos;s Coffee</h1>
          <p style={{ margin: "4px 0 0", color: "#666" }}>Store locator and menu browser</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPage("locations")} style={{ padding: "10px 16px" }}>
            Locations
          </button>
          <button onClick={() => setPage("menu")} style={{ padding: "10px 16px" }}>
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}

function LoadingCard({ label }) {
  return (
    <div style={{ background: "#fff", padding: 24, border: "1px solid #ddd", borderRadius: 16 }}>
      Loading {label}...
    </div>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <div style={{ background: "#fff0f0", padding: 24, border: "1px solid #f0b0b0", borderRadius: 16 }}>
      <p><strong>Something went wrong</strong></p>
      <p>{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/locations`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : data.locations ?? []).map(normalizeLocation);
      setLocations(normalized);
    } catch (err) {
      setError(err.message || "Unable to load locations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const states = useMemo(() => {
    return ["All", ...Array.from(new Set(locations.map((loc) => loc.state).filter(Boolean))).sort()];
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((loc) => {
      const matchesState = stateFilter === "All" || loc.state === stateFilter;
      const haystack = `${loc.city} ${loc.state} ${loc.address} ${loc.hours}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      return matchesState && matchesSearch;
    });
  }, [locations, search, stateFilter]);

  return (
    <section>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city, state, address, or hours"
          style={{ padding: 12 }}
        />
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ padding: 12 }}>
          {states.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <p>{filteredLocations.length} locations shown</p>
        <button onClick={loadLocations}>Refresh</button>
      </div>

      {loading && <LoadingCard label="locations" />}
      {!loading && error && <ErrorCard message={error} onRetry={loadLocations} />}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {filteredLocations.map((loc) => (
            <article key={loc.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 16, padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>{safeText(loc.city)}, {safeText(loc.state)}</h2>
              <p><strong>Store #</strong>{safeText(loc.id)}</p>
              <p><strong>Address:</strong> {safeText(loc.address)}</p>
              <p><strong>Hours:</strong> {safeText(loc.hours)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : data.menu ?? []).map(normalizeMenuItem);
      setItems(normalized);
    } catch (err) {
      setError(err.message || "Unable to load menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = `${item.name} ${item.category} ${item.size}`.toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [items, search]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const categories = Object.keys(groupedItems).sort();

  return (
    <section>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item, category, or size"
          style={{ padding: 12 }}
        />
        <button onClick={loadMenu}>Refresh menu</button>
      </div>

      <p>{filteredItems.length} menu items shown</p>

      {loading && <LoadingCard label="menu" />}
      {!loading && error && <ErrorCard message={error} onRetry={loadMenu} />}

      {!loading && !error && categories.map((category) => (
        <section key={category} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 16, padding: 20, marginTop: 16 }}>
          <h2>{category}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Item</th>
                <th style={{ textAlign: "left", padding: 8 }}>Size</th>
                <th style={{ textAlign: "left", padding: 8 }}>Calories</th>
                <th style={{ textAlign: "left", padding: 8 }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems[category].map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 8 }}>{safeText(item.name)}</td>
                  <td style={{ padding: 8 }}>{safeText(item.size)}</td>
                  <td style={{ padding: 8 }}>{safeText(item.calories)}</td>
                  <td style={{ padding: 8 }}>{formatMoney(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("locations");

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", color: "#222" }}>
      <Header page={page} setPage={setPage} />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <h2>Find a shop. Browse the menu.</h2>
          <p>This frontend loads live Uncle Joe&apos;s Coffee data from the deployed FastAPI backend.</p>
        </div>
        {page === "locations" ? <LocationsPage /> : <MenuPage />}
      </main>
    </div>
  );
}