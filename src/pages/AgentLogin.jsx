import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useLogoutBanner } from "../lib/useLogoutBanner";
import AuthShell, { AuthField, AuthDivider } from "../components/AuthShell";
import LogoutBanner from "../components/LogoutBanner";

export default function AgentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [assignedCampaigns, setAssignedCampaigns] = useState(null); // null = not fetched yet
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const banner = useLogoutBanner();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Credentials changed after we already fetched a campaign list for a
  // (possibly different) account — that list is stale, so drop it.
  const resetCampaignStep = () => {
    setAssignedCampaigns(null);
    setCampaignId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setError("");
    setLoading(true);

    // Step 1: no campaign chosen yet — the backend verifies the password
    // and, for an agent, hands back the campaigns they're actually
    // assigned to instead of just erroring.
    if (!campaignId) {
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        // Non-agent account signed in through the agent portal — still works.
        navigate("/agent/dashboard");
        return;
      }

      if (result.data?.assigned_campaigns) {
        setAssignedCampaigns(result.data.assigned_campaigns);
        setError(
          result.data.assigned_campaigns.length === 0
            ? "You have no active campaigns assigned. Contact your admin."
            : "Select a campaign to begin your session."
        );
        return;
      }

      setError(result.message);
      return;
    }

    // Step 2: campaign chosen — complete the login.
    const result = await login(email, password, campaignId);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate("/agent/dashboard");
  };

  const showCampaignPicker = Array.isArray(assignedCampaigns) && assignedCampaigns.length > 0;
  const buttonLabel = loading
    ? campaignId
      ? "Starting Session…"
      : "Checking…"
    : showCampaignPicker
      ? "Begin Dialing Session"
      : "Continue";
  const canSubmit = showCampaignPicker ? Boolean(campaignId) : true;

  return (
    <AuthShell portalLabel="Agent Portal">
      <LogoutBanner banner={banner} />

      <AuthDivider label="Agent Login" />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetCampaignStep();
            }}
            placeholder="you@company.com"
            className="input-field"
            autoComplete="email"
          />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              resetCampaignStep();
            }}
            placeholder="••••••••"
            className="input-field"
            autoComplete="current-password"
          />
        </AuthField>

        {showCampaignPicker && (
          <AuthField label="Select Your Campaign Before Logging In">
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input-field">
              <option value="" disabled>
                Select your campaign...
              </option>
              {assignedCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.dialing_mode} Mode
                </option>
              ))}
            </select>
          </AuthField>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button type="submit" disabled={!canSubmit || loading} className="btn-purple w-full py-3">
          {buttonLabel}
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
