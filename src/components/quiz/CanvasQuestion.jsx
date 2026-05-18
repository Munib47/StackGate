// =============================================================================
// CANVAS QUESTION  (anti-cheat question renderer)
// -----------------------------------------------------------------------------
// Draws the question text — and an optional code snippet — onto a <canvas>
// instead of putting it in the DOM as text. Because a canvas is a bitmap:
//   - the text cannot be selected or copied
//   - it is not in the accessibility tree / DOM, so it can't be scraped easily
//   - right-click "copy text" does nothing
// This is the core of the anti-cheat requirement: a question rendered here is
// painful to paste into an AI tool.
//
// PROPS:
//   question :: string        — the question text (required)
//   code     :: string | null — optional code snippet, shown in a mono block
//
// IMPLEMENTATION NOTES:
//   - Uses devicePixelRatio scaling so text is crisp on retina screens.
//   - Re-measures and re-draws whenever `question` or `code` changes, and on
//     container resize.
//   - canvas.width is reset on every draw, which also resets the transform
//     matrix — so the ctx.scale(dpr, dpr) call never compounds.
// =============================================================================
import { useRef, useEffect } from 'react'

const COLORS = {
  cardBg: '#18181b',   // zinc-900
  codeBg: '#09090b',   // zinc-950
  text: '#f4f4f5',     // zinc-100
  codeText: '#a1a1aa', // zinc-400
}

export default function CanvasQuestion({ question, code }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1

      // Fall back to 600px if the parent has no measurable width yet.
      const cssWidth = canvas.parentElement?.clientWidth || 600
      const padding = 24
      const maxTextWidth = cssWidth - padding * 2

      // ---- word-wrap helper -------------------------------------------------
      const wrap = (text, font) => {
        ctx.font = font
        const words = String(text).split(/\s+/)
        const lines = []
        let line = ''
        for (const w of words) {
          const test = line ? line + ' ' + w : w
          if (ctx.measureText(test).width > maxTextWidth && line) {
            lines.push(line)
            line = w
          } else {
            line = test
          }
        }
        if (line) lines.push(line)
        return lines.length ? lines : ['']
      }

      const questionFont = '600 20px ui-sans-serif, system-ui, -apple-system, sans-serif'
      const codeFont = '14px ui-monospace, Menlo, Consolas, monospace'
      const qLineHeight = 30
      const cLineHeight = 22

      const qLines = wrap(question || '', questionFont)

      // Code: respect explicit newlines, then wrap any over-long lines.
      let cLines = []
      if (code) {
        for (const raw of String(code).split('\n')) {
          cLines = cLines.concat(wrap(raw.length ? raw : ' ', codeFont))
        }
      }

      const codeBlockPad = code ? 16 : 0
      const gap = code ? 20 : 0
      const totalHeight =
        padding +
        qLines.length * qLineHeight +
        gap +
        (code ? codeBlockPad * 2 + cLines.length * cLineHeight : 0) +
        padding

      // ---- size the canvas (this also resets the transform matrix) ---------
      canvas.style.width = cssWidth + 'px'
      canvas.style.height = totalHeight + 'px'
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(totalHeight * dpr)
      ctx.scale(dpr, dpr)

      // ---- background ------------------------------------------------------
      ctx.fillStyle = COLORS.cardBg
      ctx.fillRect(0, 0, cssWidth, totalHeight)

      // ---- question text ---------------------------------------------------
      ctx.fillStyle = COLORS.text
      ctx.font = questionFont
      ctx.textBaseline = 'top'
      let y = padding
      for (const ln of qLines) {
        ctx.fillText(ln, padding, y)
        y += qLineHeight
      }

      // ---- code block (if any) --------------------------------------------
      if (code) {
        y += gap - codeBlockPad
        const blockTop = y
        const blockHeight = codeBlockPad * 2 + cLines.length * cLineHeight
        const x = padding
        const w = maxTextWidth
        const r = 8

        // rounded rectangle
        ctx.fillStyle = COLORS.codeBg
        ctx.beginPath()
        ctx.moveTo(x + r, blockTop)
        ctx.arcTo(x + w, blockTop, x + w, blockTop + blockHeight, r)
        ctx.arcTo(x + w, blockTop + blockHeight, x, blockTop + blockHeight, r)
        ctx.arcTo(x, blockTop + blockHeight, x, blockTop, r)
        ctx.arcTo(x, blockTop, x + w, blockTop, r)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = COLORS.codeText
        ctx.font = codeFont
        let cy = blockTop + codeBlockPad
        for (const ln of cLines) {
          ctx.fillText(ln, padding + 14, cy)
          cy += cLineHeight
        }
      }
    }

    draw()

    // Redraw on container resize so the wrap stays correct.
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [question, code])

  return (
    <canvas
      ref={canvasRef}
      onContextMenu={(e) => e.preventDefault()}
      className="block w-full rounded-xl border border-zinc-800"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    />
  )
}