import type { ICONS } from "@/themes/sections";

type IconKey = (typeof ICONS)[number];

/** Trazos de 24×24 para cada ícono de la biblioteca (línea, sin relleno). */
const PATHS: Record<IconKey, string[]> = {
  truck: ["M3 6h11v10H3z", "M14 9h4l3 3.5V16h-7", "M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
  shield: ["M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z", "m8.8 12 2.2 2.2 4.4-4.4"],
  leaf: ["M5 19c0-8 5-13 15-14-1 10-6 15-14 15", "M5 19c3-4 6-7 10-9"],
  star: ["m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3.5 2"],
  gift: ["M4 11h16v9H4z", "M3 7.5h18V11H3z", "M12 7.5V20", "M12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5", "M12 7.5C13.5 4 17 4 17 6s-3 1.5-5 1.5"],
  heart: ["M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"],
  chat: ["M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z", "M8.5 12h.01M12 12h.01M15.5 12h.01"],
  pin: ["M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  sparkle: ["M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z", "M19 16c.2 1.4.8 2 2 2.2-1.2.2-1.8.8-2 2.2-.2-1.4-.8-2-2-2.2 1.2-.2 1.8-.8 2-2.2z"],
  check: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m8 12.2 2.8 2.8L16.2 9.5"],
  box: ["m12 3 8 4.5v9L12 21l-8-4.5v-9z", "m4 7.5 8 4.5 8-4.5", "M12 12v9"],
  card: ["M3 6h18v12H3z", "M3 10h18", "M7 15h4"],
  return: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
};

export function FeatureIcon({ name, size = 28 }: { name: string; size?: number }) {
  const paths = PATHS[(name in PATHS ? name : "sparkle") as IconKey];
  return (
    <svg className="sf-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
