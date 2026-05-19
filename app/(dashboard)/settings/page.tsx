"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "wxBaseUrl";

function getStoredUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setBaseUrl(getStoredUrl());
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const trimmed = baseUrl.trim().replace(/\/+$/, "");
      if (!trimmed) {
        setMessage({ type: "error", text: "Please enter a base URL." });
        return;
      }
      if (!/^https?:\/\/.+/.test(trimmed)) {
        setMessage({ type: "error", text: "URL must start with http:// or https://" });
        return;
      }
      localStorage.setItem(STORAGE_KEY, trimmed);
      setMessage({ type: "success", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save." });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configure the WeChat third-party platform API.
        </p>
      </div>
      <form onSubmit={handleSave} className="max-w-lg space-y-4">
        <div>
          <label
            htmlFor="baseUrl"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            WeChat API Base URL
          </label>
          <input
            id="baseUrl"
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setMessage(null);
            }}
            placeholder="https://api.weixin.qq.com"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            API paths will be appended to this URL via the proxy.
          </p>
        </div>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
            role="alert"
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </form>
    </div>
  );
}
