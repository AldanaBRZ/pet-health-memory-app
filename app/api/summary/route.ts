import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { SummaryResponse } from "../../../lib/types";

type SummaryRequest = {
  data?: unknown;
  rangeDays?: unknown;
  allowAi?: unknown;
};

type SummaryEvent = {
  type: string;
  date: string;
  title: string;
  detail: string;
  severity?: number;
  bodyArea?: string;
};

type SummarySymptom = {
  name: string;
  severity: number;
  bodyArea: string;
  dateTime: string;
  notes: string;
};

type SummaryExpense = {
  date: string;
  category: string;
  amount: number;
  note: string;
};

type SummaryMedication = {
  name: string;
  dosage: string;
  frequency: string;
  status: string;
};

type SummaryData = {
  profile: {
    name: string;
    species: string;
    breed: string;
    birthDate: string;
    conditions: string[];
    allergies: string[];
  };
  events: SummaryEvent[];
  symptoms: SummarySymptom[];
  expenses: SummaryExpense[];
  medications: SummaryMedication[];
};

const MAX_BODY_BYTES = 200_000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_AI_REQUESTS = 10;
const aiRequestBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let payload: SummaryRequest;

  try {
    payload = (await request.json()) as SummaryRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (JSON.stringify(payload).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const data = sanitizeSummaryData(payload.data);
  if (!data) {
    return NextResponse.json({ error: "Missing or invalid pet memory data" }, { status: 400 });
  }

  const rangeDays = payload.rangeDays === 7 || payload.rangeDays === 90 ? payload.rangeDays : 30;
  const fallback = makeServerLocalSummary(data, rangeDays);
  const wantsAi = payload.allowAi === true;

  if (!wantsAi || !process.env.OPENAI_API_KEY) {
    return NextResponse.json(fallback);
  }

  const authResult = await requireAuthenticatedUser(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const rateLimitKey = authResult.userId;
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json({ error: "AI summary rate limit reached. Try again later." }, { status: 429 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You summarize pet health notes for an owner preparing to speak with a veterinarian. Do not diagnose, prescribe, or imply certainty. Return compact JSON only with keys summary and questions."
          },
          {
            role: "user",
            content: JSON.stringify({
              rangeDays,
              pet: data.profile,
              recentEvents: recentByDate(data.events, "date", rangeDays),
              symptoms: recentByDate(data.symptoms, "dateTime", rangeDays),
              medications: data.medications.slice(0, 20),
              expenses: recentByDate(data.expenses, "date", rangeDays)
            })
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const result = (await response.json()) as { output_text?: string; output?: unknown };
    const text = result.output_text ?? collectOutputText(result.output);
    const parsed = parseSummaryJson(text);

    if (!parsed) {
      throw new Error("AI summary was not parseable");
    }

    return NextResponse.json({
      mode: "ai",
      summary: trimText(parsed.summary, 1_500),
      questions: parsed.questions.slice(0, 5).map((question) => trimText(question, 240))
    } satisfies SummaryResponse);
  } catch {
    return NextResponse.json(fallback);
  }
}

function sanitizeSummaryData(value: unknown): SummaryData | null {
  const record = asRecord(value);
  if (!record) return null;
  const profile = asRecord(record.profile);
  if (!profile) return null;

  return {
    profile: {
      name: readString(profile.name, "Pet"),
      species: readString(profile.species, ""),
      breed: readString(profile.breed, ""),
      birthDate: readString(profile.birthDate, ""),
      conditions: readStringArray(profile.conditions, 12),
      allergies: readStringArray(profile.allergies, 12)
    },
    events: readArray(record.events, 80).map(sanitizeEvent).filter((item): item is SummaryEvent => Boolean(item)),
    symptoms: readArray(record.symptoms, 80).map(sanitizeSymptom).filter((item): item is SummarySymptom => Boolean(item)),
    expenses: readArray(record.expenses, 120).map(sanitizeExpense).filter((item): item is SummaryExpense => Boolean(item)),
    medications: readArray(record.medications, 40).map(sanitizeMedication).filter((item): item is SummaryMedication => Boolean(item))
  };
}

function sanitizeEvent(value: unknown): SummaryEvent | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    type: readString(record.type, "event"),
    date: readString(record.date, ""),
    title: readString(record.title, "Untitled event"),
    detail: readString(record.detail, ""),
    severity: readNumber(record.severity),
    bodyArea: readString(record.bodyArea, "")
  };
}

function sanitizeSymptom(value: unknown): SummarySymptom | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: readString(record.name, "Symptom"),
    severity: readNumber(record.severity) ?? 0,
    bodyArea: readString(record.bodyArea, ""),
    dateTime: readString(record.dateTime, ""),
    notes: readString(record.notes, "")
  };
}

