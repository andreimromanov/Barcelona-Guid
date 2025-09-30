// pages/frame.tsx
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { encodeFunctionData } from "viem"
import { sdk } from "@farcaster/miniapp-sdk"
import ratingsAbi from "../abi/BarcelonaRatings.json"
import { publicClient } from "../lib/viem"
import { places } from "../data/places"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

const translations = {
  ru: {
    title: "Barcelona Guide — Mini",
    walletNotConnected: "Farcaster wallet не подключён",
    avg: "Средний рейтинг",
    open: "Открыть",
  },
  en: {
    title: "Barcelona Guide — Mini",
    walletNotConnected: "Farcaster wallet not connected",
    avg: "Average rating",
    open: "Open",
  },
}

export default function Frame() {
  const [lang, setLang] = useState<"ru" | "en">("ru")
  const t = translations[lang]

  // ✅ адрес теперь строго типизирован
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [avgMap, setAvgMap] = useState<Record<number, number>>({})
  const [loadingAvg, setLoadingAvg] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)

  const provider = sdk.wallet.ethProvider

  // Warpcast handshake + получить аккаунт
  useEffect(() => {
    sdk.actions.ready().catch(() => {})
    ;(async () => {
      try {
        if (provider?.request) {
          const accs = await provider.request({ method: "eth_accounts" })
          const a = accs && accs[0]
          if (a && typeof a === "string" && a.startsWith("0x")) {
            setAddress(a as `0x${string}`)
            return
          }
        }
      } catch {}
      // фолбэк на window.farcaster при необходимости
      try {
        const accs = await (window as any)?.farcaster?.wallet?.getAccounts?.()
        const a = accs && accs[0]
        if (a && typeof a === "string" && a.startsWith("0x")) {
          setAddress(a as `0x${string}`)
        } else {
          setAddress(null)
        }
      } catch {
        setAddress(null)
      }
    })()
  }, [provider])

  // загрузить средние рейтинги
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

  const renderStars = (v?: number) => {
    if (!v) return "—"
    const full = Math.floor(v)
    const half = v - full >= 0.5
    return "⭐".repeat(full) + (half ? "✰" : "") + ` (${v.toFixed(1)})`
  }

  async function ratePlace(placeId: number, rating: number) {
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
      if (!provider?.request) throw new Error("Miniapp provider unavailable")
      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: CONTRACT_ADDRESS, data, value: "0x0" }],
      })
      // после отправки перечитаем средний рейтинг только для этого места
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

  // алфавитный список
  const list = useMemo(() => [...places].sort((a, b) => a.title.localeCompare(b.title)), [])

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <main className="min-h-screen p-4 bg-white">
        {/* Шапка */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-indigo-700">{t.title}</h1>
          <button
            onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="px-3 py-1 text-sm border rounded hover:bg-indigo-50"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {address ? `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}` : t.walletNotConnected}
        </p>

        {/* Список мест */}
        <div className="grid gap-3 grid-cols-1">
          {list.map((p) => (
            <div
              key={p.id}
              className="border rounded-lg p-3 flex gap-3 items-center cursor-pointer hover:bg-indigo-50"
              onClick={() => (window.location.href = `/frame/${p.id}`)}
            >
              <div className="relative w-20 h-16 overflow-hidden rounded">
                <Image src={p.image} alt={p.title} fill className="object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.title}</p>
                <p className="text-xs text-gray-600 truncate">{p.short}</p>
                <p className="text-xs text-gray-800 mt-1">
                  ⭐ {t.avg}: {loadingAvg ? "…" : renderStars(avgMap[p.id])}
                </p>

                {/* Кнопки оценки — останавливаем всплытие, чтобы не триггерить переход по карточке */}
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
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

                  <Link
                    href={`/frame/${p.id}`}
                    className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.open}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
