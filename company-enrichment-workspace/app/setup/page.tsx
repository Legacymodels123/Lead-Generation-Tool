import AppShell from "@/components/app-shell";

const providers = [
  {
    name: "Claude",
    status: "Required",
    description: "Primary AI engine for property enrichment, type inference, summaries, and qualification logic.",
  },
  {
    name: "Hunter",
    status: "Recommended",
    description: "Email discovery, domain verification, and contact-level enrichment for missing fields.",
  },
  {
    name: "Lusha",
    status: "Recommended",
    description: "B2B contact and company enrichment to fill property values directly into the board.",
  },
  {
    name: "HubSpot",
    status: "Required",
    description: "Two-way sync for mapped properties, conflict visibility, and CRM alignment.",
  },
];

export default function SetupPage() {
  return (
    <AppShell
      title="Setup"
      description="Connect the minimum provider stack for a live dynamic enrichment workspace."
    >
      <section className="setup-grid">
        {providers.map((provider) => (
          <article key={provider.name} className="setup-card">
            <div className="eyebrow">{provider.status}</div>
            <h3>{provider.name}</h3>
            <p>{provider.description}</p>
            <div style={{ marginTop: 12 }}>
              <span className={`badge ${provider.status === "Required" ? "badge-warning" : "badge-success"}`}>
                {provider.status}
              </span>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
