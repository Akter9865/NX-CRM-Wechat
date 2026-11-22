import { cn } from "@/lib/utils";

/** NX CRM logo mark — a chat bubble with a check, on the brand green.
 *  Pure SVG (no image request), scales with `className` size. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-elev-1",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="none">
        <path
          d="M12 3.5a8.5 8.5 0 0 0-7.37 12.74L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z"
          fill="currentColor"
          fillOpacity=".95"
        />
        <path d="m8.6 12.2 2.2 2.2 4.6-4.7" stroke="#128C7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
