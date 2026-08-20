import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useLogoutBanner } from "../lib/useLogoutBanner";
import AuthShell, { AuthField, AuthDivider, PasswordInput } from "../components/AuthShell";
import LogoutBanner from "../components/LogoutBanner";

export default function AdminLogin() {
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
    // Managers share this same login screen — there's no separate manager
    // URL — the backend returns whichever role the account actually has.
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate("/admin/dashboard");
  };

  return (
    <AuthShell portalLabel="Admin Portal">
      <LogoutBanner banner={banner} />

      <AuthDivider label="Administrator Login" />

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
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </AuthField>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button type="submit" disabled={loading} className="btn-purple w-full py-3">
          {loading ? "Signing In…" : "Sign In to Dashboard"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center">
        <Link to="/agent/login" className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
          Agent? Login here →
        </Link>
        <Link to="/superadmin/login" className="block text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors">
          Super Admin? Login here →
        </Link>
      </div>
    </AuthShell>
  );
}
