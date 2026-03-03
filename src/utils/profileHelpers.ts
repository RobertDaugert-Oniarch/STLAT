export type Level = "beginner" | "intermediate" | "advanced" | "expert";

export function getLevel(percentage: number): Level {
  if (percentage >= 90) return "expert";
  if (percentage >= 75) return "advanced";
  if (percentage >= 50) return "intermediate";
  return "beginner";
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
