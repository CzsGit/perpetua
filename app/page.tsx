import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6">
      <main className="flex max-w-2xl flex-col items-center text-center">
        {/* Logo / App name */}
        <h1 className="mb-4 text-6xl font-bold tracking-tight text-white">
          Perpetua
        </h1>

        {/* Tagline */}
        <p className="mb-2 text-xl text-gray-300">
          无限播客内容生成平台
        </p>

        {/* Description */}
        <p className="mb-10 max-w-md text-base leading-relaxed text-gray-500">
          输入一个主题，AI 为你生成无限的播客内容
        </p>

        {/* CTA buttons */}
        <div className="flex gap-4">
          <Link
            href="/studio"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            开始创作
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-gray-700 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            登录
          </Link>
        </div>
      </main>
    </div>
  )
}
