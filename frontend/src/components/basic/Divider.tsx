export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-t border-fog ${className}`} role="presentation" />;
}
