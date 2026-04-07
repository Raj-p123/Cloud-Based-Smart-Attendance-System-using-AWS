import { useState } from "react";
import { Sprout, Shield, Clock3 } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

const features = [
  {
    icon: Sprout,
    title: "Organic class operations",
    description: "Teachers create lightweight attendance sessions without paperwork friction."
  },
  {
    icon: Shield,
    title: "Secure cloud records",
    description: "Attendance data flows to a role-based backend designed for AWS RDS and EC2."
  },
  {
    icon: Clock3,
    title: "Time-bound QR sessions",
    description: "Every class session creates a short-lived QR code to reduce proxy attendance."
  }
];

export function AuthPage({ onAuthenticated }) {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await api.login(form);
      onAuthenticated(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">AWS Smart Attendance System</p>
          <h1>Attendance that feels calm, clear, and cloud-native.</h1>
          <p className="hero-text">
            Students check in through QR codes, teachers run live sessions, and admins get
            reporting visibility across classes with a tactile organic interface.
          </p>
          <div className="feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className={`feature-card shape-${index + 1}`}>
                  <div className="icon-bubble">
                    <Icon size={26} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="auth-card shape-5">
          <div className="blob blob-a" aria-hidden="true" />
          <div className="blob blob-b" aria-hidden="true" />
          <div className="auth-card-inner">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your dashboard</h2>
            <p className="muted-copy">
              Teacher and student access is created by the admin. Use the email and password
              assigned to you to open your dashboard.
            </p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="teacher@campus.edu"
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Enter a secure password"
                required
              />
              {error ? <p className="form-error">{error}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Sign In"}
              </Button>
            </form>
            <p className="muted-copy">Need access? Ask the admin to create your account.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
