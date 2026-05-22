import { verifySession } from "@/lib/session";
import Link from "next/link";

const tutorialSteps = [
  {
    num: 1,
    title: "配置 API 地址",
    description: "在 Settings 页面填写微信第三方平台的 API 基础地址，这是调用微信接口的前提。",
    href: "/settings",
    linkText: "前往 Settings",
  },
  {
    num: 2,
    title: "准备提交配置",
    description: "在 Submit Configs 为每个小程序配置 ext.json 提交参数，包括模板 ID、版本信息和扩展配置。",
    href: "/submit-configs",
    linkText: "前往 Submit Configs",
  },
  {
    num: 3,
    title: "查看授权小程序",
    description: "在 Mini Programs 查看已授权的小程序列表，支持查看二维码、绑定体验者等操作。",
    href: "/mini-programs",
    linkText: "前往 Mini Programs",
  },
  {
    num: 4,
    title: "提交代码审核",
    description: "选择小程序，点击「提交」将代码提交至微信审核。提交前请确保已配置好对应的提交信息。",
    href: "/mini-programs",
    linkText: "前往 Mini Programs",
  },
];

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

      {/* WeChat API tip card */}
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

      {/* Tutorial section */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          快速上手
        </h2>
        <div className="flex flex-col gap-3">
          {tutorialSteps.map((step) => (
            <div
              key={step.num}
              className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {step.num}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {step.description}
                </p>
                <Link
                  href={step.href}
                  className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {step.linkText} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
