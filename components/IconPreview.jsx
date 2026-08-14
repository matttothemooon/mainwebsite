import { resolveIcon } from "@/lib/icons";

// Shows exactly what SocialLinks will render for a link, so the admin panel
// never disagrees with the homepage.
export default function IconPreview({ link }) {
  const icon = resolveIcon(link);

  return (
    <span className="icon-preview" aria-hidden="true">
      {icon.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL
        <img src={icon.src} alt="" />
      ) : (
        <svg viewBox="0 0 24 24" focusable="false">
          <path d={icon.path} />
        </svg>
      )}
    </span>
  );
}
