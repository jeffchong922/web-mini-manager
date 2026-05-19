"use client";

import { useState, useEffect, useMemo } from "react";
import { wxFetch } from "@/lib/wx-proxy";

type MiniProgramItem = {
  authorizer_appid: string;
  refresh_token: string;
  appName: string;
  auth_time: string;
  status: string;
};

type ResponseData<T> = {
  code: string;
  data: T;
  message: string;
  succeed: boolean;
};

const PAGE_SIZE = 10;

function formatTimestamp(ts: string) {
  const n = Number(ts);
  if (!n) return ts;
  return new Date(n * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function MiniProgramsPage() {
  const [items, setItems] = useState<MiniProgramItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await wxFetch<ResponseData<MiniProgramItem[]>>(
          "getAuthorizerList?limit=499"
        );
        if (!cancelled) {
          if (res.code === "000000" && res.succeed) {
            setItems(res.data);
          } else {
            setError(res.message || "Failed to load mini programs");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load mini programs");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.appName || "").toLowerCase().includes(q) ||
        (item.authorizer_appid || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mini Programs
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Authorized mini-programs from the WeChat third-party platform.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : items === null ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or app ID..."
              className="w-72 rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            {search && (
              <span className="text-xs text-zinc-400">
                {filtered.length} of {items.length} results
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">No mini programs found.</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                    <tr>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Name
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        App ID
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Auth Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((item) => (
                      <tr
                        key={item.authorizer_appid}
                        className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50"
                      >
                        <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                          {item.appName}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {item.authorizer_appid}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "OPEN"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                          {formatTimestamp(item.auth_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Showing {start}–{end} of {filtered.length}
                </span>
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
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
                    )
                  )}
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
        </>
      )}
    </div>
  );
}