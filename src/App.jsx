import React, { useEffect, useMemo, useState, useCallback } from "react";
import { MapPin, Clock3, Coffee, Search, RefreshCw } from "lucide-react";

const API_BASE = "https://uncle-joes-api-338565689550.us-east1.run.app";

// =====================================================================
// Theme — coffee-shop visual identity
// =====================================================================
const T = {
  cream: "#FAF6F0",
  creamDark: "#F0E8DA",
  espresso: "#3B2418",
  coffee: "#5C3A21",
  caramel: "#A87242",
  gold: "#C8A05C",
  ink: "#2A1F18",
  muted: "#7A6A5C",
  border: "#E0D5C2",
  white: "#FFFFFF",
  success: "#3F6B3A",
  successBg: "#EBF1E8",
  danger: "#9C3A2E",
  dangerBg: "#FBEEEC",
  shadow: "0 2px 12px rgba(59, 36, 24, 0.08)",
  shadowLg: "0 8px 32px rgba(59, 36, 24, 0.16)",
};

const SERIF = '"Georgia", "Cambria", "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// =====================================================================
// Helpers
// =====================================================================
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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calcPoints(orderTotal) {
  const num = Number(orderTotal);
  if (Number.isNaN(num)) return 0;
  return Math.floor(num);
}

function fullName(profile) {
  if (!profile) return "";
  const first = profile.first_name || "";
  const last = profile.last_name || "";
  return `${first} ${last}`.trim() || profile.email || "Member";
}

function normalizeMenuItem(item, index) {
  return {
    id: item.id ?? item.item_id ?? index,
    name: item.name ?? item.item_name ?? "Unnamed item",
    category: item.category ?? "Other",
    size: item.size ?? "—",
    calories: item.calories ?? "—",
    price: item.price ?? item.base_price ?? "—",
  };
}

// =====================================================================
// Shared UI building blocks
// =====================================================================
function Card({ children, style = {}, padding = 24 }) {
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding,
        boxShadow: T.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", style = {}, type = "button", disabled = false }) {
  const variants = {
    primary: {
      background: T.espresso,
      color: T.cream,
      border: `1px solid ${T.espresso}`,
    },
    secondary: {
      background: T.white,
      color: T.espresso,
      border: `1px solid ${T.border}`,
    },
    ghost: {
      background: "transparent",
      color: T.espresso,
      border: "1px solid transparent",
    },
    danger: {
      background: T.white,
      color: T.danger,
      border: `1px solid ${T.danger}`,
    },
    accent: {
      background: T.caramel,
      color: T.white,
      border: `1px solid ${T.caramel}`,
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        padding: "10px 18px",
        borderRadius: 8,
        fontFamily: SANS,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "transform 0.05s ease, opacity 0.15s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.white,
        fontFamily: SANS,
        fontSize: 14,
        color: T.ink,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        ...(props.style || {}),
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.white,
        fontFamily: SANS,
        fontSize: 14,
        color: T.ink,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        cursor: "pointer",
        ...(props.style || {}),
      }}
    >
      {props.children}
    </select>
  );
}

function Badge({ children, color = T.caramel, bg }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: bg || `${color}22`,
        color,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: SANS,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}

function LoadingCard({ label }) {
  return (
    <Card>
      <p style={{ margin: 0, color: T.muted, fontFamily: SANS }}>Loading {label}…</p>
    </Card>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <Card style={{ background: T.dangerBg, borderColor: "#E8C2BC" }}>
      <p style={{ margin: 0, color: T.danger, fontWeight: 600, fontFamily: SANS }}>
        Something went wrong
      </p>
      <p style={{ margin: "8px 0 16px", color: T.ink, fontFamily: SANS }}>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </Card>
  );
}

function SectionHeading({ children, kicker, style = {} }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {kicker && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: T.caramel,
            marginBottom: 6,
          }}
        >
          {kicker}
        </div>
      )}
      <h2
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontSize: 28,
          fontWeight: 700,
          color: T.espresso,
          letterSpacing: -0.5,
        }}
      >
        {children}
      </h2>
    </div>
  );
}

