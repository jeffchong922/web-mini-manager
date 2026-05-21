"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { SubmitConfigItem } from "@/types/wx-api";

const STORAGE_KEY = "submitConfigs";
const PAGE_SIZE = 10;

function loadConfigs(): SubmitConfigItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConfigs(configs: SubmitConfigItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

function parseJSValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // fallback: JS object/array literal (unquoted keys, trailing commas, etc.)
    return new Function(`return (${text})`)();
  }
}

function normalizeImport(input: unknown): SubmitConfigItem[] {
  const arr = Array.isArray(input) ? input : [input];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((item: any) => {
    let extFields: Record<string, unknown> = {};
    let extraFields: Record<string, unknown> = {};
    let isStop: boolean | undefined;

    if (item?.extJson) {
      // Full CodeCommitParams: extract extJson.ext + extJson extra fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { extEnable, extAppid, directCommit, ext, ...restExtJson } = item.extJson;
      extFields = ext ?? {};
      extraFields = restExtJson;
      isStop = item.isStop;
    } else {
      // Bare ExtConfig: all fields (minus appid/isStop variants) go into ext
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isStop: _isStop, appid: _a, miniAppId: _m, extAppid: _e, ...rest } = item;
      extFields = rest;
      isStop = item.isStop;
    }
    const appid = item?.appid || item?.miniAppId || item?.extAppid || "";

    const result: SubmitConfigItem = { appid, ext: extFields, ...extraFields };
    if (isStop !== undefined) result.isStop = isStop;
    return result;
  });
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 1) return [1];
  const pages: (number | "...")[] = [];
  const delta = 2;
  pages.push(1);
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);
  if (rangeStart > 2) pages.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

export default function SubmitConfigsPage() {
  const [configs, setConfigs] = useState<SubmitConfigItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<SubmitConfigItem | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isStopFilter, setIsStopFilter] = useState<"" | "true" | "false">("");
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfigs(loadConfigs());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SubmitConfigItem[]) => {
    setConfigs(next);
    saveConfigs(next);
  }, []);

  function handleImport() {
    setImportError(null);
    let parsed: unknown;
    try {
      parsed = parseJSValue(importText);
    } catch {
      setImportError("格式无效，请粘贴 JSON 或 JS 对象/数组");
      return;
    }
    const imported = normalizeImport(parsed);
    if (imported.length === 0) {
      setImportError("未解析到任何配置");
      return;
    }
    const existing = new Map(configs.map((c) => [c.appid, c]));
    for (const item of imported) {
      existing.set(item.appid, item);
    }
    persist(Array.from(existing.values()));
    setImportText("");
    setPage(1);
  }

  function handleExport() {
    const json = JSON.stringify(configs, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDelete(appid: string) {
    if (!confirm(`确定删除 ${appid} 的配置？`)) return;
    persist(configs.filter((c) => c.appid !== appid));
  }

  function openEdit(config: SubmitConfigItem) {
    setEditing(config);
    setEditText(JSON.stringify(config, null, 2));
    setEditError(null);
  }

  function saveEdit() {
    if (!editing) return;
    setEditError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updated: any;
    try {
      updated = parseJSValue(editText);
    } catch {
      setEditError("格式无效");
      return;
    }
    if (!updated.appid || typeof updated.appid !== "string") {
      setEditError("缺少 appid 字段");
      return;
    }
    const next = configs.map((c) => (c.appid === editing.appid ? updated : c));
    persist(next);
    setEditing(null);
  }

  function toggleStop(appid: string) {
    const next = configs.map((c) =>
      c.appid === appid ? { ...c, isStop: !c.isStop } : c
    );
    persist(next);
  }

  function handleClear() {
    if (!confirm(`确定清空全部 ${configs.length} 条配置？`)) return;
    persist([]);
  }

  const filtered = useMemo(() => {
    let result = configs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.appid.toLowerCase().includes(q));
    }
    if (isStopFilter) {
      const val = isStopFilter === "true";
      result = result.filter((c) => !!c.isStop === val);
    }
    return result;
  }, [configs, search, isStopFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );
  const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Submit Configs
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage mini program submission ext configurations in JSON format.
        </p>
      </div>

      {/* Import area */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Import JSON
        </h2>
        <textarea
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportError(null);
          }}
          placeholder={`粘贴 JSON 数组或单个对象…\n支持完整 CodeCommitParams 或裸 ExtConfig`}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          rows={6}
        />
        {importError && (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {importError}
          </p>
        )}
        <button
          onClick={handleImport}
          disabled={!importText.trim()}
          className="mt-3 rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
        >
          Import
        </button>
      </div>

      {/* List */}
      {!hydrated ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : configs.length === 0 ? (
        <p className="text-sm text-zinc-500">No configs yet. Paste JSON above to import.</p>
      ) : (
        <>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by app ID..."
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:min-w-[200px] sm:flex-none sm:w-72 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <select
                  value={isStopFilter}
                  onChange={(e) => {
                    setIsStopFilter(e.target.value as "" | "true" | "false");
                    setPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  <option value="">全部</option>
                  <option value="false">正常</option>
                  <option value="true">暂停</option>
                </select>
                {(search || isStopFilter) && (
                  <span className="text-xs text-zinc-400">
                    {filtered.length} of {configs.length}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleExport}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {copied ? "Copied!" : "Export"}
                  </button>
                </div>
              </div>

              {/* Desktop table - hidden on mobile */}
              <div className="hidden lg:block lg:overflow-hidden lg:rounded-xl lg:border lg:border-zinc-200 lg:bg-white lg:dark:border-zinc-800 lg:dark:bg-zinc-950">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                    <tr>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        App Name
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        App ID
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((config) => (
                      <tr
                        key={config.appid}
                        className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50"
                      >
                        <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                          {(config.ext.appName as string) || "-"}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {config.appid}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleStop(config.appid)}
                            className={`inline-flex cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium ${
                              config.isStop
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {config.isStop ? "暂停" : "正常"}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openEdit(config)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(config.appid)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards - hidden on desktop */}
              <div className="flex flex-col gap-3 lg:hidden">
                {paged.map((config) => (
                  <div
                    key={config.appid}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {(config.ext.appName as string) || "-"}
                        </div>
                        <div className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">{config.appid}</div>
                      </div>
                      <button
                        onClick={() => toggleStop(config.appid)}
                        className={`shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium ${
                          config.isStop
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {config.isStop ? "暂停" : "正常"}
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openEdit(config)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(config.appid)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
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
                  {getPageNumbers(safePage, totalPages).map((n) =>
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        n === safePage
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {n === "..." ? "…" : n}
                    </button>
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

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditing(null)}
        >
          <div
            className="mx-4 w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Edit Config
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                setEditError(null);
              }}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              rows={14}
            />
            {editError && (
              <p className="mt-2 text-sm text-red-500" role="alert">
                {editError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
