// pages/api/frame-action.tsx
/* eslint-disable react/jsx-key */
import React from "react"
import { createFrames, Button } from "frames.js/next"
import { places } from "../../data/places"

const APP_HOME = "https://barcelona-guide-eight.vercel.app/frame"

const frames = createFrames({
  basePath: "/api/frame-action",
})

export default frames(async (ctx: any) => {
  const action = ctx.searchParams?.action ?? ""
  const placeId = Number(ctx.searchParams?.placeId ?? 0)

  if (action === "place" && Number.isFinite(placeId)) {
    const p = places.find(pl => pl.id === placeId)
    if (!p) {
      return {
        image: <div style={{ fontSize: 28, padding: 40 }}>❌ Place not found</div>,
        buttons: [<Button action="post" target="/api/frame-action">⬅ Back</Button>],
      }
    }
    return {
      image: (
        <div style={{ fontSize: 28, padding: 40 }}>
          <div style={{ fontWeight: 700 }}>{p.title}</div>
          <div style={{ marginTop: 8 }}>{p.short}</div>
          <div style={{ marginTop: 16 }}>⭐ Открой мини-доп, чтобы поставить оценку</div>
        </div>
      ),
      buttons: [
        <Button action="link" target={`${APP_HOME}/${p.id}`}>🔗 Open mini app</Button>,
        <Button action="post" target="/api/frame-action">⬅ Back</Button>,
      ],
    }
  }

  // Главный кадр: подборка мест и кнопка в мини-доп
  const top3 = places.slice(0, 3)
  return {
    image: (
      <div style={{ fontSize: 28, padding: 40 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Barcelona Guide</div>
        {top3.map((p) => (
          <div key={p.id}>• {p.title}</div>
        ))}
        <div style={{ marginTop: 16 }}>Открой мини-доп, чтобы голосовать ⭐</div>
      </div>
    ),
    buttons: [
      ...top3.map((p) => (
        <Button action="post" target={`/api/frame-action?action=place&placeId=${p.id}`}>
          {p.title}
        </Button>
      )),
      <Button action="link" target={APP_HOME}>🟢 Open mini app</Button>,
    ],
  }
})
