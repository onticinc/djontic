import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeEvent, type EventRecord } from "@/lib/event-types";
import { readEventsStore, writeEventsStore } from "@/lib/events";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await readEventsStore());
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { events?: unknown };

  if (!Array.isArray(body.events)) {
    return NextResponse.json(
      { error: "events array is required" },
      { status: 400 },
    );
  }

  const events: EventRecord[] = [];
  for (const item of body.events) {
    if (!item || typeof item !== "object") {
      return NextResponse.json(
        { error: "Each event must include a date, name, location, city, and state." },
        { status: 400 },
      );
    }
    const event = normalizeEvent(item as Record<string, unknown>);
    if (!event) {
      return NextResponse.json(
        { error: "Each event must include a date, name, location, city, and state." },
        { status: 400 },
      );
    }
    events.push(event);
  }

  await writeEventsStore({
    updatedAt: new Date().toISOString(),
    events,
  });

  return NextResponse.json(await readEventsStore());
}
