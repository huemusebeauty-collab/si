export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white p-6 shadow-rest">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-stone">{label}</p>
      <p className="mt-2 font-display text-[32px] font-semibold text-ink">{value}</p>
    </div>
  );
}
