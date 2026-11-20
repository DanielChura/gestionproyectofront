export interface PriorityTone {
  text: string;
  texto: string;
}

export const priorityTones: Record<number, PriorityTone> = {
  1: { text: "text-[#be2937]", texto: "Urgente" },
  2: { text: "text-[#a66a08]", texto: "Alta" },
  3: { text: "text-[#4267c5]", texto: "Normal" },
  4: { text: "text-[#707b80]", texto: "Baja" },
};
