import { Client } from "@notionhq/client";

export type EventItem = {
  id: string;
  title: string;
  date: string | null;
  dateLabel: string;
  timeLabel: string | null;
  location: string | null;
  eventType: string | null;
  description: string | null;
  url: string | null;
};

const PUBLIC_STATUSES = new Set([
  "Confirmed",
  "Holding Date",
  "Contract Sent",
  "Invoice Sent",
  "Need Deposit",
  "Need Payment",
  "SEND INVOICE",
]);

function getNotionClient() {
  const auth = process.env.NOTION_API_KEY?.trim();
  if (!auth) return null;

  const notionVersion = process.env.NOTION_VERSION?.trim();
  return new Client({
    auth,
    ...(notionVersion ? { notionVersion } : {}),
  });
}

function getDatabaseId() {
  return (
    process.env.NOTION_EVENTS_DATABASE_ID?.trim() ||
    process.env.NOTION_DATABASE_ID?.trim() ||
    ""
  );
}

function plainText(
  richText: Array<{ plain_text?: string }> | undefined,
): string {
  if (!richText?.length) return "";
  return richText.map((t) => t.plain_text ?? "").join("").trim();
}

function formatDate(iso: string | null): string {
  if (!iso) return "Date TBA";
  const date = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Boise",
  }).format(date);
}

function formatTime(iso: string | null): string | null {
  if (!iso || !iso.includes("T")) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Boise",
  }).format(date);
}

type NotionProperty = {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  date?: { start?: string | null } | null;
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  url?: string | null;
  place?: { name?: string; address?: string } | null;
  [key: string]: unknown;
};

function readTitle(properties: Record<string, NotionProperty>): string {
  const prop = properties.Name ?? properties.Title;
  if (prop?.type === "title") return plainText(prop.title) || "Untitled Event";
  for (const value of Object.values(properties)) {
    if (value?.type === "title") return plainText(value.title) || "Untitled Event";
  }
  return "Untitled Event";
}

function readDate(
  properties: Record<string, NotionProperty>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const prop = properties[key];
    if (prop?.type === "date" && prop.date?.start) return prop.date.start;
  }
  return null;
}

function readMultiSelect(
  properties: Record<string, NotionProperty>,
  key: string,
): string | null {
  const prop = properties[key];
  if (prop?.type !== "multi_select" || !prop.multi_select?.length) return null;
  return prop.multi_select
    .map((item) => item.name)
    .filter(Boolean)
    .join(", ");
}

function readSelect(
  properties: Record<string, NotionProperty>,
  key: string,
): string | null {
  const prop = properties[key];
  if (prop?.type === "select" && prop.select?.name) return prop.select.name;
  return null;
}

function readPlace(properties: Record<string, NotionProperty>): string | null {
  const prop = properties.Place;
  if (prop?.type === "place" && prop.place) {
    return prop.place.name || prop.place.address || null;
  }
  return null;
}

/** Pull a location hint from titles like "Wedding - Larc Hill". */
function locationFromTitle(title: string): string | null {
  const parts = title.split(" - ").map((part) => part.trim());
  if (parts.length < 2) return null;
  return parts[parts.length - 1] || null;
}

async function resolveDataSourceId(
  notion: Client,
  databaseId: string,
): Promise<string> {
  if (process.env.NOTION_DATA_SOURCE_ID?.trim()) {
    return process.env.NOTION_DATA_SOURCE_ID.trim();
  }

  const database = (await notion.databases.retrieve({
    database_id: databaseId,
  })) as {
    data_sources?: Array<{ id: string }>;
  };

  return database.data_sources?.[0]?.id ?? databaseId;
}

function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boise",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getUpcomingEvents(): Promise<{
  events: EventItem[];
  configured: boolean;
  error?: string;
}> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();

  if (!notion || !databaseId) {
    return { events: [], configured: false };
  }

  try {
    const dataSourceId = await resolveDataSourceId(notion, databaseId);
    const today = todayIsoDate();

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        and: [
          {
            property: "Event Date",
            date: { on_or_after: today },
          },
          {
            or: [...PUBLIC_STATUSES].map((status) => ({
              property: "Status",
              select: { equals: status },
            })),
          },
        ],
      },
      sorts: [{ property: "Event Date", direction: "ascending" }],
      page_size: 50,
    });

    const events = response.results
      .map((page) => {
        if (!("properties" in page)) return null;
        const properties = page.properties as Record<string, NotionProperty>;
        const title = readTitle(properties);
        const date = readDate(properties, ["Event Date", "Date"]);
        const startTime = readDate(properties, ["Start Time"]);
        const eventType = readMultiSelect(properties, "Event Type");
        const location =
          readPlace(properties) || locationFromTitle(title);

        return {
          id: page.id,
          title,
          date,
          dateLabel: formatDate(date),
          timeLabel: formatTime(startTime),
          location,
          eventType,
          description: null as string | null,
          url: null as string | null,
        } satisfies EventItem;
      })
      .filter((event): event is EventItem => event !== null);

    return { events, configured: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load events from Notion.";
    console.error("Notion events error:", error);
    return { events: [], configured: true, error: message };
  }
}
