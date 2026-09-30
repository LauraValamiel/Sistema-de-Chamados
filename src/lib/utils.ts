import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarNome(nome: string | undefined | null) {
  if (!nome) return "";

  return nome
    .toLowerCase()
    .split(" ")
    .map((palavra) => {
      if (["da", "de", "do", "das", "dos"].includes(palavra)) {
        return palavra; // Mantém as preposições em minúsculo
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1); // Capitaliza a primeira letra
    })
    .join(" ");
}