function sanitizeExpense(value: unknown): SummaryExpense | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    date: readString(record.date, ""),
    category: readString(record.category, ""),
    amount: readNumber(record.amount) ?? 0,
    note: readString(record.note, "")
  };
}

function sanitizeMedication(value: unknown): SummaryMedication | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: readString(record.name, "Medication"),
    dosage: readString(record.dosage, ""),
    frequency: readString(record.frequency, ""),
    status: readString(record.status, "")
  };
}

function makeServerLocalSummary(data: SummaryData, rangeDays: number): SummaryResponse {
  const cutoff = daysAgo(rangeDays);
  const events = data.events.filter((item) => new Date(item.date) >= cutoff).sort(sortByDateDesc("date"));
  const symptoms = data.symptoms.filter((item) => new Date(item.dateTime) >= cutoff).sort(sortByDateDesc("dateTime"));
  const expenses = data.expenses.filter((item) => new Date(item.date) >= cutoff);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const topSymptoms = symptoms.map((symptom) => `${symptom.name} (${symptom.severity}/5)`).slice(0, 3);

  return {
    mode: "local",
    summary: [
      `${data.profile.name} has ${events.length} health events, ${symptoms.length} symptom logs, and ${currency(expenseTotal)} in care expenses in the last ${rangeDays} days.`,
      topSymptoms.length ? `Most notable symptoms logged: ${topSymptoms.join(", ")}.` : "No symptoms were logged in this range.",
      events[0] ? `Most recent event: ${events[0].title} on ${formatDate(events[0].date)}.` : "No recent health events were logged."
    ].join("\n"),
    questions: [
      "Do the recent symptom patterns change the current monitoring plan?",
      "Are any medication side effects worth watching more closely?",
      "Should activity, physio, diet, or follow-up timing be adjusted?"
    ]
  };
}

async function requireAuthenticatedUser(request: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return { ok: false, status: 401, error: "Sign in before using AI summaries." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { ok: false, status: 503, error: "Supabase auth is not configured." };
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  return { ok: true, userId: data.user.id };
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = aiRequestBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    aiRequestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_AI_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function recentByDate<T extends Record<K, string>, K extends keyof T>(items: T[], key: K, rangeDays: number) {
  const cutoff = daysAgo(rangeDays);
  return items.filter((item) => new Date(item[key]) >= cutoff).sort(sortByDateDesc(key)).slice(0, 10);
}

function sortByDateDesc<T extends Record<K, string>, K extends keyof T>(key: K) {
  return (a: T, b: T) => new Date(b[key]).getTime() - new Date(a[key]).getTime();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readArray(value: unknown, max: number) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function readStringArray(value: unknown, max: number) {
  return readArray(value, max)
    .filter((item): item is string => typeof item === "string")
    .map((item) => trimText(item, 240));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? trimText(value, 500) : fallback;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function trimText(value: string, max: number) {
  return value.trim().slice(0, max);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function collectOutputText(output: unknown): string {
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.map((part) => {
        if (!part || typeof part !== "object") return "";
        if ("text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      });
    })
    .join("\n");
}

function parseSummaryJson(text: string): { summary: string; questions: string[] } | null {
  if (!text.trim()) return null;

  try {
    const parsed = JSON.parse(text) as { summary?: unknown; questions?: unknown };
    if (typeof parsed.summary === "string" && Array.isArray(parsed.questions)) {
      return {
        summary: parsed.summary,
        questions: parsed.questions.filter((item): item is string => typeof item === "string")
      };
    }
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as { summary?: unknown; questions?: unknown };
      if (typeof parsed.summary === "string" && Array.isArray(parsed.questions)) {
        return {
          summary: parsed.summary,
          questions: parsed.questions.filter((item): item is string => typeof item === "string")
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}
