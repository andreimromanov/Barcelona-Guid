// pages/frame/[id].tsx
import Head from "next/head"
import Image from "next/image"
import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import { places } from "../../data/places"
import { publicClient } from "../../lib/viem"
import ratingsAbi from "../../abi/BarcelonaRatings.json"
import { encodeFunctionData } from "viem"
import { sdk } from "@farcaster/miniapp-sdk"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

const translations = {
  ru: {
    back: "⬅ Назад",
    avg: "Средний рейтинг",
    notFound: "Место не найдено",
    walletMissing: "Farcaster wallet не подключён",
    txFailed: "Не удалось отправить транзакцию",
  },
  en: {
    back: "⬅ Back",
    avg: "Average rating",
    notFound: "Place not found",
    walletMissing: "Farcaster wallet not connected",
    txFailed: "Transaction failed",
  },
}

export default function FramePlace() {
  const router = useRouter()
  const idParam = router.query.id

  const [lang, setLang] = useState<"ru" | "en">("ru")
  const t = translations[lang]

  const placeId = useMemo(() => (idParam ? Number(idParam) : null), [idParam])
  const place = useMemo(() => places.find((p) => p.id === placeId), [placeId])

  const [address, setAddress] = useState<string | null>(null)
  const [avg, setAvg] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const provider = sdk.wallet.ethProvider

  // Warpcast handshake + получить аккаунт
  useEffect(() => {
    sdk.actions.ready().catch(() => {})
    ;(async () => {
      try {
        if (provider?.request) {
          const accs = await provider.request({ method: "eth_accounts" })
          setAddress(accs && accs[0] ? accs[0] : null)
          return
        }
      } catch {}
      // фолбэк на window.farcaster при необходимости
      try {
        const accs = await (window as any)?.farcaster?.wallet?.getAccounts?.()
        setAddress(accs && accs[0] ? accs[0] : null)
      } catch {
        setAddress(null)
      }
    })()
  }, [provider])

  // загрузка среднего рейтинга
  useEffect(() => {
    if (!placeId) return
    ;(async () => {
      try {
        const x100 = await publicClient.readContract({
          abi: ratingsAbi,
          address: CONTRACT_ADDRESS,
          functionName: "getAverageX100",
          args: [placeId],
        })
        setAvg(Number(x100) / 100)
      } catch {
        setAvg(null)
      }
    })()
  }, [placeId])

  const renderStars = (v?: number | null) => {
    if (!v) return "—"
    const full = Math.floor(v)
    const half = v - full >= 0.5
    return "⭐".repeat(full) + (half ? "✰" : "") + ` (${v.toFixed(1)})`
  }

  async function rate(stars: number) {
    if (!address) {
      alert(t.walletMissing)
      return
    }
    if (!placeId) return

    const data = encodeFunctionData({
      abi: ratingsAbi,
      functionName: "ratePlace",
      args: [placeId, stars],
    })

    setSending(true)
    try {
      if (!provider?.request) throw new Error("Miniapp provider unavailable")
      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: CONTRACT_ADDRESS, data, value: "0x0" }],
      })

      // перечитать средний рейтинг
      try {
        const x100 = await publicClient.readContract({
          abi: ratingsAbi,
          address: CONTRACT_ADDRESS,
          functionName: "getAverageX100",
          args: [placeId],
        })
        setAvg(Number(x100) / 100)
      } catch {}
    } catch (e) {
      console.error(e)
      alert(t.txFailed)
    } finally {
      setSending(false)
    }
  }

  if (!placeId) return <p className="p-4">Loading…</p>
  if (!place) return <p className="p-4">{t.notFound}</p>

  return (
    <>
      <Head>
        <title>{place.title} — Mini</title>
      </Head>
      <main className="min-h-screen p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/frame")}
            className="text-sm text-indigo-700"
          >
            {t.back}
          </button>
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="px-3 py-1 text-sm border rounded hover:bg-indigo-50"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="relative w-full h-48">
            <Image src={place.image} alt={place.title} fill className="object-cover" />
          </div>
          <div className="p-4 space-y-3">
            <h1 className="text-lg font-bold text-indigo-700">{place.title}</h1>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {place.long ?? place.short}
            </p>

            <p className="text-gray-800">
              {t.avg}: <span className="font-medium">{renderStars(avg)}</span>
            </p>

            <div className="flex gap-2">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  disabled={sending}
                  onClick={() => rate(s)}
                  className={`px-3 py-1 rounded border text-sm ${
                    sending ? "opacity-60" : "hover:bg-indigo-50"
                  }`}
                >
                  {s}⭐
                </button>
              ))}
            </div>

            {!address && (
              <p className="text-xs text-gray-500">
                {t.walletMissing}. Откройте мини-приложение в Warpcast, подключите кошелёк и обновите страницу.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
