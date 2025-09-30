// pages/_app.tsx
import "@rainbow-me/rainbowkit/styles.css"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { wagmiClientConfig } from "../lib/wagmi"
import "../styles/globals.css"
import type { AppProps } from "next/app"
import { useEffect } from "react"
import { useRouter } from "next/router"
import Head from "next/head"

// ⚠️ если у тебя реально Layout в другом месте — не трогаем, раз работает
import Layout from "../components/Layout"

declare global {
  interface Window {
    farcaster?: {
      actions?: { ready: () => void }
      wallet?: {
        getAccounts?: () => Promise<string[]>
        sendTransaction?: (tx: {
          to: `0x${string}`
          data?: `0x${string}`
          value?: `0x${string}`
        }) => Promise<`0x${string}`>
        signTypedData?: (typedData: unknown) => Promise<`0x${string}`>
      }
    }
  }
}

function WarpcastReady() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const callReady = () => {
      try {
        window.farcaster?.actions?.ready?.()
        console.log("✅ Farcaster SDK ready")
      } catch {}
    }

    if (!window.farcaster) {
      const s = document.createElement("script")
      s.src = "https://warpcast.com/sdk/v2"
      s.async = true
      s.onload = callReady
      document.body.appendChild(s)
    } else {
      callReady()
    }
  }, [])
  return null
}

// 🔤 Head с шрифтами и базовым цветом темы
function AppHead() {
  return (
    <Head>
      <meta name="theme-color" content="#004D98" /> {/* Barcelona blue */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@600;700;800&display=swap"
        rel="stylesheet"
      />
    </Head>
  )
}

// 💄 Глобальные стили (без правок tailwind)
// применяем Inter к тексту и Montserrat к заголовкам
function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --barca-blue: #004d98;
        --barca-grana: #a50044;
        --barca-gold: #fdb913;
      }
      body {
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
      }
      h1, h2, h3, .font-display {
        font-family: Montserrat, Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      /* лёгкий твик ссылок по умолчанию */
      a { color: var(--barca-blue); }
      a:hover { color: #003b7a; }
    `}</style>
  )
}

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isMiniApp = router.pathname.startsWith("/frame")

  if (isMiniApp) {
    // 🚫 Мини-дапы: без Wagmi/RainbowKit (как и было)
    return (
      <>
        <AppHead />
        <GlobalStyles />
        <WarpcastReady />
        <Component {...pageProps} />
      </>
    )
  }

  // 🌍 Полная версия сайта: Wagmi + RainbowKit (как и было)
  return (
    <WagmiProvider config={wagmiClientConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppHead />
          <GlobalStyles />
          <Layout>
            <WarpcastReady />
            <Component {...pageProps} />
          </Layout>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
