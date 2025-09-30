// pages/frame.tsx
import Head from "next/head"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { encodeFunctionData } from "viem"
import { sdk } from "@farcaster/miniapp-sdk"
import ratingsAbi from "../abi/BarcelonaRatings.json"
import { publicClient } from "../lib/viem"
import { places } from "../data/places"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

// 🔤 Переводы (минимально нужное)
const translations = {
  ru: {
    title: "Barcelona Guide — Mini",
    walletNotConnected: "Farcaster wallet не подключён",
    avg: "Средний рейтинг",
    rate: "Поставить оценку",
    back: "Назад",
  },
  en: {
    title: "Barcelona Guide — Mini",
    walletNotConnected: "Farcaster wallet not connected",
    avg: "Average rating",
    rate: "Rate",
    back: "Back",
  },
}

export default function Frame() {
  const [lang, setLang] = useState<"ru" | "en">("ru")
  const t = translations[lang]

  // адрес из Farcaster-кошелька
  const [address, setAddress] = useState<string | null>(null)

  // средние рейтинги по местам
  const [avgMap, setAvgMap] = useState<Record<number, number>>({})
  const [loadingAvg, setLoadingAvg] = useState(false)

  // состояние отправки транзакции
  const [sendingId, setSendingId] = useState<number | null>(null)

  // провайдер Farcaster mini-app
  const provider = sdk.wallet.ethProvider

  // handshake для Warpcast splash + получаем аккаунт
  useEffect(() => {
    sdk.actions.ready().catch(() => {})
    ;(async () => {
      try {
        if (!provider?.request) return
        const accs = await provider.request({ method: "eth_accounts" })
        setAddress(accs && accs[0] ? accs[0] : null)
      } catch {
        setAddress(null)
      }
    })()
  }, [provider])

  // загрузка средних рейтингов
  useEffect(() => {
    ;(async () => {
      setLoadingAvg(true)
      const out: Record<number, number> = {}
      for (const p of places) {
        try {
          const x100 = await publicClient.readContract({
            abi: ratingsAbi,
            address: CONTRACT_ADDRESS,
            functionName: "getAverageX100",
            args: [p.id],
          })
          out[p.id] = Number(x100) / 100
        } catch {
          out[p.id] = 0
        }
      }
      setAvgMap(out)
      setLoadingAvg(false)
    })()
  }, [])

  // «звёзды»
  const renderStars = (v?: number) => {
    if (!v) return "—"
    const full = Math.floor(v)
    const half = v - full >= 0.5
    return "⭐".repeat(full) + (half ? "✰" : "") + ` (${v.toFixed(1)})`
  }

  // отправка оценки как обычной on-chain транзакции
  async function ratePlace(placeId: number, rating: number) {
    if (!provider?.request) {
      alert(lang === "ru" ? "Кошелёк Farcaster недоступен" : "Farcaster wallet unavailable")
      return
    }
    if (!address) {
      alert(t.walletNotConnected)
      return
    }

    const data = encodeFunctionData({
      abi: ratingsAbi,
      functionName: "ratePlace",
      args: [placeId, rating],
    })

    setSendingId(placeId)
    try {
      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: CONTRACT_ADDRESS, data, value: "0x0" }],
      })

      // перечитать средний по этому месту
      try {
        const x100 = await publicClient.readContract({
          abi: ratingsAbi,
          address: CONTRACT_ADDRESS,
          functionName: "getAverageX100",
          args: [placeId],
        })
        setAvgMap((m) => ({ ...m, [placeId]: Number(x100) / 100 }))
      } catch {}
    } catch (e) {
      console.error(e)
      alert(lang === "ru" ? "Не удалось отправить транзакцию" : "Transaction failed")
    } finally {
      setSendingId(null)
    }
  }

  // небольшая фильтрация/сортировка (по алфавиту)
  const list = useMemo(
    () => [...places].sort((a, b) => a.title.localeCompare(b.title)),
    []
  )

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <main className="min-h-screen p-4 bg-white">
        {/* шапка */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-indigo-700">{t.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="px-3 py-1 text-sm border rounded hover:bg-indigo-50"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {address ? `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}` : t.walletNotConnected}
        </p>

        {/* список мест */}
        <div className="grid gap-3 grid-cols-1">
          {list.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 flex gap-3 items-center">
              <div className="relative w-20 h-16 overflow-hidden rounded">
                <Image src={p.image} alt={p.title} fill className="object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.title}</p>
                <p className="text-xs text-gray-600 truncate">{p.short}</p>
                <p className="text-xs text-gray-800 mt-1">
                  ⭐ {t.avg}: {loadingAvg ? "…" : renderStars(avgMap[p.id])}
                </p>

                {/* кнопки оценки */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      disabled={sendingId === p.id}
                      onClick={() => ratePlace(p.id, s)}
                      className={`px-2 py-1 text-xs border rounded ${
                        sendingId === p.id ? "opacity-60" : "hover:bg-indigo-50"
                      }`}
                    >
                      {s}⭐
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
