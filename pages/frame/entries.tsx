// pages/frame/entries.tsx
import dynamic from "next/dynamic"

const Entries = dynamic(() => import("../entries"), { ssr: false })
export default Entries
