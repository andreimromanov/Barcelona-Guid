import { useEffect } from "react"
import Head from "next/head"
import { useRouter } from "next/router"

export default function HomePage() {
  const router = useRouter()

  // Авто-редирект в мини-апп
  useEffect(() => {
    router.replace("/frame")
  }, [router])

  // Базовый URL (удобно держать в переменной окружения на Vercel)
  const SITE =
    process.env.NEXT_PUBLIC_SITE_URL || "https://barcelona-guide-eight.vercel.app"

  // 🖼️ используем PNG-файлы из /public
  const previewUrl = `${SITE}/preview.png`
  const splashUrl = `${SITE}/splash.png`

  const miniappEmbed = {
    version: "1",
    imageUrl: previewUrl,
    button: {
      title: "Open Barcelona Guide",
      action: {
        type: "launch_miniapp",
        url: `${SITE}/frame`,
        name: "Barcelona Guide",
        splashImageUrl: splashUrl,
        splashBackgroundColor: "#4052B6", // фирменный синий
      },
    },
  }

  const legacyFrameEmbed = {
    ...miniappEmbed,
    button: {
      ...miniappEmbed.button,
      action: { ...miniappEmbed.button.action, type: "launch_frame" as const },
    },
  }

  return (
    <>
      <Head>
        <title>Barcelona Guide</title>

        {/* OG / Twitter */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Barcelona Guide" />
        <meta
          property="og:description"
          content="Rate the best places in Barcelona on Base. See community averages. Mini App for Warpcast."
        />
        <meta property="og:url" content={SITE} />
        <meta property="og:image" content={previewUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Barcelona Guide" />
        <meta
          name="twitter:description"
          content="Rate Barcelona spots, view averages, and explore the city."
        />
        <meta name="twitter:image" content={previewUrl} />
        <link rel="canonical" href={SITE} />

        {/* Warpcast Miniapp / Frame */}
        <meta name="fc:miniapp" content={JSON.stringify(miniappEmbed)} />
        <meta name="fc:frame" content={JSON.stringify(legacyFrameEmbed)} />
      </Head>

      <main className="flex items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-indigo-700">
          Загружается Barcelona Guide…
        </h1>
      </main>
    </>
  )
}
