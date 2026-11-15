import type { Person, PersonId } from "@/lib/firm-data";

// Each person keeps one name colour in every chat, dark enough to read on a cream bubble.

const COLOURS: Partial<Record<PersonId, string>> = {
  meera: "#7b4a30", // laterite
  arjun: "#6f4724", // teak
  rohan: "#5e4410", // brass
  kavya: "#3b4d6e", // indigo
  vikram: "#9c3a28", // brick
  lakshmi: "#4f5a1f", // olive
  ananya: "#6d3550", // plum
  karan: "#3b5e66", // slate
  suresh: "#3d5243", // kota
  manjunath: "#4f5a1f", // olive
  ravi: "#6d3550", // plum
  prakash: "#6f4724", // teak
  imran: "#3b5e66", // slate
  divya: "#7b4a30", // laterite
  shalini: "#5a3e6b", // aubergine
};

export function colourOf(id: PersonId): string {
  return COLOURS[id] ?? "#2a1a12";
}

/** "Senior architect", "Client relations": the title up to its first comma. */
export function roleWords(person: Person | undefined): string {
  return person ? person.title.split(",")[0] : "";
}
