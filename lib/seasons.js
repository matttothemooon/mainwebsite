// Seasonal looks for the site. Pure date logic, shared by the layout (which
// sets <html data-season>) and the admin panel.

export const SEASONS = {
  halloween: { label: "Halloween", window: "Oct 20 – 31" },
  holidays: { label: "Holidays", window: "Dec 10 – Jan 1" },
  valentine: { label: "Valentine's", window: "Feb 12 – 14" },
  anniversary: { label: "Twitch anniversary", window: "your anniversary date" },
};

const md = (d) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); // Oct 20 -> 1020

// settings: { mode: "auto" | "off" | <season>, anniversary: "MM-DD", since: year }
// Returns { season, years } where season is a key of SEASONS or null.
export function pickSeason(now = new Date(), settings = {}) {
  const mode = settings?.mode || "auto";
  if (mode === "off") return { season: null };
  const years = anniversaryYears(now, settings);
  if (mode !== "auto") return { season: SEASONS[mode] ? mode : null, years: mode === "anniversary" ? years : undefined };

  const day = md(now);
  const anniversary = parseMonthDay(settings?.anniversary);
  if (anniversary && anniversary === day) return { season: "anniversary", years };
  if (day >= 1020 && day <= 1031) return { season: "halloween" };
  if (day >= 1210 || day <= 101) return { season: "holidays" };
  if (day >= 212 && day <= 214) return { season: "valentine" };
  return { season: null };
}

export function parseMonthDay(value) {
  const m = /^(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!m) return null;
  const month = Number(m[1]);
  const date = Number(m[2]);
  if (month < 1 || month > 12 || date < 1 || date > 31) return null;
  return month * 100 + date;
}

function anniversaryYears(now, settings) {
  const since = Number(settings?.since);
  if (!Number.isInteger(since) || since < 2006 || since > now.getUTCFullYear()) return undefined;
  return now.getUTCFullYear() - since;
}
