export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

export function splitCSVLine(line: string, delimiter: string): string[] {
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

export function parseCsvText(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 1) {
    return { headers: [], rows: [], delimiter: "," };
  }

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = splitCSVLine(lines[0], delimiter);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);
    if (cols.every((c) => !c)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows, delimiter };
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseCsvText(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function sampleValues(csv: ParsedCsv, header: string, limit = 2): string[] {
  const samples: string[] = [];
  for (const row of csv.rows) {
    const v = row[header]?.trim();
    if (v && !samples.includes(v)) samples.push(v);
    if (samples.length >= limit) break;
  }
  return samples;
}
