import type { Lead } from "@/lib/types";

const COLUMN_MAP: Record<string, string> = {
  "first name": "firstName",
  "last name": "lastName",
  "first name (unformatted)": "firstName",
  "last name (unformatted)": "lastName",
  title: "contactTitle",
  "job title": "contactTitle",
  company: "company",
  "company name": "company",
  "# employees": "employees",
  "company size": "employees",
  "number of employees": "employees",
  industry: "sector",
  "person linkedin url": "linkedinUrl",
  "linkedin url": "linkedinUrl",
  url: "linkedinUrl",
  geography: "country",
  country: "country",
  location: "country",
  website: "website",
  "company linkedin url": "linkedinCompanyUrl",
};

function parseEmployees(value: string): number {
  if (!value) return 0;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseCountry(value: string): string {
  if (!value) return "Nederland";
  const v = value.toLowerCase();
  if (v.includes("neder") || v.includes("holland") || v === "nl") return "Nederland";
  if (v.includes("belgi") || v === "be") return "België";
  if (v.includes("duits") || v.includes("germany") || v === "de") return "Duitsland";
  if (v.includes("noor") || v === "no") return "Noorwegen";
  if (v.includes("port") || v === "pt") return "Portugal";
  return value;
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cols.push(current.trim());
  return cols.map((c) => c.replace(/^"|"$/g, "").trim());
}

export function findDuplicateCompanies(
  parsed: Partial<Lead>[],
  existing: Lead[] = []
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const existingCompanies = new Set(
    existing.map((lead) => lead.company.toLowerCase().trim())
  );

  for (const lead of parsed) {
    const company = lead.company?.toLowerCase().trim();
    if (!company) continue;

    if (seen.has(company) || existingCompanies.has(company)) {
      duplicates.add(lead.company!);
    }
    seen.add(company);
  }

  return [...duplicates];
}

/** Group CSV rows by company — one account per company with primary contact from first row */
export function groupByCompany(rows: Partial<Lead>[]): Partial<Lead>[] {
  const map = new Map<string, Partial<Lead>>();
  for (const row of rows) {
    const key = row.company?.toLowerCase().trim();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}

export function parseLinkedInCSV(file: File): Promise<Partial<Lead>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          resolve([]);
          return;
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = splitCSVLine(lines[0], delimiter).map((h) =>
          h.toLowerCase().trim()
        );

        const results: Partial<Lead>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = splitCSVLine(lines[i], delimiter);
          if (cols.every((c) => !c)) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const mapped = COLUMN_MAP[h];
            if (mapped) row[mapped] = cols[idx] ?? "";
          });

          const firstName = row.firstName ?? "";
          const lastName = row.lastName ?? "";
          const contactName = `${firstName} ${lastName}`.trim();
          const company = row.company?.trim();

          if (!company) continue;

          results.push({
            company,
            contactName: contactName || "Onbekend",
            contactTitle: row.contactTitle ?? "",
            sector: row.sector ?? "",
            country: parseCountry(row.country ?? ""),
            employees: parseEmployees(row.employees ?? ""),
            linkedinUrl: row.linkedinUrl ?? "",
            linkedinCompanyUrl: row.linkedinCompanyUrl ?? "",
            website: row.website ?? "",
            status: "nieuw",
            notes: "Geïmporteerd via LinkedIn Sales Navigator CSV",
          });
        }

        resolve(groupByCompany(results));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
