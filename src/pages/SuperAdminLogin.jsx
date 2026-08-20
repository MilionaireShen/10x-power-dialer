import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useLogoutBanner } from "../lib/useLogoutBanner";
import AuthShell, { AuthField, AuthDivider } from "../components/AuthShell";
import LogoutBanner from "../components/LogoutBanner";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const banner = useLogoutBanner();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate("/superadmin/dashboard");
  };

  return (
    <AuthShell portalLabel="Super Admin Portal">
      <LogoutBanner banner={banner} />

      <AuthDivider label="Super Admin Login" />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input-field"
            autoComplete="email"
          />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            autoComplete="current-password"
          />
        </AuthField>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button type="submit" disabled={loading} className="btn-purple w-full py-3">
          {loading ? "Signing In…" : "Sign In to Dashboard"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/admin/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
          Administrator? Login here →
        </Link>
      </div>
    </AuthShell>
  );
}
