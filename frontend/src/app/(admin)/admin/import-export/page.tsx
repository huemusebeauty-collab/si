"use client";
import { useRef, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

function ImportExportContent() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: { row: number; reason: string }[] } | null>(null);

  async function handleImport() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    const csv = await file.text();
    const res = await adminApi.importProductsCsv(csv);
    setResult(res);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Import / Export</h1>

      <div className="rounded-md bg-white p-6 shadow-rest">
        <h2 className="mb-3 font-semibold text-ink">Export Products</h2>
        <a href={adminApi.exportProductsCsvUrl()} target="_blank" rel="noreferrer">
          <Button variant="outline">Download Products CSV</Button>
        </a>
      </div>

      <RoleGate module="products" level="full">
        <div className="rounded-md bg-white p-6 shadow-rest">
          <h2 className="mb-3 font-semibold text-ink">Import Products (CSV)</h2>
          <p className="mb-3 text-[13px] text-stone">Columns: slug, name, category, price</p>
          <input ref={fileInput} type="file" accept=".csv" aria-label="Choose CSV file to import" className="mb-3" />
          <Button variant="primary" onClick={handleImport}>Import</Button>
          {result && (
            <div className="mt-4">
              <Alert tone={result.failed.length === 0 ? "success" : "warning"}>
                {result.succeeded} row(s) imported successfully. {result.failed.length} row(s) failed.
              </Alert>
              {result.failed.length > 0 && (
                <ul className="mt-2 text-[13px] text-error">
                  {result.failed.map((f) => <li key={f.row}>Row {f.row}: {f.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </RoleGate>
    </div>
  );
}

export default function ImportExportPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><ImportExportContent /></AdminShell>
    </RequireAdminAuth>
  );
}
