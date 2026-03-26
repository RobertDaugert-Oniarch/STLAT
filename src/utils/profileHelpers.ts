export type Level = "novice" | "beginner" | "elementary" | "intermediate" | "advanced" | "expert" | "master";

const LEVEL_THRESHOLDS: { min: number; level: Level }[] = [
  { min: 90, level: "master" },
  { min: 80, level: "expert" },
  { min: 70, level: "advanced" },
  { min: 55, level: "intermediate" },
  { min: 40, level: "elementary" },
  { min: 20, level: "beginner" },
];

export function getLevel(percentage: number): Level {
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (percentage >= min) return level;
  }
  return "novice";
}

export type GreetingKey =
  | "greetingMorning"
  | "greetingAfternoon"
  | "greetingEvening"
  | "greetingNight";

export function getGreetingKey(): GreetingKey {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 18) return "greetingAfternoon";
  if (hour >= 18) return "greetingEvening";
  return "greetingNight";
}

export function getInitials(fullUsername: string): string {
  const name = fullUsername.split("#")[0];
  const uppers = name.match(/[A-Z]/g);
  if (uppers && uppers.length >= 2) return uppers[0] + uppers[1];
  return name.slice(0, 2).toUpperCase();
}
