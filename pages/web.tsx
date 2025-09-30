import Head from "next/head"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/router"
import { publicClient } from "../lib/viem"
import ratingsAbi from "../abi/BarcelonaRatings.json"
import { places } from "../data/places"
import { encodeFunctionData } from "viem"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

const translations = {
  ru: {
    connect: "🔑 Подключить кошелек",
    connected: "✅ Кошелек подключен",
    rating: "Средний рейтинг",
    search: "Поиск по названию...",
    byName: "По названию",
    byRating: "По рейтингу",
  },
  en: {
    connect: "🔑 Connect Wallet",
    connected: "✅ Wallet Connected",
    rating: "Average rating",
    search: "Search by name...",
    byName: "By name",
    byRating: "By rating",
  },
}

export default function Web() {
  const router = useRouter()
  const [lang, setLang] = useState<"ru" | "en">("ru")
  const t = translations[lang]

  const [address, setAddress] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  // поиск/сортировка (оставим базово)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"name" | "rating">("name")

  async function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        setAddress(accounts[0])
      } catch (err) { console.error(err) }
    } else {
      alert("Install MetaMask or use WalletConnect")
    }
  }

  async function fetchAverage(placeId: number) {
    try {
      const avgX100 = await publicClient.readContract({
        abi: ratingsAbi,
        address: CONTRACT_ADDRESS,
        functionName: "getAverageX100",
        args: [placeId],
      })
      return Number(avgX100) / 100
    } catch {
      return 0
    }
  }

  async function loadRatings() {
    setLoading(true)
    const result: Record<number, number> = {}
    for (let p of places) {
      result[p.id] = await fetchAverage(p.id)
    }
    setRatings(result)
    setLoading(false)
  }

  async function ratePlace(placeId: number, rating: number) {
    if (!address) { alert(lang === "ru" ? "Сначала подключите кошелёк" : "Connect wallet first"); return }
    const rater = address as `0x${string}`
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60

    const nextNonce = await publicClient.readContract({
      abi: ratingsAbi,
      address: CONTRACT_ADDRESS,
      functionName: "getNextNonce",
      args: [rater, placeId],
    })

    const domain = { name: "BarcelonaRatings", version: "1", chainId: 8453, verifyingContract: CONTRACT_ADDRESS }
    const types = {
      Rating: [
        { name: "rater", type: "address" },
        { name: "placeId", type: "uint256" },
        { name: "rating", type: "uint8" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }
    const message = { rater, placeId, rating, nonce: Number(nextNonce), deadline }

    const signature = await window.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [rater, JSON.stringify({ domain, types, primaryType: "Rating", message })],
    })

    const data = encodeFunctionData({
      abi: ratingsAbi,
      functionName: "submitRating",
      args: [rater, placeId, rating, deadline, signature],
    })

    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: rater, to: CONTRACT_ADDRESS, data, value: "0x0" }],
    })

    loadRatings()
  }

  useEffect(() => { loadRatings() }, [])

  const goToPlace = (id: number) => router.push(`/place/${id}`)

  const filtered = useMemo(() => {
    let list = places.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    if (sort === "name") list = list.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === "rating") list = list.sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0))
    return list
  }, [search, sort, ratings])

  const renderStars = (value?: number) => {
    if (!value) return "—"
    const full = Math.floor(value)
    const half = value - full >= 0.5
    return "⭐".repeat(full) + (half ? "✰" : "") + ` (${value.toFixed(1)})`
  }

  return (
    <>
      <Head><title>Barcelona Guide — Web</title></Head>

      <main className="min-h-screen p-6 space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-brand-700">
            Barcelona Guide
          </h1>
          <div className="flex items-center gap-2">
            {!address ? (
              <button onClick={connectWallet} className="btn-brand">{t.connect}</button>
            ) : (
              <span className="px-3 py-1 rounded bg-brand-100 text-brand-700 font-medium">{t.connected}</span>
            )}
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="btn-outline-brand"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="border border-brand-200 focus:ring-2 focus:ring-brand-300 focus:outline-none p-2 rounded w-64 text-gray-700"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="border border-brand-200 focus:ring-2 focus:ring-brand-300 focus:outline-none p-2 rounded text-gray-700"
          >
            <option value="name">{t.byName}</option>
            <option value="rating">{t.byRating}</option>
          </select>
          {loading && <span className="text-sm text-gray-500">Обновляем рейтинги…</span>}
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => goToPlace(p.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToPlace(p.id)}
              className="card overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <div className="relative w-full h-48">
                <Image src={p.image} alt={p.title} fill className="object-cover" />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h2 className="font-display font-semibold text-lg text-brand-700">{p.title}</h2>
                <p className="text-gray-700 text-sm">{p.short}</p>
                <p className="text-gray-800">
                  <span className="text-gray-500 mr-1">⭐</span>
                  {renderStars(ratings[p.id])}
                </p>
                {address && (
                  <div
                    className="flex gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => ratePlace(p.id, star)}
                        className="btn-outline-brand text-sm"
                      >
                        {star}⭐
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
