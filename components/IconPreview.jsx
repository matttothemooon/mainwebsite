import LinkIcon from "./LinkIcon";

// Shows exactly what SocialLinks will render for a link, so the admin panel
// never disagrees with the homepage.
export default function IconPreview({ link }) {
  return (
    <span className="icon-preview" aria-hidden="true">
      <LinkIcon link={link} />
    </span>
  );
}
