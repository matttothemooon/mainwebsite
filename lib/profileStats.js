// The stats strip shown on the home and "Work with me" pages.

export function formatCount(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K`;
  return String(n);
}

export function profileStats(profile) {
  const exp = profile?.experience || {};
  const communities = [...(exp.active || []), ...(exp.past || [])];
  const followers = communities.reduce(
    (sum, e) => sum + (Number.isFinite(e.followers) ? e.followers : 0),
    0
  );
  const years = profile?.stats?.yearsModding;
  return [
    years ? { value: `${years}+`, label: "years moderating" } : null,
    followers > 0 ? { value: formatCount(followers), label: "combined followers" } : null,
    communities.length ? { value: String(communities.length), label: "communities" } : null,
  ].filter(Boolean);
}
