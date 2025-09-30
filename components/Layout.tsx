import Link from "next/link"
import { ReactNode } from "react"
import { Landmark } from "lucide-react" // был Dumbbell — оставил lucide-react, меняем иконку на город
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useRouter } from "next/router"

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const isMiniApp = router.pathname.startsWith("/frame")

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-indigo-700 font-extrabold text-xl font-display"
            aria-label="Barcelona Guide — на главную"
          >
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-rose-700 text-white">
              <Landmark className="w-5 h-5" />
            </span>
            Barcelona Guide
          </Link>

          <nav className="flex items-center gap-6 text-gray-700">
            <Link href="/entries" className="hover:text-indigo-600 transition">
              Записи
            </Link>
            
            <Link href="/profile" className="hover:text-indigo-600 transition">
              Профиль
            </Link>

            {/* Wallet connect button только в веб-версии */}
            {!isMiniApp && (
              <ConnectButton
                showBalance={false}
                accountStatus="address"
              />
            )}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  )
}
