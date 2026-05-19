import { verifySession } from "@/lib/session";

export default async function DashboardHome() {
  const session = await verifySession();
  const username = session?.username || "User";

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome, {username}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your WeChat third-party platform integration.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">WeChat API</h3>
          <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
            Configure the API base URL in{" "}
            <a href="/settings" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Settings
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
