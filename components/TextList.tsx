import type { TextRecord } from "@/lib/world";

export function TextList({
  title,
  texts,
  empty,
}: {
  title: string;
  texts: TextRecord[];
  empty: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
        {title} ({texts.length})
      </h3>
      {texts.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {texts.map((t) => (
            <li key={t.uri} className="text-sm">
              <span className="font-mono text-zinc-400 dark:text-zinc-500 mr-2">
                ({t.xPosition}, {t.yPosition})
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">{t.text}</span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2 font-mono">
                {t.authorDid}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
