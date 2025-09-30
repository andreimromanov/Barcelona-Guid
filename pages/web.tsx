import Head from "next/head"
import Image from "next/image"
import { useEffect, useState } from "react"
import { publicClient } from "../lib/viem"
import ratingsAbi from "../abi/BarcelonaRatings.json"
import { places } from "../data/places"
import { encodeFunctionData } from "viem"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

// 🔤 Переводы
const translations = {
  ru: {
    connect: "🔑 Подключить кошелек",
    connected: "✅ Кошелек подключен",
    rate: "⭐ Поставить оценку",
    rating: "Средний рейтинг",
  },
  en: {
    connect: "🔑 Connect Wallet",
    connected: "✅ Wallet Connected",
    rate: "⭐ Rate this place",
    rating: "Average rating",
  },
}

export default function Web() {
  const [lang, setLang] = useState<"ru" | "en">("ru")
  const t = translations[lang]

  const [address, setAddress] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  // подключение кошелька
  async function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        })
        setAddress(accounts[0])
      } catch (err) {
        console.error("Wallet connect error:", err)
      }
    } else {
      alert("Install MetaMask or use WalletConnect")
    }
  }

  // чтение среднего рейтинга
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

  // отправка оценки
  async function ratePlace(placeId: number, rating: number) {
    if (!address) {
      alert(lang === "ru" ? "Сначала подключите кошелёк" : "Connect wallet first")
      return
    }
    const rater = address as `0x${string}`
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60

    const nextNonce = await publicClient.readContract({
      abi: ratingsAbi,
      address: CONTRACT_ADDRESS,
      functionName: "getNextNonce",
      args: [rater, placeId],
    })

    const domain = {
      name: "BarcelonaRatings",
      version: "1",
      chainId: 8453,
      verifyingContract: CONTRACT_ADDRESS,
    }

    const types = {
      Rating: [
        { name: "rater", type: "address" },
        { name: "placeId", type: "uint256" },
        { name: "rating", type: "uint8" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }

    // 🔑 фикс: приводим BigInt → Number
    const message = {
      rater,
      placeId,
      rating,
      nonce: Number(nextNonce),
      deadline,
    }

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

  useEffect(() => {
    loadRatings()
  }, [])

  return (
    <>
      <Head>
        <title>Barcelona Guide — Web</title>
      </Head>

      <main className="min-h-screen p-6 space-y-6 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-emerald-700 text-center">
            Barcelona Guide — Web
          </h1>
          <div className="flex gap-2">
            {!address && (
              <button
                onClick={connectWallet}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
              >
                {t.connect}
              </button>
            )}
            {address && (
              <span className="text-emerald-700 font-semibold">
                {t.connected}
              </span>
            )}
            <button
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="px-3 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading ratings…</p>}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <div
              key={p.id}
              className="border rounded-xl shadow-md bg-white hover:shadow-xl transition overflow-hidden flex flex-col"
            >
              <div className="relative w-full h-48">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-grow">
                <h2 className="font-bold text-lg text-emerald-700">{p.title}</h2>
                <p className="text-gray-700 text-sm flex-grow">{p.short}</p>
                <p className="text-gray-800">
                  {t.rating}:{" "}
                  <span className="font-semibold">
                    {ratings[p.id] ? ratings[p.id].toFixed(2) : "—"}
                  </span>
                </p>
                {address && (
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => ratePlace(p.id, star)}
                        className="px-2 py-1 border rounded hover:bg-emerald-50 text-sm"
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
