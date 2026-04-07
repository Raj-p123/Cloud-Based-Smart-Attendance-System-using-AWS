import { Link, NavLink } from "react-router-dom";
import { Leaf, LogOut, QrCode, ShieldCheck, Users } from "lucide-react";

const navByRole = {
  student: [
    { to: "/student", label: "Dashboard", icon: Users },
    { to: "/scan", label: "Scan QR", icon: QrCode }
  ],
  teacher: [{ to: "/teacher", label: "Teacher Hub", icon: Leaf }],
  admin: [{ to: "/admin", label: "Admin Panel", icon: ShieldCheck }]
};

export function AppShell({ user, onLogout, children }) {
  const links = navByRole[user?.role] || [];

  return (
    <div className="app-shell">
      <header className="floating-nav">
        <Link to="/" className="brand-mark">
          <span className="brand-badge">
            <Leaf size={18} />
          </span>
          <span>
            <strong>Cloud Attendance</strong>
            <small>Human-centered classroom ops</small>
          </span>
        </Link>
        <nav className="nav-links">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-pill ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button type="button" className="logout-button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
