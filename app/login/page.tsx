"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("Legacy Scale Models");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/companies");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      const err = await login(email, password);
      if (err) setError(err);
      else router.push("/companies");
    } else {
      const err = await register(name, email, password, company);
      if (err) setError(err);
      else router.push("/companies");
    }
  }

  if (loading) {
    return (
      <div className="login-page">
        <div style={{ color: "#888" }}>Laden...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-mark">
              <div className="logo-icon">
                <span>L</span>
              </div>
              <div className="logo-text">
                <div className="logo-name">
                  Legacy Scale
                  <br />
                  Models
                </div>
                <div className="logo-sub">Lead Intelligence</div>
              </div>
            </div>
          </div>
          <h1 className="login-title">
            {mode === "login" ? "Inloggen" : "Account aanmaken"}
          </h1>
          <p className="login-subtitle">
            {mode === "login"
              ? "Toegang tot je lead intelligence dashboard"
              : "Start met 100 gratis credits"}
          </p>
        </div>

        <div className="login-body">
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Naam</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Je volledige naam"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Wachtwoord</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Bedrijf</label>
                <input
                  className="form-input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Bedrijfsnaam"
                />
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-primary login-btn">
              {mode === "login" ? "Inloggen" : "Registreren"}
            </button>
          </form>

          <div className="login-switch">
            {mode === "login" ? (
              <>
                Nog geen account?{" "}
                <button type="button" onClick={() => { setMode("register"); setError(""); }}>
                  Registreren
                </button>
              </>
            ) : (
              <>
                Al een account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }}>
                  Inloggen
                </button>
              </>
            )}
          </div>

          <div className="login-demo">
            <strong>Demo account:</strong>
            <br />
            E-mail: levi@legacy.com
            <br />
            Wachtwoord: legacy123
          </div>
        </div>
      </div>
    </div>
  );
}
