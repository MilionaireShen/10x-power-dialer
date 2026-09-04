import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// There was no error boundary anywhere in this app — an uncaught render
// exception in any page took down the ENTIRE React tree, leaving a blank
// white screen with no way to recover except a hard refresh (which, mid
// call, can look like the call itself vanished). This exists specifically
// so that never happens again: it catches the render error, shows what
// actually broke, and — placed around the routed page only, not the
// softphone/audio element that lives above it in AppLayout — a crash here
// does not tear down a live call. The agent can see the call is still
// connected (or hang up) instead of staring at nothing.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Server-side visibility into frontend crashes did not exist before
    // this either — logged loudly here (and to the console, always) so a
    // report of "the screen went blank" has an actual error and component
    // stack to trace instead of nothing.
    console.error("[ErrorBoundary] Render crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle size={40} className="text-[var(--color-danger)]" />
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Something went wrong on this screen.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-text-tertiary)]">
            {this.props.liveCallHint !== false && (
              <>If you were on a call, it may still be connected — check before hanging up or reloading. </>
            )}
            This has been logged. Reloading usually recovers it.
          </p>
          {this.state.error?.message && (
            <p className="mx-auto mt-3 max-w-md rounded-md bg-[var(--color-bg)] p-2 text-left font-mono text-[11px] text-[var(--color-text-tertiary)]">
              {this.state.error.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => this.setState({ error: null })} className="btn-outline">
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="btn-purple">
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
