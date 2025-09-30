// pages/frame.tsx
import Head from "next/head"
import { useEffect, useRef, useState } from "react"
import { encodeFunctionData } from "viem"
import { sdk } from "@farcaster/miniapp-sdk"
import abi from "../abi/FitnessDiary.json"
import { publicClient } from "../lib/viem"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`

type Entry = {
  date: number
  weightGrams: number
  caloriesIn: number
  caloriesOut: number
  steps: number
  exists: boolean
}

export default function Frame() {
  const [status, setStatus] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"log" | "entries" | "chart" | "stats">("log")

  // форма
  const [date, setDate] = useState("")
  const [weight, setWeight] = useState("")
  const [calIn, setCalIn] = useState("")
  const [calOut, setCalOut] = useState("")
  const [steps, setSteps] = useState("")

  // фильтр дат
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const pollRef = useRef<number | null>(null)

  // убираем splash
  useEffect(() => {
    ;(async () => {
      try {
        await sdk.actions.ready()
      } catch (e) {
        console.warn("⚠️ sdk.actions.ready() failed", e)
      }
    })()
  }, [])

  const provider = sdk.wallet.ethProvider

  // безопасный вызов getDates
  async function safeGetDates(user: `0x${string}`): Promise<bigint[]> {
    let count = 50n
    while (count > 0n) {
      try {
        const dates = (await publicClient.readContract({
          abi,
          address: CONTRACT_ADDRESS,
          functionName: "getDates",
          args: [user, 0n, count],
        })) as bigint[]
        return dates
      } catch (err: any) {
        if (err.message?.includes("Out of bounds")) {
          count -= 1n
        } else {
          console.error("safeGetDates error:", err)
          throw err
        }
      }
    }
    return []
  }

  async function fetchEntries() {
    try {
      if (!provider?.request) return
      const [user] = await provider.request({ method: "eth_accounts" })
      if (!user) return

      setLoading(true)

      const datesBigInt = await safeGetDates(user as `0x${string}`)
      const dates = datesBigInt.map(Number)

      const fetched: Entry[] = []
      for (let d of dates) {
        try {
          const entry = (await publicClient.readContract({
            abi,
            address: CONTRACT_ADDRESS,
            functionName: "getEntry",
            args: [user as `0x${string}`, BigInt(d)],
          })) as Entry

          if (entry.exists) {
            fetched.push({
              ...entry,
              date: Number(entry.date),
              weightGrams: Number(entry.weightGrams),
              caloriesIn: Number(entry.caloriesIn),
              caloriesOut: Number(entry.caloriesOut),
              steps: Number(entry.steps),
            })
          }
        } catch (err) {
          console.error(`fetchEntry(${d}) error:`, err)
        }
      }

      setEntries(fetched.sort((a, b) => b.date - a.date))
    } catch (err) {
      console.error("fetchEntries error", err)
    } finally {
      setLoading(false)
    }
  }

  async function logEntry() {
    try {
      if (!date || !weight || !calIn || !calOut || !steps) {
        alert("⚠️ Заполни все поля")
        return
      }
      if (!provider?.request) throw new Error("Warpcast кошелёк недоступен")

      setStatus("⏳ Отправка транзакции...")

      const ymd = Number(date.replace(/-/g, "")) // yyyy-mm-dd → yyyymmdd
      const w = Math.round(Number(weight) * 1000)
      const ci = Number(calIn)
      const co = Number(calOut)
      const st = Number(steps)

      const data = encodeFunctionData({
        abi: abi as any,
        functionName: "logEntry",
        args: [ymd, w, ci, co, st],
      })

      const [from] = await provider.request({ method: "eth_accounts" })
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: CONTRACT_ADDRESS,
            data,
            value: "0x0",
          },
        ],
      })

      setStatus(`✅ Успешно! tx: ${txHash}`)
      fetchEntries()
    } catch (err: any) {
      console.error("logEntry error:", err)
      setStatus(`❌ Ошибка: ${err.message || String(err)}`)
    }
  }

  // автообновление раз в 30 секунд
  useEffect(() => {
    fetchEntries()
    if (pollRef.current !== null) window.clearInterval(pollRef.current)
    pollRef.current = window.setInterval(fetchEntries, 30000)
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
    }
  }, [])

  function formatDate(num: number) {
    const str = num.toString()
    return `${str.slice(6, 8)}/${str.slice(4, 6)}/${str.slice(0, 4)}`
  }

  const chartData = entries.map((e) => ({
    date: formatDate(e.date),
    weight: e.weightGrams / 1000,
    calIn: e.caloriesIn,
    calOut: e.caloriesOut,
  }))

  // 📊 статистика
  function getStats() {
    if (entries.length === 0) return null
    const avgWeight =
      entries.reduce((sum, e) => sum + e.weightGrams, 0) / entries.length / 1000
    const avgIn =
      entries.reduce((sum, e) => sum + e.caloriesIn, 0) / entries.length
    const avgOut =
      entries.reduce((sum, e) => sum + e.caloriesOut, 0) / entries.length
    const maxSteps = Math.max(...entries.map((e) => e.steps))
    const minWeight = Math.min(...entries.map((e) => e.weightGrams)) / 1000
    return { avgWeight, avgIn, avgOut, maxSteps, minWeight }
  }

  const stats = getStats()

  // 💾 экспорт в CSV
  function exportCSV() {
    if (entries.length === 0) return
    const header = "Дата,Вес,Калории In,Калории Out,Шаги\n"
    const rows = entries
      .map(
        (e) =>
          `${formatDate(e.date)},${(e.weightGrams / 1000).toFixed(1)},${
            e.caloriesIn
          },${e.caloriesOut},${e.steps}`
      )
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fitness-diary.csv"
    a.click()
  }

  // фильтр по датам
  const filteredEntries = entries.filter((e) => {
    if (startDate && e.date < Number(startDate.replace(/-/g, ""))) return false
    if (endDate && e.date > Number(endDate.replace(/-/g, ""))) return false
    return true
  })

  return (
    <>
      <Head>
        <title>Fitness Diary — Mini</title>
      </Head>

      <main className="min-h-screen p-6 space-y-6 bg-gradient-to-b from-gray-50 to-gray-100">
        <h1 className="text-3xl font-extrabold text-emerald-700 text-center">
          Fitness Diary — Mini
        </h1>
        <p className="text-center text-gray-600">{status || "Готово"}</p>

        {/* меню */}
        <nav className="flex justify-center gap-3 flex-wrap">
          {[
            ["entries", "📖 Записи"],
            ["log", "➕ Добавить"],
            ["chart", "📊 График"],
            ["stats", "🏆 Статистика"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`px-4 py-2 rounded-lg transition ${
                view === key
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-emerald-700 border border-emerald-600 hover:bg-emerald-50"
              }`}
              onClick={() => setView(key as any)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Добавить запись */}
        {view === "log" && (
          <div className="space-y-2 border p-4 rounded-lg shadow bg-white">
            <input
              type="date"
              className="w-full border p-2 rounded text-gray-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Вес (кг)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Калории In"
              value={calIn}
              onChange={(e) => setCalIn(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Калории Out"
              value={calOut}
              onChange={(e) => setCalOut(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded text-gray-900"
              placeholder="Шаги"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={logEntry}
                className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 w-full transition"
              >
                ➕ Добавить запись
              </button>
              <button
                onClick={() => {
                  setDate("")
                  setWeight("")
                  setCalIn("")
                  setCalOut("")
                  setSteps("")
                }}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                🧹 Очистить
              </button>
            </div>
          </div>
        )}

        {/* Последние записи */}
        {view === "entries" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="font-semibold text-lg text-emerald-700">
                Последние записи
              </h2>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border p-1 rounded text-gray-700"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border p-1 rounded text-gray-700"
                />
                <button
                  onClick={fetchEntries}
                  className="bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600 transition"
                >
                  🔄 Обновить
                </button>
                <button
                  onClick={exportCSV}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                >
                  💾 Экспорт
                </button>
              </div>
            </div>
            {loading && <p className="text-gray-500">Загрузка...</p>}
            {!loading && filteredEntries.length === 0 && (
              <p className="text-gray-500">Записей пока нет</p>
            )}
            {filteredEntries.map((e, i) => (
              <div
                key={i}
                className="border rounded-xl p-4 shadow-md bg-white hover:shadow-lg transition"
              >
                <p className="text-sm text-gray-500">{formatDate(e.date)}</p>
                <p className="font-semibold text-emerald-700 text-lg">
                  Вес: {(e.weightGrams / 1000).toFixed(1)} кг
                </p>
                <p className="text-sm text-gray-700">
                  Калории:{" "}
                  <span className="font-medium">{e.caloriesIn}</span> /{" "}
                  <span className="font-medium">{e.caloriesOut}</span>
                </p>
                <p className="text-sm text-gray-700">Шаги: {e.steps}</p>
              </div>
            ))}
          </div>
        )}

        {/* График */}
        {view === "chart" && (
          <div className="w-full h-72 bg-white p-4 rounded-lg shadow">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Вес (кг)"
                  />
                  <Line
                    type="monotone"
                    dataKey="calIn"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Калории In"
                  />
                  <Line
                    type="monotone"
                    dataKey="calOut"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Калории Out"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">Нет данных для графика</p>
            )}
          </div>
        )}

        {/* Статистика */}
        {view === "stats" && stats && (
          <div className="bg-white p-6 rounded-lg shadow space-y-2 text-center">
            <h2 className="text-lg font-bold text-emerald-700">
              📊 Общая статистика
            </h2>
            <p>Средний вес: {stats.avgWeight.toFixed(1)} кг</p>
            <p>Средний калораж In: {stats.avgIn.toFixed(0)}</p>
            <p>Средний калораж Out: {stats.avgOut.toFixed(0)}</p>
            <p>Макс. шагов: {stats.maxSteps}</p>
            <p>Мин. вес: {stats.minWeight.toFixed(1)} кг</p>
          </div>
        )}
      </main>
    </>
  )
}
