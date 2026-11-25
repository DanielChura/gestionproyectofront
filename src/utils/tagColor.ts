const TAG_PALETTES = [
  "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
  "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
];

function tagHash(value: string): number {
  const clean = value.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return hash % TAG_PALETTES.length;
}

export function tagColor(value: string): string {
  return TAG_PALETTES[tagHash(value)];
}
