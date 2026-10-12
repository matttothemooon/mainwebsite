function safeHref(value) {
  try {
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function inline(text) {
  const pattern = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  return text.split(pattern).map((part, index) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <u key={index}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <s key={index}>{part.slice(2, -2)}</s>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const href = safeHref(link ? link[2] : part);
    if (href) {
      const external = /^https?:/i.test(href);
      return (
        <a
          key={index}
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {link?.[1] || part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function safeImage(value) {
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export default function PageContent({ content = "" }) {
  const lines = String(content).split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let code = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {list.map((item, index) => <li key={index}>{inline(item)}</li>)}
      </ul>
    );
    list = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(
      <blockquote key={`quote-${blocks.length}`}>
        {quote.map((line, index) => <p key={index}>{inline(line)}</p>)}
      </blockquote>
    );
    quote = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (code) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join("\n")}</code></pre>);
        code = null;
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        code = [];
      }
      return;
    }
    if (code) {
      code.push(line);
      return;
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      flushQuote();
      const src = safeImage(image[2]);
      if (src) {
        blocks.push(
          // eslint-disable-next-line @next/next/no-img-element -- page content uses admin-authored image URLs.
          <img className="page-content__image" key={`img-${blocks.length}`} src={src} alt={image[1]} loading="lazy" />
        );
      }
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    const quoted = line.match(/^\s*>\s?(.*)$/);

    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      blocks.push(<Tag key={`h-${blocks.length}`}>{inline(heading[2])}</Tag>);
    } else if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      list.push((bullet || numbered)[1]);
    } else if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
    } else {
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
  });

  if (code) blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join("\n")}</code></pre>);
  flushParagraph();
  flushList();
  flushQuote();

  return <div className="page-content">{blocks}</div>;
}