// =====================================================================
// Header / Navigation
// =====================================================================
function Header({ page, setPage, member, profile, onLoginClick, onLogout }) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "locations", label: "Locations" },
    { id: "menu", label: "Menu" },
  ];
  if (member) tabs.push({ id: "dashboard", label: "Dashboard" });

  return (
    <header
      style={{
        background: T.espresso,
        color: T.cream,
        borderBottom: `3px solid ${T.gold}`,
      }}
    >
      <div
        style={{
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={() => setPage("home")}
        >
          <Coffee size={36} color={T.gold} />
          <div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.1,
              }}
            >
              Uncle Joe&apos;s
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: T.gold,
              }}
            >
              Coffee Company
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setPage(t.id)}
              style={{
                background: page === t.id ? T.gold : "transparent",
                color: page === t.id ? T.espresso : T.cream,
                border: "1px solid transparent",
                padding: "8px 16px",
                borderRadius: 8,
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {member ? (
            <>
              <span style={{ fontFamily: SANS, fontSize: 14, color: T.cream }}>
                Hi, {profile?.first_name || "Member"} ☕
              </span>
              <Button variant="accent" onClick={onLogout}>
                Log out
              </Button>
            </>
          ) : (
            <Button variant="accent" onClick={onLoginClick}>
              Log in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// =====================================================================
// Login Modal
// =====================================================================
function LoginModal({ open, onClose, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.detail || data.message || "Login failed. Check your credentials.");
        setSubmitting(false);
        return;
      }
      onLogin(data.member_id);
    } catch (err) {
      setError(err.message || "Network error.");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42, 31, 24, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cream,
          borderRadius: 16,
          padding: 32,
          maxWidth: 420,
          width: "100%",
          boxShadow: T.shadowLg,
          border: `1px solid ${T.border}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Coffee size={40} color={T.caramel} />
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 26,
              color: T.espresso,
              margin: "12px 0 4px",
            }}
          >
            Welcome back
          </h2>
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0, fontSize: 14 }}>
            Sign in to your Coffee Club account
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: T.coffee,
                marginBottom: 4,
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: T.coffee,
                marginBottom: 4,
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              style={{
                background: T.dangerBg,
                color: T.danger,
                padding: "10px 14px",
                borderRadius: 8,
                fontFamily: SANS,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={submit} disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Home / Landing
// =====================================================================
function HomePage({ setPage, member, profile, onLoginClick }) {
  return (
    <div>
      <section
        style={{
          background: `linear-gradient(135deg, ${T.creamDark} 0%, ${T.cream} 100%)`,
          borderRadius: 16,
          padding: "56px 32px",
          marginBottom: 32,
          textAlign: "center",
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: T.caramel,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Brewing since day one
        </div>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 48,
            color: T.espresso,
            margin: "0 0 16px",
            letterSpacing: -1,
            lineHeight: 1.05,
          }}
        >
          Good coffee.<br />Honest people.
        </h1>
        <p
          style={{
            fontFamily: SANS,
            fontSize: 16,
            color: T.coffee,
            maxWidth: 540,
            margin: "0 auto 28px",
            lineHeight: 1.6,
          }}
        >
          Find your nearest Uncle Joe&apos;s, browse our menu, and earn Coffee Club points
          on every order. Pay at the store — we keep it simple.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={() => setPage("locations")}>
            Find a Location
          </Button>
          <Button variant="secondary" onClick={() => setPage("menu")}>
            View Menu
          </Button>
          {!member && (
            <Button variant="accent" onClick={onLoginClick}>
              Coffee Club Login
            </Button>
          )}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
          <h3 style={{ fontFamily: SERIF, color: T.espresso, margin: "0 0 8px", fontSize: 20 }}>
            Stores Nationwide
          </h3>
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Wi-Fi, drive-through, and DoorDash at locations near you.
          </p>
        </Card>
        <Card>
          <div style={{ fontSize: 32, marginBottom: 8 }}>☕</div>
          <h3 style={{ fontFamily: SERIF, color: T.espresso, margin: "0 0 8px", fontSize: 20 }}>
            Full Menu
          </h3>
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Coffee, espresso, tea, and more. Search by name or category.
          </p>
        </Card>
        <Card>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
          <h3 style={{ fontFamily: SERIF, color: T.espresso, margin: "0 0 8px", fontSize: 20 }}>
            Coffee Club Rewards
          </h3>
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Earn 1 point for every dollar spent. Track your orders and balance.
          </p>
        </Card>
      </div>
    </div>
  );
}

// =====================================================================
// Locations Page
// =====================================================================
function AmenityIcon({ enabled, label, icon }) {
  return (
    <span
      title={`${label}: ${enabled ? "Available" : "Not available"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: enabled ? T.successBg : T.creamDark,
        color: enabled ? T.success : T.muted,
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 600,
        opacity: enabled ? 1 : 0.55,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function LocationsPage({ profile }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/locations`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const states = useMemo(() => {
    return ["All", ...Array.from(new Set(locations.map((l) => l.state).filter(Boolean))).sort()];
  }, [locations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((loc) => {
      const matchesState = stateFilter === "All" || loc.state === stateFilter;
      const haystack = `${loc.city || ""} ${loc.state || ""} ${loc.address || ""}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      return matchesState && matchesSearch;
    });
  }, [locations, search, stateFilter]);

  const homeStoreId = profile?.home_store?.id;

  return (
    <section>
      <SectionHeading kicker="Where to find us">Our Locations</SectionHeading>

      <Card style={{ marginBottom: 16 }} padding={16}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={T.muted}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, state, or address"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            {states.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All states" : s}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={loadLocations}>
            <RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Refresh
          </Button>
        </div>
      </Card>

      <p style={{ fontFamily: SANS, color: T.muted, fontSize: 14, marginBottom: 16 }}>
        Showing {filtered.length} {filtered.length === 1 ? "location" : "locations"}
      </p>

      {loading && <LoadingCard label="locations" />}
      {!loading && error && <ErrorCard message={error} onRetry={loadLocations} />}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((loc) => {
            const isHome = homeStoreId && loc.id === homeStoreId;
            return (
              <Card
                key={loc.id}
                style={{
                  borderColor: isHome ? T.gold : T.border,
                  borderWidth: isHome ? 2 : 1,
                  position: "relative",
                }}
              >
                {isHome && (
                  <div style={{ position: "absolute", top: 16, right: 16 }}>
                    <Badge color={T.gold} bg={`${T.gold}33`}>
                      ★ Home Store
                    </Badge>
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: SERIF,
                    fontSize: 22,
                    color: T.espresso,
                    margin: "0 0 4px",
                  }}
                >
                  {safeText(loc.city)}, {safeText(loc.state)}
                </h3>
                <p style={{ fontFamily: SANS, color: T.muted, fontSize: 12, margin: "0 0 12px" }}>
                  Store #{safeText(loc.id)}
                </p>

                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <MapPin size={16} color={T.caramel} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontFamily: SANS, color: T.ink, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                    {safeText(loc.address)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
                  <Clock3 size={16} color={T.caramel} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p
                    style={{
                      fontFamily: SANS,
                      color: T.muted,
                      fontSize: 12,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {safeText(loc.hours)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <AmenityIcon enabled={!!loc.wifi} label="Wi-Fi" icon="📶" />
                  <AmenityIcon enabled={!!loc.drive_thru} label="Drive-Thru" icon="🚗" />
                  <AmenityIcon enabled={!!loc.door_dash} label="DoorDash" icon="🛵" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

// =====================================================================
// Menu Page
// =====================================================================
function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/menu/categories`);
      if (!res.ok) return;
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // non-fatal — frontend can still derive categories from items
    }
  }, []);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category !== "All") params.set("category", category);
      const url = params.toString() ? `${API_BASE}/menu?${params}` : `${API_BASE}/menu`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map(normalizeMenuItem);
      setItems(normalized);
    } catch (err) {
      setError(err.message || "Unable to load menu.");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Debounce menu reloads when filters change
  useEffect(() => {
    const t = setTimeout(loadMenu, 250);
    return () => clearTimeout(t);
  }, [loadMenu]);

  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [items]);

  const groupKeys = Object.keys(grouped).sort();

  return (
    <section>
      <SectionHeading kicker="What we&rsquo;re brewing">Our Menu</SectionHeading>

      <Card style={{ marginBottom: 16 }} padding={16}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={T.muted}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <p style={{ fontFamily: SANS, color: T.muted, fontSize: 14, marginBottom: 16 }}>
        {loading ? "Loading…" : `${items.length} ${items.length === 1 ? "item" : "items"} shown`}
      </p>

      {loading && <LoadingCard label="menu" />}
      {!loading && error && <ErrorCard message={error} onRetry={loadMenu} />}

      {!loading && !error && groupKeys.length === 0 && (
        <Card>
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0 }}>
            No items match your search. Try a different keyword or category.
          </p>
        </Card>
      )}

      {!loading && !error && groupKeys.map((cat) => (
        <Card key={cat} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Coffee size={20} color={T.caramel} />
            <h3
              style={{
                fontFamily: SERIF,
                fontSize: 22,
                color: T.espresso,
                margin: 0,
              }}
            >
              {cat}
            </h3>
            <Badge>{grouped[cat].length}</Badge>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.creamDark}` }}>
                  <th style={{ textAlign: "left", padding: "10px 8px", color: T.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Item</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", color: T.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Size</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", color: T.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Calories</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", color: T.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${T.creamDark}` }}>
                    <td style={{ padding: "12px 8px", color: T.ink, fontSize: 14, fontWeight: 600 }}>
                      {safeText(item.name)}
                    </td>
                    <td style={{ padding: "12px 8px", color: T.muted, fontSize: 14 }}>
                      {safeText(item.size)}
                    </td>
                    <td style={{ padding: "12px 8px", color: T.muted, fontSize: 14 }}>
                      {safeText(item.calories)}
                    </td>
                    <td style={{ padding: "12px 8px", color: T.coffee, fontSize: 14, fontWeight: 700, textAlign: "right" }}>
                      {formatMoney(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </section>
  );
}

// =====================================================================
// Dashboard Page
// =====================================================================
function StatTile({ label, value, sub }) {
  return (
    <Card padding={20}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: T.caramel,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 28,
          color: T.espresso,
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: SANS, fontSize: 12, color: T.muted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function OrderRow({ order, expanded, onToggle }) {
  const points = calcPoints(order.order_total);
  return (
    <div
      style={{
        borderBottom: `1px solid ${T.creamDark}`,
        padding: "16px 0",
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 120px 100px 24px",
          gap: 12,
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ fontFamily: SANS, fontSize: 14, color: T.ink, fontWeight: 600 }}>
          {formatDate(order.order_date)}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: T.muted }}>
          📍 {safeText(order.store_location)}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: T.coffee, fontWeight: 700 }}>
          {formatMoney(order.order_total)}
        </div>
        <div>
          <Badge color={T.gold} bg={`${T.gold}33`}>+{points} pts</Badge>
        </div>
        <div style={{ fontFamily: SANS, color: T.muted, textAlign: "right", fontSize: 16 }}>
          {expanded ? "▾" : "▸"}
        </div>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            background: T.cream,
            borderRadius: 8,
            border: `1px solid ${T.creamDark}`,
          }}
        >
          {(order.items || []).length === 0 ? (
            <p style={{ fontFamily: SANS, color: T.muted, margin: 0, fontSize: 13 }}>
              No line items recorded for this order.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 4px", color: T.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Item</th>
                  <th style={{ textAlign: "left", padding: "6px 4px", color: T.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Size</th>
                  <th style={{ textAlign: "center", padding: "6px 4px", color: T.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "6px 4px", color: T.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 4px", color: T.ink, fontSize: 13 }}>{safeText(item.item_name)}</td>
                    <td style={{ padding: "6px 4px", color: T.muted, fontSize: 13 }}>{safeText(item.size)}</td>
                    <td style={{ padding: "6px 4px", color: T.muted, fontSize: 13, textAlign: "center" }}>{safeText(item.quantity)}</td>
                    <td style={{ padding: "6px 4px", color: T.coffee, fontSize: 13, textAlign: "right", fontWeight: 600 }}>{formatMoney(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardPage({ memberId, profile, onProfileLoaded }) {
  const [orders, setOrders] = useState([]);
  const [points, setPoints] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [profileRes, ordersRes, pointsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/members/${memberId}`),
        fetch(`${API_BASE}/members/${memberId}/orders`),
        fetch(`${API_BASE}/members/${memberId}/points`),
        fetch(`${API_BASE}/members/${memberId}/stats`),
      ]);

      if (!profileRes.ok) throw new Error(`Profile request failed (${profileRes.status})`);
      if (!ordersRes.ok) throw new Error(`Orders request failed (${ordersRes.status})`);
      if (!pointsRes.ok) throw new Error(`Points request failed (${pointsRes.status})`);
      if (!statsRes.ok) throw new Error(`Stats request failed (${statsRes.status})`);

      const [profileData, ordersData, pointsData, statsData] = await Promise.all([
        profileRes.json(),
        ordersRes.json(),
        pointsRes.json(),
        statsRes.json(),
      ]);

      onProfileLoaded(profileData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setPoints(pointsData?.points_balance ?? 0);
      setStats(statsData || null);
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [memberId, onProfileLoaded]);

  useEffect(() => {
    if (memberId) load();
  }, [memberId, load]);

  if (loading) return <LoadingCard label="your dashboard" />;
  if (error) return <ErrorCard message={error} onRetry={load} />;

  return (
    <section>
      {/* Welcome banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${T.espresso} 0%, ${T.coffee} 100%)`,
          color: T.cream,
          borderRadius: 16,
          padding: "32px 28px",
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: T.gold,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Coffee Club Member
          </div>
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 32,
              margin: "0 0 6px",
              letterSpacing: -0.5,
            }}
          >
            Welcome back, {profile?.first_name || "Friend"}.
          </h2>
          {profile?.home_store && (
            <p style={{ fontFamily: SANS, fontSize: 14, margin: 0, color: T.creamDark }}>
              Your home store:{" "}
              <strong style={{ color: T.gold }}>
                {profile.home_store.city}
                {profile.home_store.state ? `, ${profile.home_store.state}` : ""}
              </strong>
            </p>
          )}
        </div>
        <div
          style={{
            background: T.gold,
            color: T.espresso,
            padding: "20px 28px",
            borderRadius: 12,
            textAlign: "center",
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Points Balance
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
            {points ?? 0}
          </div>
        </div>
      </div>

      {/* Profile + Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card>
          <SectionHeading kicker="Your Profile" style={{ marginBottom: 12 }}>
            {fullName(profile)}
          </SectionHeading>
          <div style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.8, color: T.ink }}>
            <div>
              <span style={{ color: T.muted }}>Email:</span> {safeText(profile?.email)}
            </div>
            <div>
              <span style={{ color: T.muted }}>Phone:</span> {safeText(profile?.phone_number)}
            </div>
            <div>
              <span style={{ color: T.muted }}>Home Store:</span>{" "}
              {profile?.home_store
                ? `${profile.home_store.city || ""}${profile.home_store.state ? ", " + profile.home_store.state : ""}`
                : "—"}
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <StatTile
            label="Total Orders"
            value={stats?.total_orders ?? 0}
            sub={stats?.first_order_date ? `Since ${formatDate(stats.first_order_date)}` : null}
          />
          <StatTile
            label="Total Spent"
            value={formatMoney(stats?.total_spent ?? 0)}
            sub={stats?.average_order ? `Avg ${formatMoney(stats.average_order)}/order` : null}
          />
          <StatTile
            label="Favorite Item"
            value={safeText(stats?.favorite_item)}
            sub={stats?.favorite_item_quantity ? `Ordered ${stats.favorite_item_quantity} times` : null}
          />
          <StatTile
            label="Favorite Store"
            value={safeText(stats?.favorite_store)}
            sub={stats?.favorite_store_visits ? `${stats.favorite_store_visits} visits` : null}
          />
        </div>
      </div>

      {/* Order History */}
      <Card>
        <SectionHeading kicker="Order History" style={{ marginBottom: 8 }}>
          Recent Orders
        </SectionHeading>
        <p style={{ fontFamily: SANS, color: T.muted, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Click any order to see line item details. Earn 1 point per dollar.
        </p>

        {orders.length === 0 ? (
          <p style={{ fontFamily: SANS, color: T.muted, margin: 0 }}>
            No orders yet. Visit a store to get started!
          </p>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px 100px 24px",
                gap: 12,
                padding: "8px 0",
                borderBottom: `2px solid ${T.creamDark}`,
                fontFamily: SANS,
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: T.muted,
                fontWeight: 700,
              }}
            >
              <div>Date</div>
              <div>Location</div>
              <div>Total</div>
              <div>Points</div>
              <div></div>
            </div>
            {orders.map((order) => (
              <OrderRow
                key={order.order_id}
                order={order}
                expanded={expandedOrderId === order.order_id}
                onToggle={() =>
                  setExpandedOrderId(expandedOrderId === order.order_id ? null : order.order_id)
                }
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

// =====================================================================
// Footer
// =====================================================================
function Footer() {
  return (
    <footer
      style={{
        background: T.espresso,
        color: T.creamDark,
        padding: "32px 24px",
        marginTop: 64,
        borderTop: `3px solid ${T.gold}`,
      }}
    >
      <div
        style={{
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Coffee size={24} color={T.gold} />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: T.cream }}>
              Uncle Joe&apos;s Coffee Company
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: T.creamDark }}>
              Brewing good coffee since day one.
            </div>
          </div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: T.creamDark }}>
          © {new Date().getFullYear()} Uncle Joe&apos;s Coffee Company. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// Root App
// =====================================================================
const SESSION_KEY = "uncleJoesMemberId";

export default function App() {
  const [page, setPage] = useState("home");
  const [memberId, setMemberId] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) || null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Load profile when memberId changes (covers initial session restore)
  useEffect(() => {
    if (!memberId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/members/${memberId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProfile(data);
      } catch {
        // ignore — dashboard fetch will surface any persistent errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const handleLogin = (id) => {
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      // sessionStorage unavailable (private mode etc.) — proceed in-memory only
    }
    setMemberId(id);
    setLoginOpen(false);
    setPage("dashboard");
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setMemberId(null);
    setProfile(null);
    setPage("home");
  };

  // Guard: if user navigates to dashboard without being logged in, prompt login
  useEffect(() => {
    if (page === "dashboard" && !memberId) {
      setPage("home");
      setLoginOpen(true);
    }
  }, [page, memberId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.cream,
        color: T.ink,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        page={page}
        setPage={setPage}
        member={memberId}
        profile={profile}
        onLoginClick={() => setLoginOpen(true)}
        onLogout={handleLogout}
      />

      <main
        style={{
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px",
          flex: 1,
          boxSizing: "border-box",
        }}
      >
        {page === "home" && (
          <HomePage
            setPage={setPage}
            member={memberId}
            profile={profile}
            onLoginClick={() => setLoginOpen(true)}
          />
        )}
        {page === "locations" && <LocationsPage profile={profile} />}
        {page === "menu" && <MenuPage />}
        {page === "dashboard" && memberId && (
          <DashboardPage
            memberId={memberId}
            profile={profile}
            onProfileLoaded={setProfile}
          />
        )}
      </main>

      <Footer />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
