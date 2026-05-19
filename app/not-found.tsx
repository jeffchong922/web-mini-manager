import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <h1 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
        404
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This page does not exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
      >
        Back to Home
      </Link>
    </div>
  );
}
