import * as XLSX from "xlsx";

/** Sanitize a cell value to prevent CSV formula injection. */
function sanitizeCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = sanitizeCell(String(val));
          // Escape commas and quotes
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    ),
  ];

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
): void {
  if (data.length === 0) return;

  // Sanitize cell values to prevent formula injection
  const sanitized = data.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      clean[key] = typeof val === "string" ? sanitizeCell(val) : val;
    }
    return clean;
  });

  const ws = XLSX.utils.json_to_sheet(sanitized);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
