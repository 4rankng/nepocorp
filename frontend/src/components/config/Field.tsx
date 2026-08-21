export function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return <div className="field"><label htmlFor={htmlFor}>{label}</label>{children}</div>;
}
