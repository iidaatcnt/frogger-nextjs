import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Frogger Game - Next.js版',
  description: 'クラシックなFroggerゲームのNext.js版。カエルを操作して道路や川を渡ろう！',
  keywords: 'Frogger, ゲーム, HTML5, Canvas, Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        background: '#000',
        color: '#0f0',
        fontFamily: '"Courier New", monospace',
        touchAction: 'none',
        overflow: 'auto'
      }}>
        <main style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '10px'
        }}>
          {children}
        </main>
      </body>
    </html>
  )
}
