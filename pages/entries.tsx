// pages/entries.tsx
import { useEffect, useState } from "react"
import { readContract } from "@wagmi/core"
import { useAccount } from "wagmi"
import { wagmiClientConfig } from "../lib/wagmi"   // ✅ оставляем как было
import ratingsAbi from "../abi/BarcelonaRatings.json" // ✅ под наш контракт
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react" // ✅ используем для сравнения с средним
import { ConnectButton } from "@rainbow-me/rainbowkit"
import Image from "next/image"
import { places } from "../data/places" // ✅ чтобы показать название/картинку места

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}` // ✅ под наш проект

type MyPlaceRating = {
  placeId: number
  my: number          // моя оценка 1..5
  avg: number | null  // средний рейтинг (может быть null, если нет рейтингов)
}

export default function EntriesPage() {
  const { address, isConnected } = useAccount()
  const [entries, setEntries] = useState<MyPlaceRating[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(6) // сколько мест проверяем за раз
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filter, setFilter] = useState<"all" | "4plus" | "5">("all") // ✅ фильтр по моей оценке

  useEffect(() => {
    if (!isConnected || !address) return
    fetchEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, count, sortOrder, filter])

  // ✅ вспомогательно: берём первые N places (как раньше брали N дат)
  async function safeGetPlaces(limit: number) {
    return places.slice(0, Math.max(0, limit))
  }

  // читаем мою оценку; контракт мог назвать геттер по-разному — пробуем несколько
  async function readMyRating(addr: `0x${string}`, placeId: number): Promise<number | null> {
    const candidates = [
      { fn: "getUserRating", args: [addr, BigInt(placeId)] },
      { fn: "ratingOf", args: [addr, BigInt(placeId)] },
      { fn: "userRating", args: [addr, BigInt(placeId)] },
      { fn: "userRatings", args: [addr, BigInt(placeId)] }, // public mapping
    ] as const

    for (const c of candidates) {
      try {
        const out = await readContract(wagmiClientConfig, {
          abi: ratingsAbi as any,
          address: CONTRACT_ADDRESS,
          functionName: c.fn as any,
          args: c.args as any,
        })
        // нормализуем (bigint | number | tuple)
        if (typeof out === "bigint" || typeof out === "number") return Number(out)
        if (Array.isArray(out) && out.length) return Number(out[0])
        if (out && typeof out === "object" && "0" in (out as any)) return Number((out as any)["0"])
      } catch {
        // пробуем следующий вариант
      }
    }
    return null
  }

  // читаем средний рейтинг x100 -> делим на 100
  async function readAverage(placeId: number): Promise<number | null> {
    try {
      const x100 = await readContract(wagmiClientConfig, {
        abi: ratingsAbi as any,
        address: CONTRACT_ADDRESS,
        functionName: "getAverageX100",
        args: [BigInt(placeId)],
      })
      const n = typeof x100 === "bigint" ? Number(x100) : Number(x100 || 0)
      if (!isFinite(n)) return null
      return n / 100
    } catch {
      return null
    }
  }

  async function fetchEntries() {
    try {
      setLoading(true)
      const chunk = await safeGetPlaces(count)

      const res: MyPlaceRating[] = []
      // последовательно, чтобы не зафлудить RPC
      for (const p of chunk) {
        const my = await readMyRating(address as `0x${string}`, p.id)
        if (my && my > 0) {
          const avg = await readAverage(p.id)
          res.push({ placeId: p.id, my, avg })
        }
      }

      // фильтр по моей оценке
      const filtered = res.filter((r) => {
        if (filter === "5") return r.my === 5
        if (filter === "4plus") return r.my >= 4
        return true
      })

      // сортировка по моей оценке (как раньше по дате)
      const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc" ? a.my - b.my : b.my - a.my
      )

      setEntries(sorted)
    } finally {
      setLoading(false)
    }
  }

  // «звёзды» для числа
  function stars(n?: number | null) {
    if (!n) return "—"
    const full = Math.max(0, Math.min(5, Math.floor(n)))
    const half = n - full >= 0.5
    return "⭐".repeat(full) + (half ? "✰" : "")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center p-6 space-y-6">
      <h1 className="text-3xl font-bold text-indigo-700 font-display">Мои оценки</h1>

      {!isConnected ? (
        <Card className="w-full max-w-md text-center p-6 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">
              Подключите кошелёк, чтобы просмотреть ваши оценки мест
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <ConnectButton showBalance={false} accountStatus="address" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Панель сортировки и фильтра */}
          <div className="flex gap-4">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="rounded border px-3 py-1 text-sm"
            >
              <option value="desc">Высокие сверху</option>
              <option value="asc">Низкие сверху</option>
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "4plus" | "5")}
              className="rounded border px-3 py-1 text-sm"
            >
              <option value="all">Все</option>
              <option value="4plus">Только 4★ и выше</option>
              <option value="5">Только 5★</option>
            </select>
          </div>

          {/* Карточка истории */}
          <Card className="w-full max-w-3xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-indigo-700">
                Поставленные оценки
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-gray-500">Загрузка...</p>}
              {!loading && entries.length === 0 && (
                <p className="text-gray-500">Пока нет оценённых мест</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {entries.map((r) => {
                  const place = places.find((p) => p.id === r.placeId)
                  if (!place) return null

                  const diff = r.avg != null ? r.my - r.avg : 0
                  const trend =
                    r.avg == null
                      ? null
                      : diff > 0.25
                        ? "up"
                        : diff < -0.25
                          ? "down"
                          : "flat"

                  return (
                    <div
                      key={r.placeId}
                      className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition flex gap-3"
                    >
                      <div className="relative h-20 w-28 flex-shrink-0 rounded overflow-hidden">
                        <Image src={place.image} alt={place.title} fill className="object-cover" />
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{place.title}</p>

                        <div className="mt-1 text-sm text-gray-800 flex items-center gap-2">
                          <span className="text-gray-500">Ваша:</span>
                          <span className="font-medium">{stars(r.my)} ({r.my})</span>
                          {trend === "up" && <ArrowUpCircle className="w-4 h-4 text-green-600" />}
                          {trend === "down" && <ArrowDownCircle className="w-4 h-4 text-red-600" />}
                        </div>

                        <div className="text-sm text-gray-600">
                          Средняя: {r.avg != null ? `${stars(r.avg)} (${r.avg.toFixed(2)})` : "—"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Пагинация: проверяем ещё места */}
              {places.length > count && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setCount(count + 6)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Показать ещё
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
