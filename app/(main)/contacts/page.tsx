"use client";


import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { leads } = useApp();
  const [filterRole, setFilterRole] = useState<"all" | "marketing_brand" | "ceo_owner">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const allContacts = useMemo(() => {
    return leads.flatMap((lead) =>
      lead.contacts.map((contact) => ({
        ...contact,
        company: lead.company,
        leadId: lead.id,
      }))
    );
  }, [leads]);

  const filtered = useMemo(() => {
    return allContacts.filter((contact) => {
      const matchesRole = filterRole === "all" || contact.dmuRole === filterRole;
      const matchesSearch =
        !searchQuery ||
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact as any).company.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [allContacts, filterRole, searchQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>Contacts</h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          {filtered.length} contacts from {new Set(filtered.map((c) => (c as any).company)).size} companies
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder="Search contacts, emails, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <option value="all">All Roles</option>
            <option value="marketing_brand">Marketing/Brand</option>
            <option value="ceo_owner">CEO/Owner</option>
          </select>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
            No contacts found
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              style={{
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    background: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: 600,
                  }}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{contact.name}</div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "3px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background:
                          contact.dmuRole === "marketing_brand" ? "#dbeafe" : "#fecdd3",
                        color:
                          contact.dmuRole === "marketing_brand" ? "#0c4a6e" : "#7f1d1d",
                      }}
                    >
                      {contact.dmuRole === "marketing_brand" ? "Marketing/Brand" : "CEO/Owner"}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                    <div>{contact.title}</div>
                    <div style={{ color: "#999", marginTop: "2px" }}>
                      {(contact as any).company}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        padding: "4px 8px",
                        background: "#f0f0f0",
                        borderRadius: "4px",
                        textDecoration: "none",
                        color: "#000",
                      }}
                    >
                      📧 {contact.email}
                    </a>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        style={{
                          padding: "4px 8px",
                          background: "#f0f0f0",
                          borderRadius: "4px",
                          textDecoration: "none",
                          color: "#000",
                        }}
                      >
                        📱 {contact.phone}
                      </a>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "4px 8px",
                          background: "#0a66c2",
                          color: "#fff",
                          borderRadius: "4px",
                          textDecoration: "none",
                        }}
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>

                  {contact.aiSummary && (
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "8px", background: "#f9fafb", padding: "8px", borderRadius: "4px" }}>
                      <strong>AI Summary:</strong> {contact.aiSummary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: "12px",
          fontSize: "12px",
          color: "#666",
          textAlign: "right",
        }}
      >
        Showing {filtered.length} of {allContacts.length} contacts
      </div>
    </div>
  );
}
