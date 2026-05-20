"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { wxFetch, getWxBaseUrl } from "@/lib/wx-proxy";

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
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState<{
    appid: string;
    appName: string;
  } | null>(null);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const [testerModal, setTesterModal] = useState<{
    appid: string;
    appName: string;
  } | null>(null);
  const [wechatId, setWechatId] = useState("");
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerResult, setTesterResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const load = useCallback(async (skipCache = false) => {
    if (skipCache) setError(null);
    try {
      const res = await wxFetch<ResponseData<MiniProgramItem[]>>(
        "getAuthorizerList?limit=499",
        {},
        skipCache ? false : undefined
      );
      if (res.code === "000000" && res.succeed) {
        setItems(res.data);
      } else {
        setError(res.message || "Failed to load mini programs");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mini programs");
    }
  }, []);

  const handleViewQrCode = useCallback((appid: string, appName: string) => {
    setQrModal({ appid, appName });
    setQrBlobUrl(null);
    setQrError(null);
    setQrLoading(true);
  }, []);

  useEffect(() => {
    if (!qrModal) return;
    const modal = qrModal;
    let cancelled = false;

    async function fetchQr() {
      setQrLoading(true);
      setQrError(null);
      setQrBlobUrl(null);

      try {
        const baseUrl = getWxBaseUrl();
        if (!baseUrl) throw new Error("微信API地址未配置，请在设置中配置。");

        const res = await fetch(
          `/api/wx-proxy/getTestQrcode?appid=${encodeURIComponent(modal.appid)}`,
          { headers: { "X-Wx-Base-Url": baseUrl } }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `请求失败 (${res.status})`);
        }

        const blob = await res.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = url;
        setQrBlobUrl(url);
      } catch (e) {
        if (!cancelled) {
          setQrError(e instanceof Error ? e.message : "获取二维码失败");
        }
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    }

    fetchQr();

    return () => {
      cancelled = true;
    };
  }, [qrModal]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

  function openTesterModal(appid: string, appName: string) {
    setTesterModal({ appid, appName });
    setWechatId("");
    setTesterResult(null);
  }

  async function handleBind() {
    if (!testerModal || !wechatId.trim()) return;
    setTesterLoading(true);
    setTesterResult(null);
    try {
      const res = await wxFetch<ResponseData<null>>(
        `bindTester?appid=${encodeURIComponent(testerModal.appid)}&wechatId=${encodeURIComponent(wechatId.trim())}`,
        { method: "POST" },
        false
      );
      setTesterResult({
        ok: res.succeed,
        msg: res.succeed ? "绑定成功" : res.message || "绑定失败",
      });
    } catch (e) {
      setTesterResult({
        ok: false,
        msg: e instanceof Error ? e.message : "请求失败",
      });
    } finally {
      setTesterLoading(false);
    }
  }

  async function handleUnbind() {
    if (!testerModal || !wechatId.trim()) return;
    setTesterLoading(true);
    setTesterResult(null);
    try {
      const res = await wxFetch<ResponseData<null>>(
        `unBindTester?appid=${encodeURIComponent(testerModal.appid)}&wechatId=${encodeURIComponent(wechatId.trim())}`,
        { method: "POST" },
        false
      );
      setTesterResult({
        ok: res.succeed,
        msg: res.succeed ? "解绑成功" : res.message || "解绑失败",
      });
    } catch (e) {
      setTesterResult({
        ok: false,
        msg: e instanceof Error ? e.message : "请求失败",
      });
    } finally {
      setTesterLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mini Programs
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Authorized mini-programs from the WeChat third-party platform.
          </p>
        </div>
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
                      <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                        Actions
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
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleViewQrCode(item.authorizer_appid, item.appName)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            查看二维码
                          </button>
                          <button
                            onClick={() => openTesterModal(item.authorizer_appid, item.appName)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            体验者
                          </button>
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

      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setQrModal(null);
            setQrBlobUrl(null);
            setQrError(null);
          }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                查看二维码
              </h2>
              <button
                onClick={() => {
                  setQrModal(null);
                  setQrBlobUrl(null);
                  setQrError(null);
                }}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 break-all text-xs text-zinc-500 dark:text-zinc-400">
              {qrModal.appName} ({qrModal.appid})
            </p>

            <div className="flex min-h-[200px] items-center justify-center">
              {qrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="h-8 w-8 animate-spin text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="text-sm text-zinc-500">加载中...</span>
                </div>
              ) : qrError ? (
                <p className="text-sm text-red-500" role="alert">
                  {qrError}
                </p>
              ) : qrBlobUrl ? (
                <img
                  src={qrBlobUrl}
                  alt={`QR Code for ${qrModal.appName}`}
                  className="h-auto max-w-full"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {testerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setTesterModal(null);
            setWechatId("");
            setTesterResult(null);
          }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                体验者管理
              </h2>
              <button
                onClick={() => {
                  setTesterModal(null);
                  setWechatId("");
                  setTesterResult(null);
                }}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 break-all text-xs text-zinc-500 dark:text-zinc-400">
              {testerModal.appName} ({testerModal.appid})
            </p>

            <input
              type="text"
              value={wechatId}
              onChange={(e) => {
                setWechatId(e.target.value);
                setTesterResult(null);
              }}
              placeholder="输入微信号"
              className="mb-4 w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />

            <div className="mb-4 flex gap-3">
              <button
                onClick={handleBind}
                disabled={testerLoading || !wechatId.trim()}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                绑定用户
              </button>
              <button
                onClick={handleUnbind}
                disabled={testerLoading || !wechatId.trim()}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                解绑用户
              </button>
            </div>

            {testerLoading && (
              <p className="text-center text-sm text-zinc-500">处理中...</p>
            )}
            {testerResult && !testerLoading && (
              <p
                className={`text-sm ${
                  testerResult.ok
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-500"
                }`}
                role="alert"
              >
                {testerResult.msg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}