"use client";

import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/hooks/useRole";
import type { UserRole } from "@/types/auth";

interface UserItem {
  username: string;
  role: UserRole;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("user");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [roleLoading, userRole] = useRole();

  const load = useCallback(async (skipCache = false) => {
    if (skipCache) setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Failed to load users");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (!formUsername || !formPassword) {
      alert("Username and password are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername, password: formPassword, role: formRole }),
      });
      if (res.ok) {
        setModalOpen(false);
        setFormUsername("");
        setFormPassword("");
        setFormRole("user");
        await load(true);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add user");
      }
    } finally {
      setSaving(false);
    }
  }, [formUsername, formPassword, formRole, load]);

  const handleDelete = useCallback(async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    setDeleting(username);
    try {
      const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await load(true);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user");
      }
    } finally {
      setDeleting(null);
    }
  }, [load]);

  useEffect(() => {
    if (roleLoading) return;
    queueMicrotask(() => { load(); });
  }, [load, roleLoading]);

  if (roleLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (userRole !== "admin") {
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
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage user accounts and roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            Add User
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
        <p className="text-sm text-red-500" role="alert">{error}</p>
      ) : loading || users === null ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-zinc-500">No users found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">Username</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">Created</th>
                <th className="px-5 py-3 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.username}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/50"
                >
                  <td className="px-5 py-3 text-zinc-900 dark:text-zinc-50">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("zh-CN") : "-"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(u.username)}
                      disabled={deleting === u.username}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {deleting === u.username ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-md overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Add User</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}