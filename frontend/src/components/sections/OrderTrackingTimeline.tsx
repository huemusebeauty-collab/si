// Order Tracking Timeline — Phase 4 §17 Page Section / §11 Progress
// Indicators (stepped indicator in Rose).
export interface TimelineStep {
  label: string;
  complete: boolean;
}

export function OrderTrackingTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-center" aria-label="Order status">
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-1 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
              step.complete ? "bg-primary-rose text-white" : "bg-fog text-stone"
            }`}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className={`text-[13px] leading-[18px] ${step.complete ? "text-ink" : "text-stone"}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-fog sm:block" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
