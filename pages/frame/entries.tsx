// pages/frame/entries.tsx
import dynamic from "next/dynamic"
import { WagmiProvider } from "wagmi"
import { wagmiServerConfig } from "../../lib/wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const Entries = dynamic(() => import("../entries"), { ssr: false })

const queryClient = new QueryClient()

export default function FrameEntries() {
  // Локально даём WagmiProvider + QueryClient только для этой страницы,
  // чтобы удовлетворить useAccount, но без RainbowKit / внешних кошельков.
  return (
    <WagmiProvider config={wagmiServerConfig}>
      <QueryClientProvider client={queryClient}>
        <Entries />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
