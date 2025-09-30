import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import { useEffect, useState } from "react"
import { publicClient } from "../../lib/viem"
import ratingsAbi from "../../abi/BarcelonaRatings.json"
import { places } from "../../data/places"
import { encodeFunctionData } from "viem"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`

export default function PlacePage() {
  const router = useRouter()
  const { id } = router.query
  const placeId = id ? Number(id) : null

  const place = placeId ? places.find((p) => p.id === placeId) : null

  const [rating, setRating] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔧 если id ещё не подгрузился
  if (!placeId) {
    return <p className="p-6">Loading place…</p>
  }

  if (!place) {
    return <p className="p-6">Place not found</p>
  }

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
  async function fetchRating() {
    try {
      setLoading(true)
      const avgX100 = await publicClient.readContract({
        abi: ratingsAbi,
        address: CONTRACT_ADDRESS,
        functionName: "getAverageX100",
        args: [placeId],
      })
      setRating(Number(avgX100) / 100)
    } catch {
      setRating(null)
    } finally {
      setLoading(false)
    }
  }

  // отправка оценки
  async function ratePlace(stars: number) {
    if (!address) {
      alert("Connect wallet first")
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

    const message = {
      rater,
      placeId,
      rating: stars,
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
      args: [rater, placeId, stars, deadline, signature],
    })

    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: rater, to: CONTRACT_ADDRESS, data, value: "0x0" }],
    })

    fetchRating()
  }

  useEffect(() => {
    if (placeId) fetchRating()
  }, [placeId])

  function renderStars(value: number) {
    const full = Math.floor(value)
    const half = value - full >= 0.5
    const stars = []
    for (let i = 0; i < full; i++) stars.push("⭐")
    if (half) stars.push("✰")
    return stars.join("")
  }

  return (
    <>
      <Head>
        <title>{place.title} — Barcelona Guide</title>
      </Head>
      <main className="min-h-screen p-6 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="relative w-full h-64">
            <Image
              src={place.image}
              alt={place.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-6 space-y-4">
            <h1 className="text-3xl font-bold text-emerald-700">{place.title}</h1>
            <p className="text-gray-700">{place.short}</p>

            {loading ? (
              <p className="text-gray-500">Loading rating…</p>
            ) : (
              <p className="text-gray-800 text-lg">
                Средний рейтинг:{" "}
                {rating ? (
                  <span className="font-semibold">
                    {renderStars(rating)} ({rating.toFixed(1)})
                  </span>
                ) : (
                  "—"
                )}
              </p>
            )}

            <div className="flex gap-2">
              {!address ? (
                <button
                  onClick={connectWallet}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                >
                  Подключить кошелек
                </button>
              ) : (
                [1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => ratePlace(star)}
                    className="px-3 py-1 border rounded hover:bg-emerald-50"
                  >
                    {star}⭐
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
            >
              ⬅ Вернуться назад
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
