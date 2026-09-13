import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "play-counts.json");

type PlayCountsStore = {
  updatedAt: string;
  counts: Record<string, number>;
};

async function readStore(): Promise<PlayCountsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as PlayCountsStore;
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      counts: parsed.counts ?? {},
    };
  } catch {
    return { updatedAt: new Date().toISOString(), counts: {} };
  }
}

async function writeStore(store: PlayCountsStore) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(
    DATA_PATH,
    `${JSON.stringify(
      { ...store, updatedAt: new Date().toISOString() },
      null,
      2,
    )}\n`,
  );
}

export async function getPlayCounts(): Promise<Record<string, number>> {
  const store = await readStore();
  return store.counts;
}

export async function getPlayCount(mixId: string): Promise<number> {
  const counts = await getPlayCounts();
  return counts[mixId] ?? 0;
}

export async function incrementPlayCount(mixId: string): Promise<number> {
  const store = await readStore();
  const next = (store.counts[mixId] ?? 0) + 1;
  store.counts[mixId] = next;
  await writeStore(store);
  return next;
}
