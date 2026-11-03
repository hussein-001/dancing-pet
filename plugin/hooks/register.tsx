import type { Register, Timer } from 'claude-code'

import { HEIGHT, KEYS, STICKERS, WIDTH } from './stickers'
import type { Sticker } from './stickers'

const COLUMNS = WIDTH
const ROWS = HEIGHT / 2
const DEFAULT = 0x01000000
const UPPER = 0x2580 // ▀ top pixel in fg, bottom in bg
const LOWER = 0x2584 // ▄ bottom pixel in fg
const NAMES = Object.keys(STICKERS)

const plain = (text: string) =>
  text.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase()

const BY_PLAIN = new Map(NAMES.map(name => [plain(name), name]))
const FALLBACK: Sticker = { d: 90, p: [], f: [[]] }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

// The spinner word's own sticker; any other word gets a stable stand-in.
function stickerFor(spinnerWord: string | null): Sticker {
  const key = plain(spinnerWord ?? '')
  let name = BY_PLAIN.get(key)
  if (name === undefined) {
    let hash = 0
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    name = NAMES[hash % NAMES.length]
  }
  return (name !== undefined && STICKERS[name]) || FALLBACK
}

// Two pixel rows per terminal row, drawn as half blocks.
function cells(sticker: Sticker, frame: number): string {
  const pixels = (sticker.f[frame % sticker.f.length] ?? []).join('')
  const color = (i: number): number | null => {
    const k = KEYS.indexOf(pixels.charAt(i))
    return k <= 0 ? null : (sticker.p[k - 1] ?? null)
  }
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const top = color(row * 2 * COLUMNS + col)
      const bottom = color((row * 2 + 1) * COLUMNS + col)
      const at = (row * COLUMNS + col) * 3
      if (top !== null) {
        words.set([UPPER, top, bottom ?? DEFAULT], at)
      } else if (bottom !== null) {
        words.set([LOWER, bottom, DEFAULT], at)
      } else {
        words.set([0x20, DEFAULT, DEFAULT], at)
      }
    }
  }
  return base64(new Uint8Array(words.buffer))
}

const ON_WORDS = new Set(['on', 'show', 'enable'])
const OFF_WORDS = new Set(['off', 'hide', 'disable'])

export const register: Register = on => {
  // On or off, kept in $.store so the choice outlives the session.
  let isEnabled = true
  let bandId: string | null = null
  // Render hooks are pure, so the spinner's word is kept here, not in $.state.
  let word: string | null = null
  let drawnWord: string | null = null
  let frame = 0
  let timer: Timer | null = null

  const stop = () => {
    timer?.cancel()
    timer = null
  }

  on('session.start', async ($, e, next) => {
    isEnabled = (await $.store.get('enabled')) !== false
    await $.command.register({
      name: 'pet',
      description: 'Turn the dancing pet on or off',
      argumentHint: '[on|off]',
      immediate: true,
    })
    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== '' && !ON_WORDS.has(arg) && !OFF_WORDS.has(arg)) {
      return { text: 'Usage: /pet [on|off]. With no argument, /pet switches the pet on or off.' }
    }
    isEnabled = arg === '' ? !isEnabled : ON_WORDS.has(arg)
    await $.store.set('enabled', isEnabled)
    $.ui.invalidate('ui.render')
    return {
      text: isEnabled
        ? 'Dancing pet on: it dances above the prompt while Claude works.'
        : 'Dancing pet off. Run /pet to bring it back.',
    }
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined && timer === null) {
      frame = 0
      timer = $.clock.every(stickerFor(word).d, () => {
        if (bandId === null || !isEnabled) return
        // The label is text, not cells: redraw the band when the word changed.
        if (word !== drawnWord) $.ui.invalidate('ui.render')
        frame += 1
        void $.ui.blit({ requestId: bandId, key: 'pet', cells: cells(stickerFor(word), frame) })
      })
    }
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) stop()
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    word = e.props.word
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (!isEnabled || e.surface !== 'terminal' || !e.props.isWorking || e.props.hasSurvey) {
      bandId = null
      return next(e)
    }
    bandId = e.requestId
    drawnWord = word
    const { Box, Raster, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" width={COLUMNS}>
        <Raster key="pet" columns={COLUMNS} rows={ROWS} cells={cells(stickerFor(word), frame)} />
        <Box justifyContent="center">
          <Text color="#D97757" bold>
            {word ?? 'Working'} ...
          </Text>
        </Box>
      </Box>
    )
  })
}
