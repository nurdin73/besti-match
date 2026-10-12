import type { GameSummary } from '@/types/game.types'

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function renderResultCardToCanvas(summary: GameSummary, roomCode?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get Canvas 2D context')

  // 1. Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  bgGrad.addColorStop(0, '#FFF9F5')
  bgGrad.addColorStop(0.5, '#FFF2EA')
  bgGrad.addColorStop(1, '#FFE5D9')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 2. Decorative background blobs
  ctx.save()
  ctx.fillStyle = 'rgba(255, 107, 74, 0.08)'
  ctx.beginPath()
  ctx.arc(150, 180, 220, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(167, 139, 250, 0.08)'
  ctx.beginPath()
  ctx.arc(920, 400, 260, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(236, 72, 153, 0.07)'
  ctx.beginPath()
  ctx.arc(300, 1150, 280, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 3. Top Header Bar
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Header pill badge
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, 360, 60, 360, 48, 24)
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#EBD5C8'
  ctx.stroke()

  ctx.fillStyle = '#D9502F'
  ctx.font = 'bold 20px "Space Grotesk", sans-serif'
  ctx.fillText('BESTIE MATCH RESULT', 540, 84)

  // Logo Brand Title
  ctx.fillStyle = '#261C14'
  ctx.font = 'bold 58px "Fredoka", sans-serif'
  ctx.fillText('BestieMatch', 540, 155)

  // Players vs Header
  const p1 = summary.players[0]?.name || 'Player 1'
  const p2 = summary.players[1]?.name || 'Player 2'
  ctx.font = '600 36px "DM Sans", sans-serif'
  ctx.fillStyle = '#735751'
  ctx.fillText(`${p1}  💛  ${p2}`, 540, 225)

  // 4. Main White Card Container
  const cardX = 90
  const cardY = 275
  const cardW = 900
  const cardH = 820

  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, cardX, cardY, cardW, cardH, 44)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = '#F0E2D8'
  ctx.stroke()

  // 5. Circular Compatibility Gauge
  const meterCenterX = 540
  const meterCenterY = 510
  const meterRadius = 150
  const meterThickness = 28

  // Base circle
  ctx.lineWidth = meterThickness
  ctx.strokeStyle = '#F4EAE3'
  ctx.beginPath()
  ctx.arc(meterCenterX, meterCenterY, meterRadius, 0, Math.PI * 2)
  ctx.stroke()

  // Active progress arc
  const progressRatio = Math.max(0, Math.min(1, summary.compatibility / 100))
  if (progressRatio > 0) {
    const meterGrad = ctx.createLinearGradient(
      meterCenterX - meterRadius,
      meterCenterY,
      meterCenterX + meterRadius,
      meterCenterY + meterRadius,
    )
    meterGrad.addColorStop(0, '#FF6B4A')
    meterGrad.addColorStop(1, '#EC4899')

    ctx.strokeStyle = meterGrad
    ctx.lineCap = 'round'
    ctx.beginPath()
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + progressRatio * 2 * Math.PI
    ctx.arc(meterCenterX, meterCenterY, meterRadius, startAngle, endAngle)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  // Percentage in center
  ctx.fillStyle = '#1F1612'
  ctx.font = 'bold 80px "Fredoka", sans-serif'
  ctx.fillText(`${summary.compatibility}%`, meterCenterX, meterCenterY - 10)

  ctx.fillStyle = '#8C7A75'
  ctx.font = 'bold 22px "Space Grotesk", sans-serif'
  ctx.fillText('KECOCOKAN', meterCenterX, meterCenterY + 45)

  // Title badge
  ctx.fillStyle = '#261C14'
  ctx.font = 'bold 46px "Fredoka", sans-serif'
  ctx.fillText(summary.title, 540, 730)

  // Matches count
  ctx.fillStyle = '#735751'
  ctx.font = '500 28px "DM Sans", sans-serif'
  ctx.fillText(`${summary.matches} dari ${summary.totalRounds} jawaban cocok`, 540, 785)

  // 6. Player Breakdown Subcards
  const subCardY = 840
  const subCardW = 390
  const subCardH = 190
  const subCard1X = 135
  const subCard2X = 555

  // Subcard 1
  ctx.fillStyle = '#FFF8F4'
  roundRect(ctx, subCard1X, subCardY, subCardW, subCardH, 24)
  ctx.fill()
  ctx.strokeStyle = '#F4E2D8'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#D9502F'
  ctx.font = 'bold 22px "Space Grotesk", sans-serif'
  ctx.fillText(`TEBAKAN ${p1.toUpperCase()}`, subCard1X + subCardW / 2, subCardY + 42)

  const p1Data = summary.players[0]
  const p1Rate = p1Data && p1Data.guessAttempts > 0 ? `${p1Data.correctGuesses} / ${p1Data.guessAttempts}` : '0 / 0'
  ctx.fillStyle = '#261C14'
  ctx.font = 'bold 36px "Fredoka", sans-serif'
  ctx.fillText(`${p1Rate} Cocok`, subCard1X + subCardW / 2, subCardY + 95)

  ctx.fillStyle = '#8C7A75'
  ctx.font = '500 20px "DM Sans", sans-serif'
  ctx.fillText('mengetahui tentang pasangannya', subCard1X + subCardW / 2, subCardY + 140)

  // Subcard 2
  ctx.fillStyle = '#FDF6FF'
  roundRect(ctx, subCard2X, subCardY, subCardW, subCardH, 24)
  ctx.fill()
  ctx.strokeStyle = '#EAD8F7'
  ctx.stroke()

  ctx.fillStyle = '#8B5CF6'
  ctx.font = 'bold 22px "Space Grotesk", sans-serif'
  ctx.fillText(`TEBAKAN ${p2.toUpperCase()}`, subCard2X + subCardW / 2, subCardY + 42)

  const p2Data = summary.players[1]
  const p2Rate = p2Data && p2Data.guessAttempts > 0 ? `${p2Data.correctGuesses} / ${p2Data.guessAttempts}` : '0 / 0'
  ctx.fillStyle = '#261C14'
  ctx.font = 'bold 36px "Fredoka", sans-serif'
  ctx.fillText(`${p2Rate} Cocok`, subCard2X + subCardW / 2, subCardY + 95)

  ctx.fillStyle = '#8C7A75'
  ctx.font = '500 20px "DM Sans", sans-serif'
  ctx.fillText('mengetahui tentang pasangannya', subCard2X + subCardW / 2, subCardY + 140)

  // 7. Footer
  ctx.fillStyle = '#735751'
  ctx.font = '600 24px "Space Grotesk", sans-serif'
  const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())
  const footerText = roomCode ? `Room #${roomCode} · ${dateStr}` : dateStr
  ctx.fillText(footerText, 540, 1170)

  const siteHost = typeof window !== 'undefined' && window.location.host ? window.location.host : 'bestie-match'
  ctx.fillStyle = '#A8928B'
  ctx.font = '500 20px "DM Sans", sans-serif'
  ctx.fillText(`Mainkan di: ${siteHost}`, 540, 1220)

  return canvas
}

export function formatShareText(summary: GameSummary, shareUrl = ''): string {
  const p1 = summary.players[0]?.name || 'Player 1'
  const p2 = summary.players[1]?.name || 'Player 2'
  const lines = [
    `✨ Hasil Tes Kekompakan ${p1} & ${p2} di BestieMatch! ✨`,
    `Tingkat Kecocokan: ${summary.compatibility}% — ${summary.title}`,
    `Cocok di ${summary.matches} dari ${summary.totalRounds} pertanyaan.`,
  ]
  if (shareUrl) {
    lines.push('', `Coba cocokin seberapa kenal kamu sama bestie-mu di sini:`, shareUrl)
  }
  return lines.join('\n')
}

export async function copyShareTextToClipboard(summary: GameSummary, shareUrl = ''): Promise<boolean> {
  const text = formatShareText(summary, shareUrl)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback
    }
  }

  // Fallback using textarea execCommand
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }
  return false
}

export async function exportResultCardBlob(summary: GameSummary, roomCode?: string): Promise<Blob> {
  const canvas = renderResultCardToCanvas(summary, roomCode)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate image blob from canvas'))
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename = 'bestie-match-result.png'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function shareResultCard(
  blob: Blob,
  title = 'Hasil BestieMatch',
  text = 'Lihat seberapa cocok kita di BestieMatch!',
  url?: string,
): Promise<boolean> {
  const file = new File([blob], 'bestie-match-result.png', { type: 'image/png' })
  const shareData: ShareData = {
    title,
    text: url ? `${text}\n\nMainkan di: ${url}` : text,
    files: [file],
  }
  if (url) {
    shareData.url = url
  }

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData)
      return true
    } catch {
      return false
    }
  }
  return false
}
