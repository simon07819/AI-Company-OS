"use client";

export default function WebsitePreviewReply({ svg, title }: { svg?: string | null; title: string }) {
  return (
    <div className="ceo-website-preview-reply" aria-label={`Preview ${title}`}>
      {svg ? (
        <div className="ceo-website-preview-media" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="ceo-website-preview-fallback">
          <strong>{title}</strong>
          <span>Preview web en préparation.</span>
        </div>
      )}
    </div>
  );
}
