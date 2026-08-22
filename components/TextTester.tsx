"use client";

import { useState } from "react";

type ListResponse = {
  records: { uri: string; cid: string; value: Record<string, unknown> }[];
};

export function TextTester() {
  const [text, setText] = useState("hello world");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [records, setRecords] = useState<ListResponse["records"] | null>(null);

  async function post() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, xPosition: x, yPosition: y }),
      });
      setResult(JSON.stringify(await res.json(), null, 2));
      if (res.ok) await list();
    } finally {
      setLoading(false);
    }
  }

  async function list() {
    const res = await fetch("/api/text");
    const body = await res.json();
    if (res.ok) setRecords(body.records);
    else setResult(JSON.stringify(body, null, 2));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-2 py-1 bg-transparent"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="number"
          className="w-20 rounded border px-2 py-1 bg-transparent"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
        />
        <input
          type="number"
          className="w-20 rounded border px-2 py-1 bg-transparent"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={post}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
        >
          Post test text to my PDS
        </button>
        <button
          onClick={list}
          disabled={loading}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          List my records
        </button>
      </div>

      {result && (
        <pre className="text-xs whitespace-pre-wrap rounded bg-zinc-100 dark:bg-zinc-800 p-2">
          {result}
        </pre>
      )}

      {records && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">
            {records.length} record{records.length === 1 ? "" : "s"} in
            com.ourworldsoftext.text
          </h3>
          <pre className="text-xs whitespace-pre-wrap rounded bg-zinc-100 dark:bg-zinc-800 p-2">
            {JSON.stringify(records, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
