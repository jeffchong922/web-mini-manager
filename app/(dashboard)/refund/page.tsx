"use client";

import { useState, useEffect } from "react";

type Env = "test" | "uat";
const ENV_OPTIONS: { value: Env; label: string }[] = [
  { value: "test", label: "Test" },
  { value: "uat", label: "UAT" },
];

type QueryItem = {
  id: number;
  activityCode: string;
  name: string;
  mobile: string;
  carLicenceNo: string;
  wxUserOpenid: string;
  wxTotalFee: number;
  tradeStatus: string;
  createTime: string;
  rocoPaymentFlowCode: string;
  appid: string;
  [key: string]: unknown;
};

type QueryResponse = {
  count?: number;
  code?: number;
  msg?: string;
  data?: QueryItem[] | null;
  error?: string;
};

export default function RefundPage() {
  const [flowCode, setFlowCode] = useState("");
  const [env, setEnv] = useState<Env>("test");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Query fields
  const [activityCode, setActivityCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [carLicenceNo, setCarLicenceNo] = useState("");
  const [wxUserOpenid, setWxUserOpenid] = useState("");
  const [appid, setAppid] = useState("");
  const [cookie, setCookie] = useState("");

  // Persist cookie in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("refund_cookie");
    if (stored) setCookie(stored);
  }, []);

  useEffect(() => {
    if (cookie) localStorage.setItem("refund_cookie", cookie);
  }, [cookie]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Results
  const [queryMessage, setQueryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [queryData, setQueryData] = useState<QueryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [copyText, setCopyText] = useState("");

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!flowCode.trim()) {
      setMessage({ type: "error", text: "请输入退款编号" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/refund-submit/?flowCode=${encodeURIComponent(flowCode.trim())}`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: { "X-Env": env },
      });
      const data = await res.json();
      if (data.code === "000000" && data.succeed) {
        setMessage({ type: "success", text: data.message || "退款成功" });
        setFlowCode("");
      } else {
        setMessage({ type: "error", text: data.message || data.error || "请求失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请检查 VPN 是否已连接" });
    } finally {
      setLoading(false);
    }
  }

  async function handleQuery(e?: React.FormEvent, newPage?: number) {
    if (e) e.preventDefault();
    if (!cookie.trim()) {
      setQueryMessage({ type: "error", text: "请粘贴 Cookie" });
      return;
    }
    if (!activityCode.trim() && !mobile.trim() && !carLicenceNo.trim() && !wxUserOpenid.trim() && !appid.trim()) {
      setQueryMessage({ type: "error", text: "请输入至少一个查询条件" });
      return;
    }

    const queryPage = newPage !== undefined ? newPage : 1;
    setPage(queryPage);

    setLoading(true);
    setQueryMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(queryPage));
      params.set("limit", String(limit));
      if (activityCode.trim()) params.set("activityCode", activityCode.trim());
      if (mobile.trim()) params.set("mobile", mobile.trim());
      if (carLicenceNo.trim()) params.set("carLicenceNo", carLicenceNo.trim());
      if (wxUserOpenid.trim()) params.set("wxUserOpenid", wxUserOpenid.trim());
      if (appid.trim()) params.set("appid", appid.trim());

      const res = await fetch(`/api/refund-query/?${params.toString()}`, {
        method: "GET",
        headers: {
          "X-Forward-Cookie": cookie.trim(),
          "X-Env": env,
        },
      });
      const data: QueryResponse = await res.json();
      if (res.ok) {
        setQueryData(data.data || []);
        setTotalCount(data.count ?? 0);
        setQueryMessage({ type: "success", text: `共 ${data.count ?? 0} 条` });
      } else {
        setQueryMessage({ type: "error", text: data.msg || data.error || "查询失败" });
        setQueryData([]);
        setTotalCount(0);
      }
    } catch {
      setQueryMessage({ type: "error", text: "网络错误，Cookie 或许已过期" });
      setQueryData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyText(text);
      setTimeout(() => setCopyText(""), 2000);
    } catch {
      // ignore
    }
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Refund
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enter the refund order code to process a refund.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Environment:</span>
          <select value={env} onChange={(e) => setEnv(e.target.value as Env)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
            {ENV_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Submit Refund */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-base font-medium text-zinc-900 dark:text-zinc-50">Submit Refund</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="flowCode" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Refund Code</label>
            <input id="flowCode" type="text" value={flowCode} onChange={(e) => { setFlowCode(e.target.value); setMessage(null); }} placeholder="Enter refund flow code(WPxxx)" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
          <button type="submit" disabled={loading} onClick={handleRefund} className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200">
            {loading ? "Processing..." : "Submit Refund"}
          </button>
        </div>
        {message && <p className={`mt-2 text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"}`} role="alert">{message.text}</p>}
      </div>

      {/* Query Record */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 text-base font-medium text-zinc-900 dark:text-zinc-50">Query Record</h2>
        <p className="mb-4 text-xs text-zinc-400">在浏览器开发者工具 → Application(存储空间) → Cookies 中复制 SESSION 的 Value 值粘贴到下方</p>
        <div className="mb-4">
          <label htmlFor="cookie" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cookie SESSION Value</label>
          <input id="cookie" type="text" value={cookie} onChange={(e) => { setCookie(e.target.value); setQueryMessage(null); }} placeholder="Paste SESSION value here" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="activityCode" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Activity Code</label>
            <input id="activityCode" type="text" value={activityCode} onChange={(e) => { setActivityCode(e.target.value); setQueryMessage(null); }} placeholder="Enter activity code" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
          <div>
            <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mobile</label>
            <input id="mobile" type="text" value={mobile} onChange={(e) => { setMobile(e.target.value); setQueryMessage(null); }} placeholder="Enter mobile number" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
          <div>
            <label htmlFor="carLicenceNo" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Car Licence No</label>
            <input id="carLicenceNo" type="text" value={carLicenceNo} onChange={(e) => { setCarLicenceNo(e.target.value); setQueryMessage(null); }} placeholder="Enter car licence no" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
          <div>
            <label htmlFor="wxUserOpenid" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Wx User Openid</label>
            <input id="wxUserOpenid" type="text" value={wxUserOpenid} onChange={(e) => { setWxUserOpenid(e.target.value); setQueryMessage(null); }} placeholder="Enter wx user openid" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
          <div>
            <label htmlFor="appid" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Appid</label>
            <input id="appid" type="text" value={appid} onChange={(e) => { setAppid(e.target.value); setQueryMessage(null); }} placeholder="Enter appid" className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => handleQuery()} disabled={loading} className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200">
            {loading ? "Querying..." : "Query"}
          </button>
          <button type="button" onClick={() => handleQuery(undefined, page - 1)} disabled={loading || page <= 1} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Prev</button>
          <button type="button" onClick={() => handleQuery(undefined, page + 1)} disabled={loading || page >= totalPages} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Next</button>
          {queryMessage && queryMessage.type === "success" && <span className="ml-2 text-sm text-green-600 dark:text-green-400">第 {page} 页 · {queryMessage.text}</span>}
          {queryMessage && queryMessage.type === "error" && <span className="ml-2 text-sm text-red-500">{queryMessage.text}</span>}
        </div>

        {/* Results table */}
        {queryData.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Payment Code</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Appid</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Activity</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Mobile</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Car</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Fee</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-2 font-medium text-zinc-500 dark:text-zinc-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {queryData.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50">
                    <td
                      className={`px-4 py-2 cursor-pointer hover:text-blue-500 ${item.rocoPaymentFlowCode ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}
                      onClick={() => copyToClipboard(item.rocoPaymentFlowCode)}
                      title="点击复制"
                    >
                      {item.rocoPaymentFlowCode || "-"}
                      {copyText === item.rocoPaymentFlowCode && <span className="ml-1 text-xs text-green-500">已复制</span>}
                    </td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.appid || "-"}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.activityCode}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.name}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.mobile}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.carLicenceNo}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{(item.wxTotalFee / 100).toFixed(2)}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{item.tradeStatus}</td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{item.createTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
