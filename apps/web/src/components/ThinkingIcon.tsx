export function ThinkingIcon({ size = 17, ...props }: { size?: number; "data-sentiment-icon"?: string; "aria-hidden"?: boolean }) {
  return <svg {...props} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="11" r="9"/><path d="M8 10h.01M16 10h.01M8 15h8"/></svg>;
}
