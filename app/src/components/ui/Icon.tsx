/** Иконка Material Symbols по имени (https://fonts.google.com/icons) */
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined leading-none select-none ${className}`} aria-hidden>
      {name}
    </span>
  );
}
