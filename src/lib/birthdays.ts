export const MIN_BIRTH_YEAR = 1900;

export const BIRTH_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function cleanBirthYearInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function parseBirthMonthYear(monthValue: unknown, yearValue: unknown): { birthMonth: number; birthYear: number } | null {
  const birthMonth = Number(monthValue);
  const birthYear = Number(yearValue);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) return null;
  if (!Number.isInteger(birthYear) || birthYear < MIN_BIRTH_YEAR || birthYear > currentYear) return null;
  if (birthYear === currentYear && birthMonth > currentMonth) return null;

  return { birthMonth, birthYear };
}

export function formatBirthMonthYear(birthMonth: number, birthYear: number): string {
  const month = BIRTH_MONTHS.find((option) => option.value === birthMonth);
  return `${month?.label ?? birthMonth} ${birthYear}`;
}

export function isAtLeast18(birthMonth: number, birthYear: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed

  const age = currentYear - birthYear;
  if (age > 18) return true;
  if (age === 18) return currentMonth >= birthMonth;
  return false;
}

