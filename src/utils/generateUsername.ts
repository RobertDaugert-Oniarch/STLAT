import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const ADJECTIVES = [
  "Silent", "Neon", "Void", "Frost", "Hollow", "Astral", "Cryptic", "Feral",
  "Iron", "Ember", "Lunar", "Rapid", "Drift", "Sonic", "Blaze", "Glitch",
  "Rogue", "Storm", "Shade", "Venom", "Apex", "Dusk", "Primal", "Ghost",
  "Vivid", "Toxic", "Swift", "Steel", "Coral", "Stark", "Noble", "Faded",
  "Brave", "Lucid", "Wired", "Frozen", "Arcane", "Mystic", "Savage", "Bright",
];

const NOUNS = [
  "Fox", "Sage", "Owl", "Lynx", "Echo", "Wraith", "Phantom", "Wolf",
  "Hawk", "Viper", "Raven", "Spark", "Blade", "Fang", "Claw", "Dune",
  "Flame", "Thorn", "Bolt", "Shard", "Drake", "Jaguar", "Puma", "Cobra",
  "Falcon", "Mantis", "Orbit", "Pulse", "Nexus", "Flare", "Onyx", "Titan",
  "Cipher", "Specter", "Warden", "Hunter", "Ranger", "Striker", "Vertex", "Zenith",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTag(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

export function formatUsername(name: string, tag: number): string {
  return `${name}#${tag}`;
}

/**
 * Generate a unique username and reserve it in Firestore.
 * Tries up to `maxAttempts` times to find an unused combination.
 */
export async function generateUniqueUsername(
  uid: string,
  maxAttempts = 10,
): Promise<{ name: string; tag: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    const name = `${randomItem(ADJECTIVES)}${randomItem(NOUNS)}`;
    const tag = randomTag();
    const full = formatUsername(name, tag);

    const ref = doc(db, "usernames", full);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, { uid });
      return { name, tag };
    }
  }

  throw new Error("Failed to generate a unique username. Please try again.");
}
