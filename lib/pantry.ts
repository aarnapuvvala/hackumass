import { pantryCollection } from "./mongo"

export type PantryDetail = {
  days: string
  hours: string
  foods: string[]
  loaded: boolean
}

const emptyDetail: PantryDetail = { days: "", hours: "", foods: [], loaded: false }

const sources: Record<string, string[]> = {
  "Amherst Survival Center": [
    "https://amherstsurvival.org",
    "https://amherstsurvival.org/community-meals/",
    "https://amherstsurvival.org/pantry/",
    "https://amherstsurvival.org/fresh-food-distribution/",
  ],
  "Not Bread Alone": [
    "https://chd.org/programs-services/emergency-housing-assistance-western-ma/notbreadalone/",
  ],
  "First Baptist Church Food Pantry": ["https://www.fbcamherst.org/serving-our-neighbors"],
  "Wednesday Market at Bangs Community Center": ["https://amherstma.gov/Calendar.aspx?EID=28131"],
  "Amherst Survival Center Mobile Food Pantry": ["https://amherstsurvival.org/mobile-food-pantry/"],
}

const model = "grok-4"

export async function loadPantryDetails(names: string[]) {
  const date = todayKey()
  const cached = await readCache(date)
  const details: Record<string, PantryDetail> = {}
  const missing: string[] = []

  for (const name of names) {
    if (cached[name]) {
      details[name] = cached[name]
    } else {
      missing.push(name)
    }
  }

  const fresh: Record<string, PantryDetail> = {}
  for (const name of missing) {
    const detail = await readPantry(name)
    details[name] = detail
    if (detail.loaded && (detail.days || detail.hours || detail.foods.length > 0)) {
      fresh[name] = detail
    }
  }

  if (Object.keys(fresh).length > 0) {
    await writeCache(date, { ...cached, ...fresh })
  }
  return details
}

async function readPantry(name: string): Promise<PantryDetail> {
  const urls = sources[name]
  if (!urls) {
    return { ...emptyDetail, loaded: true }
  }

  const pages = await Promise.all(urls.map(async (url) => ({ url, text: await fetchPageText(url) })))
  const text = pages
    .filter((page) => page.text)
    .map((page) => `Source: ${page.url}\n${page.text}`)
    .join("\n\n")
  if (!text) {
    return emptyDetail
  }
  return extractWithGrok(name, text)
}

async function fetchPageText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HackUMass food bank reader)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    })
    if (!response.ok) {
      return ""
    }
    return htmlToText(await response.text()).slice(0, 7000)
  } catch {
    return ""
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)))
    .replace(/\s+/g, " ")
    .trim()
}

async function extractWithGrok(name: string, text: string): Promise<PantryDetail> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return emptyDetail
  }

  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return only JSON with string fields days and hours, and a foods array of strings.",
          },
          {
            role: "user",
            content: [
              `Today is ${today} in Amherst, Massachusetts.`,
              `Read the scraped text for ${name} and return only the schedule and food offered today.`,
              "days: the days of the week this place serves food or distributes food, as a short phrase.",
              "hours: the hours on those days, as a short phrase.",
              "foods: specific foods served or given out today. Use an empty list when today is not a service day, when the page only has sample menus, or when it only says meals, groceries, or food without naming items for today.",
              "A single past calendar date is not a repeating weekly schedule unless the page says the event repeats. If that date is not today, foods must be empty.",
              "Do not invent anything that is not in the text. Use an empty string when days or hours are missing.",
              "",
              text,
            ].join("\n"),
          },
        ],
      }),
    })
    if (!response.ok) {
      console.error("Grok pantry request failed", response.status)
      return emptyDetail
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return parseDetail(payload.choices?.[0]?.message?.content ?? "")
  } catch (error) {
    console.error("Grok pantry request failed", error instanceof Error ? error.message : "unknown error")
    return emptyDetail
  }
}

function parseDetail(raw: string): PantryDetail {
  try {
    const parsed = JSON.parse(raw) as { days?: unknown; hours?: unknown; foods?: unknown }
    const foods = Array.isArray(parsed.foods)
      ? parsed.foods.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 12)
      : []
    return {
      days: typeof parsed.days === "string" ? parsed.days.trim() : "",
      hours: typeof parsed.hours === "string" ? parsed.hours.trim() : "",
      foods,
      loaded: true,
    }
  } catch {
    return emptyDetail
  }
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

async function readCache(date: string) {
  try {
    const records = await (await pantryCollection()).find({ date }).toArray()
    const places: Record<string, PantryDetail> = {}
    for (const record of records) {
      places[record.name] = {
        days: record.days,
        hours: record.hours,
        foods: record.foods,
        loaded: true,
      }
    }
    return places
  } catch (error) {
    console.error("Could not read pantry records", error instanceof Error ? error.message : "unknown error")
    return {}
  }
}

async function writeCache(date: string, places: Record<string, PantryDetail>) {
  try {
    const collection = await pantryCollection()
    const updatedAt = new Date()
    await Promise.all(
      Object.entries(places).map(([name, detail]) =>
        collection.updateOne(
          { name, date },
          {
            $set: {
              name,
              date,
              days: detail.days,
              hours: detail.hours,
              foods: detail.foods,
              updatedAt,
            },
          },
          { upsert: true }
        )
      )
    )
  } catch (error) {
    console.error("Could not save pantry records", error instanceof Error ? error.message : "unknown error")
  }
}
