/* Parse description — handles HTML tags, \n, numbered lists, bullets */
export function FormattedDescription({ text }: { text?: string }) {
  if (!text || text === "Sem descrição") {
    return <p className="text-xs text-[hsl(var(--task-text-muted))] italic">Sem descrição disponível</p>;
  }

  // Check if text contains HTML tags
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  if (hasHtml) {
    // Strip dangerous tags but keep formatting ones
    const sanitized = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "");
    return (
      <div
        className="text-xs text-[hsl(var(--task-text))] leading-relaxed max-w-none [&_br]:block [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_li]:text-[hsl(var(--task-text))] [&_strong]:text-[hsl(var(--task-yellow))] [&_b]:text-[hsl(var(--task-yellow))] [&_a]:text-[hsl(var(--task-purple))] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // Split by actual newlines, \n literals, or numbered patterns
  const lines = text
    .replace(/\n/g, "\n")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const stepMatch = line.match(/^(\d+)[.)]\s*(.*)/);
          if (stepMatch) {
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--task-yellow)/0.12)] text-[10px] font-bold text-[hsl(var(--task-yellow))] border border-[hsl(var(--task-yellow)/0.2)]">
                  {stepMatch[1]}
                </span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed pt-0.5">{stepMatch[2]}</p>
              </div>
            );
          }
          const bulletMatch = line.match(/^[-•*]\s*(.*)/);
          if (bulletMatch) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--task-purple))]" />
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{bulletMatch[1]}</p>
              </div>
            );
          }
          const labelMatch = line.match(/^([A-ZÀ-Ú][a-zà-ú]*(?:\s[a-zà-ú]+)*):\s*(.*)/);
          if (labelMatch) {
            return (
              <div key={i}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--task-yellow))]">{labelMatch[1]}</span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed mt-0.5">{labelMatch[2]}</p>
              </div>
            );
          }
          return <p key={i} className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{line}</p>;
        })}
      </div>
    );
  }

  return <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed whitespace-pre-wrap">{text}</p>;
}
