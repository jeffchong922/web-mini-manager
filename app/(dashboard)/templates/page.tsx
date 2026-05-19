"use client";

import { useState, useEffect, useMemo } from "react";
import { wxFetch } from "@/lib/wx-proxy";

type TemplateItem = {
  draftId: number;
  templateId: number;
  userVersion: string;
  userDesc: string;
  templateType: number;
  createTime: number;
  sourceMiniProgramAppid: string;
  sourceMiniProgram: string;
};

type ResponseData<T> = {
  code: string;
  data: T;
  message: string;
  succeed: boolean;
};

const PAGE_SIZE = 10;

function formatTimestamp(ts: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TemplatesPage() {
  const [items, setItems] = useState<TemplateItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await wxFetch<ResponseData<TemplateItem[]>>(
          "gettemplatelist"
        );
        if (!cancelled) {
          if (res.code === "000000" && res.succeed) {
            setItems(res.data ?? []);
          } else {
            setError(res.message || "Failed to load templates");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load templates");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => (items ?? []).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage]
  );

  const start = (items?.length ?? 0) === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, items?.length ?? 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Templates
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Mini program templates from the WeChat third-party platform.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : items === null ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">No templates found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Draft ID
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Template ID
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Version
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Description
                  </th>
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => (
                  <tr
                    key={item.templateId}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {item.draftId}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {item.templateId}
                    </td>
                    <td className="px-5 py-3 text-zinc-900 dark:text-zinc-50">
                      {item.userVersion}
                    </td>
                    <td className="px-5 py-3 text-zinc-900 dark:text-zinc-50">
                      {item.userDesc}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(item.createTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Showing {start}–{end} of {items.length}
            </span>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    n === safePage
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
