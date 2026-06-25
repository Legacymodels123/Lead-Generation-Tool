import AppShell from "@/components/app-shell";

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Minimal runtime controls for the first live version. Keep the operator focused on the board, not on admin overhead."
    >
      <section className="setup-grid">
        <article className="setup-card">
          <div className="eyebrow">Runtime</div>
          <h3>Environment readiness</h3>
          <p>
            This greenfield scaffold expects Supabase, Claude, Hunter, Lusha, and HubSpot
            environment variables before a true live launch.
          </p>
        </article>
        <article className="setup-card">
          <div className="eyebrow">Exportable</div>
          <h3>Repo handoff ready</h3>
          <p>
            This folder is designed to be moved into the new GitHub repository once GitHub auth
            and Vercel project creation are available.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
