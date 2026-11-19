import { formatCount } from "@/lib/profileStats";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", manager: "Manager", mod: "Moderator" };

// Discord servers the owner runs or moderates, from their connected account.
export default function DiscordServers({ servers = [] }) {
  if (!servers.length) return null;
  return (
    <ul className="dc-grid">
      {servers.map((s, i) => (
        <li key={s.id} data-reveal style={{ "--d": `${Math.min(i * 30, 300)}ms` }}>
          <div className="card dc">
            <span className="dc__icon">
              {s.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- Discord CDN icon
                <img src={s.icon} alt="" loading="lazy" width="48" height="48" />
              ) : (
                <span>{s.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2) || "#"}</span>
              )}
            </span>
            <span className="dc__text">
              <span className="dc__name">{s.name}</span>
              <span className="dc__meta">
                {Number.isFinite(s.members) && <>{formatCount(s.members)} members</>}
                {Number.isFinite(s.online) && (
                  <>
                    <span className="dc__dot" aria-hidden="true" />
                    {formatCount(s.online)} online
                  </>
                )}
              </span>
            </span>
            <span className="dc__role">{ROLE_LABEL[s.role] || ""}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
