import type { Sheet, Cell } from "write-excel-file/universal";

type ExportValue = string | number | Date | null | undefined;
export type FinanceExportTable = { name: string; headers: string[]; rows: ExportValue[][] };
export function financeExportSheets(tables: FinanceExportTable[]): Pick<Sheet<Blob>, "sheet" | "columns" | "data">[] {
  const cell = (value: ExportValue): Cell => value instanceof Date ? { value, type: Date, format: "yyyy-mm-dd hh:mm:ss" } : typeof value === "number" ? { value, type: Number, format: "#,##0.00" } : { value: value ?? "", type: String };
  return tables.map(table => ({ sheet: table.name, columns: table.headers.map(() => ({ width: 24 })), data: [table.headers.map(value => ({ value, type: String, fontWeight: "bold" as const })), ...table.rows.map(row => row.map(cell))] }));
}
export async function downloadFinanceExcel(tables: FinanceExportTable[], filename: string) {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const blob = await writeExcelFile(financeExportSheets(tables)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${filename}.xlsx`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function matchesFinanceDate(value: string | Date, from: string, until: string) {
  const time = new Date(value).getTime();
  const end = until ? new Date(`${until}T00:00:00`) : null;
  if (end) end.setDate(end.getDate() + 1);
  return (!from || time >= new Date(`${from}T00:00:00`).getTime()) && (!end || time < end.getTime());
}
