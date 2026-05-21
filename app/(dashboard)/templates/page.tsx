"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { wxFetch } from "@/lib/wx-proxy";
import type { ResponseData, TemplateItem, DraftItem } from "@/types/wx-api";

const PAGE_SIZE = 10;

function formatTimestamp(ts: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
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

export default function TemplatesPage() {
  const [items, setItems] = useState<TemplateItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUserRole(data?.role ?? null))
      .catch(() => setUserRole(null))
      .finally(() => setRoleLoading(false));
  }, []);

  const load = useCallback(async (skipCache = false) => {
    if (skipCache) setError(null);
    try {
      const res = await wxFetch<ResponseData<TemplateItem[]>>(
        "gettemplatelist",
        {},
        skipCache ? false : undefined
      );
      if (res.code === "000000" && res.succeed) {
        setItems(res.data ?? []);
      } else {
        setError(res.message || "Failed to load templates");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    setDraftError(null);
    setDraftLoading(true);
    try {
      const res = await wxFetch<ResponseData<DraftItem[]>>(
        "getTemplatedRaftList",
        { method: "GET" },
        false
      );
      if (res.code === "000000" && res.succeed) {
        setDrafts(res.data ?? []);
      } else {
        setDraftError(res.message || "Failed to load drafts");
      }
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Failed to load drafts");
    } finally {
      setDraftLoading(false);
    }
  }, []);

  const addToTemplate = useCallback(async (draftId: number) => {
    setAddingId(draftId);
    try {
      const res = await wxFetch<ResponseData<null>>(
        `addToTemplate?draftId=${draftId}&templateType=0`,
        { method: "POST" },
        false
      );
      if (res.code === "000000" && res.succeed) {
        setDrafts((prev) => (prev ?? []).filter((d) => d.draftId !== draftId));
        await load(true);
      } else {
        alert(res.message || "Failed to add template");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add template");
    } finally {
      setAddingId(null);
    }
  }, [load]);

  const deleteTemplate = useCallback(async (templateId: number) => {
    if (!confirm("确认删除该模版？")) return;
    setDeletingId(templateId);
    try {
      const res = await wxFetch<ResponseData<null>>(
        `deleteTemplate?templateId=${templateId}`,
        { method: "POST" },
        false
      );
      if (res.code === "000000" && res.succeed) {
        await load(true);
      } else {
        alert(res.message || "Failed to delete template");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  }, [load]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    if (drafts === null) loadDrafts();
  }, [drafts, loadDrafts]);

  useEffect(() => {
    if (userRole === "tester" || roleLoading) return;
    queueMicrotask(() => { load(); });
  }, [load, userRole, roleLoading]);

  const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => (items ?? []).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage]
  );

  const start = (items?.length ?? 0) === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, items?.length ?? 0);

  if (roleLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (userRole === "tester") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Access Denied
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Templates
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Mini program templates from the WeChat third-party platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openModal}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            添加模版
          </button>
          <button
            onClick={async () => {
              setRefreshing(true);
              await load(true);
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Refresh data"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
        </div>
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
          {/* Desktop table - hidden on mobile */}
          <div className="hidden lg:block lg:overflow-hidden lg:rounded-xl lg:border lg:border-zinc-200 lg:bg-white lg:dark:border-zinc-800 lg:dark:bg-zinc-950">
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
                  <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Actions
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
                    <td className="px-5 py-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify({
                              templateId: item.templateId,
                              userVersion: item.userVersion,
                              userDesc: item.userDesc,
                            })
                          );
                          setCopiedId(item.templateId);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {copiedId === item.templateId ? "已复制" : "复制"}
                      </button>
                      <button
                        onClick={() => deleteTemplate(item.templateId)}
                        disabled={deletingId === item.templateId}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        {deletingId === item.templateId ? "..." : "删除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards - hidden on desktop */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paged.map((item) => (
              <div
                key={item.templateId}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.userVersion}</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.userDesc}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    v{item.userVersion}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Draft: {item.draftId}</span>
                  <span>Template: {item.templateId}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  创建时间: {formatTimestamp(item.createTime)}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify({
                          templateId: item.templateId,
                          userVersion: item.userVersion,
                          userDesc: item.userDesc,
                        })
                      );
                      setCopiedId(item.templateId);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {copiedId === item.templateId ? "已复制" : "复制"}
                  </button>
                  <button
                    onClick={() => deleteTemplate(item.templateId)}
                    disabled={deletingId === item.templateId}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    {deletingId === item.templateId ? "..." : "删除"}
                  </button>
                </div>
              </div>
            ))}
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                选择草稿
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            {draftError ? (
              <p className="text-sm text-red-500" role="alert">
                {draftError}
              </p>
            ) : draftLoading || drafts === null ? (
              <p className="text-sm text-zinc-500">Loading drafts...</p>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-zinc-500">No drafts found.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400">
                      Version
                    </th>
                    <th className="py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400">
                      Description
                    </th>
                    <th className="py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400">
                      Mini Program
                    </th>
                    <th className="py-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400">
                      Created
                    </th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr
                      key={d.draftId}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50"
                    >
                      <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-50">
                        {d.userVersion}
                      </td>
                      <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-50">
                        {d.userDesc}
                      </td>
                      <td className="py-2 pr-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {d.sourceMiniProgram}
                      </td>
                      <td className="py-2 pr-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimestamp(d.createTime)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => addToTemplate(d.draftId)}
                          disabled={addingId === d.draftId}
                          className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                        >
                          {addingId === d.draftId ? "Adding..." : "添加"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
