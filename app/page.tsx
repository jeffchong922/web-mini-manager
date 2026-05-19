import { verifySession } from "@/lib/session";

export default async function Home() {
  const session = await verifySession();
  const username = session?.username || "User";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Welcome, {username}
        </h1>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            Sign Out
          </button>
        </form>
      </main>
    </div>
  );
}
