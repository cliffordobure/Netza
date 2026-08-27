import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("admin@netza.co.ke");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-brand">
        <div>
          <div className="eyebrow">Kenya operations</div>
          <h1>NETZA Kenya</h1>
          <p>Admin control for catalog, inventory, Flash Drops, loyalty points and orders across networking, CCTV and security products.</p>
        </div>
        <p>Today’s sales · pending orders · low stock · live promotions</p>
      </section>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="eyebrow">Staff access</div>
        <h2>Sign in</h2>
        <p className="sub">Use your NETZA admin credentials. Customer accounts cannot enter this dashboard.</p>
        <label>Email or phone</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Enter dashboard"}</button>
      </form>
    </div>
  );
}
