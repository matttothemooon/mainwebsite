// The stats strip shown on the home and "Work with me" pages.

export function formatCount(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K`;
  return String(n);
}

// `servers`: the Discord servers shown on the site (see lib/discordConnect).
export function profileStats(profile, { servers = [] } = {}) {
  const exp = profile?.experience || {};
  const communities = [...(exp.active || []), ...(exp.past || [])];
  const followers = communities.reduce(
    (sum, e) => sum + (Number.isFinite(e.followers) ? e.followers : 0),
    0
  );
  const years = profile?.stats?.yearsModding;
  const discordMembers = servers.reduce((sum, s) => sum + (Number.isFinite(s.members) ? s.members : 0), 0);
  return [
    years ? { value: `${years}+`, label: "years moderating" } : null,
    followers > 0 ? { value: formatCount(followers), label: "combined followers" } : null,
    discordMembers > 0 ? { value: formatCount(discordMembers), label: "Discord members" } : null,
    communities.length ? { value: String(communities.length), label: "communities" } : null,
  ].filter(Boolean);
}
