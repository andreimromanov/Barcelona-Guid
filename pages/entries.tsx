import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { readContract } from "wagmi/actions"
import { config } from "../lib/wagmi"

import abi from "../abi/FitnessDiary.json"
import contractAddressJson from "../abi/FitnessDiary.address.json" assert { type: "json" }
const CONTRACT_ADDRESS = contractAddressJson as `0x${string}`

export default function EntriesPage() {
  const { address, isConnected } = useAccount()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !address) return

    async function loadEntries() {
      try {
        setLoading(true)

        const result = await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi,
          functionName: "getEntries",
          args: [address, BigInt(0), BigInt(50)],
        })

        console.log("getEntries result:", result)
        setEntries(result as any[])
      } catch (err) {
        console.error("Ошибка загрузки:", err)
        setEntries([])
      } finally {
        setLoading(false)
      }
    }

    loadEntries()
  }, [isConnected, address])

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Мои записи</h1>
      <p>Адрес: {address}</p>

      {loading && <p>Загрузка...</p>}

      {!loading && entries.length === 0 && <p>Нет записей</p>}

      {entries.length > 0 && (
        <ul>
          {entries.map((entry, idx) => (
            <li key={idx}>
              📅 {new Date(Number(entry.date) * 1000).toLocaleDateString()} —{" "}
              {entry.weight.toString()} кг
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
