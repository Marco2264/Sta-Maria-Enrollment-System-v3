import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentSchoolYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based, June is 5
  
  // If month is before June, school year started last year
  const syStart = currentMonth < 5 ? currentYear - 1 : currentYear;
  return `${syStart}-${syStart + 1}`;
}
