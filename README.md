# Fitness Diary → Barcelona Guide (Farcaster MiniApp + Web DApp)

Этот проект начинался как **Fitness Diary** (дневник веса/калорий/шагов) для Farcaster MiniApps.  
Теперь он расширяется до **Barcelona Guide**: путеводитель по интересным местам Барселоны с возможностью ставить оценки (1–5), подписанные кошельком.

---

## Структура проекта

- `/pages/frame.tsx`  
  Farcaster MiniApp. Работает через `@farcaster/miniapp-sdk` и `sdk.wallet.ethProvider`.  
  - Изначально — дневник здоровья.  
  - В новой версии — список мест + карточки + рейтинг.

- `/pages/web.tsx`  
  Web-версия с **WalletConnect**.  
  Можно открывать как обычный DApp, не мешая работе Farcaster-версии.

- `/lib/viem.ts`  
  Конфиг viem-провайдера (Alchemy API key через `NEXT_PUBLIC_ALCHEMY_API_KEY`).

- `/data/places.ts` (новый файл)  
  Статический список достопримечательностей Барселоны.

- `/contracts/BarcelonaRatings.sol`  
  Новый контракт для хранения оценок:
  - Подпись EIP-712 (`submitRating`)
  - Сумма/количество оценок по каждому месту
  - Хранение индивидуальных оценок пользователя

---

## Особенности

- 🔄 **Совместимость** — MiniApp сохраняет старый дневник.  
- 🌐 **Web DApp** работает через WalletConnect.  
- ✍️ **Подписанные оценки** — EIP-712, без приватных ключей на фронте.  
- 📊 **Агрегация**: контракт хранит сумму/количество, среднее вычисляется на фронте.  
- 🎯 Локальный "Новый старт" (сброс отображения с даты X).  
- 🔤 Двуязычность (RU/EN).  
- 💡 Минималистичный дизайн с Tailwind + Recharts.

---

## Технические детали и исправления

### Ошибки и фиксы
- `getDates Out of bounds` → реализована `safeGetDates()` с циклом и уменьшением `count`.  
- Ошибка `setInterval` (TS типы) → `pollRef: useRef<number | null>(null)`.  
- ENV Alchemy API → `NEXT_PUBLIC_ALCHEMY_API_KEY` используется в Vercel.  
- Мобильная вёрстка: исправлено через `flex-wrap`, `w-full sm:w-auto`.  
- Локальный сброс «Новый старт»: используется ключ `newStartDate` в `localStorage`.

### Архитектура
- **frame.tsx**: MiniApp (Farcaster SDK) → контракт **FitnessDiary**.  
- **web.tsx**: Web DApp (WalletConnect) → контракт **BarcelonaRatings**.  

### Контракт `BarcelonaRatings.sol`
- `submitRating(rater, placeId, rating, deadline, signature)`  
- Проверка подписи (EIP-712).  
- `nonce` + `deadline` защищают от повторов.  
- Аггрегация: `sum` и `count` для быстрого среднего.  
- Событие: `Rated(user, placeId, rating, nonce)`.

### Пример фронтенда
```ts
const domain = {
  name: "BarcelonaRatings",
  version: "1",
  chainId: 8453,
  verifyingContract: process.env.NEXT_PUBLIC_RATINGS_CONTRACT as `0x${string}`,
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

const value = { rater, placeId, rating, nonce, deadline }

const signature = await client.signTypedData({
  domain, types, primaryType: "Rating", message: value
})

await walletClient.writeContract({
  abi,
  address: domain.verifyingContract,
  functionName: "submitRating",
  args: [rater, placeId, rating, deadline, signature],
})
```

---

## ENV переменные

- `NEXT_PUBLIC_ALCHEMY_API_KEY` — ключ для Alchemy.  
- `NEXT_PUBLIC_CONTRACT_ADDRESS` — адрес старого дневника.  
- `NEXT_PUBLIC_RATINGS_CONTRACT` — адрес нового контракта рейтингов.  
- `NEXT_PUBLIC_CHAIN_ID` — ID сети (например, `8453` для Base).  
- `NEXT_PUBLIC_WC_PROJECT_ID` — проект ID для WalletConnect.

---

## Как открыть

- **Farcaster MiniApp**: через Warpcast → `/frame`  
- **Web DApp**: `https://<deploy-url>/web`

---

## Roadmap

- [x] Исправление ошибок с `Out of bounds` в `getDates`.  
- [x] Исправление таймера `setInterval`.  
- [x] Экспорт CSV.  
- [x] Мобильная вёрстка (`flex-wrap`, `w-full sm:w-auto`).  
- [x] Добавлен «Новый старт».  
- [ ] Подключение `/web` с WalletConnect.  
- [ ] Деплой нового контракта **BarcelonaRatings.sol**.  
- [ ] Каталог мест Барселоны.  
