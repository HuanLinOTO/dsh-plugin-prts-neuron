/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REPLACEMENT_LABEL, SOURCE_LABEL } from '../src/client/copy.ts'
import { adornRunningStatuses, installRunningStatusOverride } from '../src/client/running-status.ts'

const LABEL = '深度求索中，用时 3秒 ···'
const REWRITTEN_LABEL = '正在连接至PRTS神经元，用时 3秒 ···'

/** ui-chat's authored running-status markup, trimmed to the parts the override reads. */
function runningRowMarkup(label: string = LABEL): string {
  return `<div class="running" data-chat-running>
    <span class="visuallyHidden" role="status" aria-live="polite" aria-atomic="true">${SOURCE_LABEL}</span>
    <span class="runningDivider" aria-hidden="true"></span>
    <span class="runningContent">
      <span class="runningIcon" aria-hidden="true"><svg width="16" height="16"><path d="M0 0" /></svg></span>
      <span class="runningText">
        <span class="shimmerRoot" data-shimmer="true">
          <span class="shimmerContent"><span class="shimmerText">${label}</span></span>
          <span class="decoration" aria-hidden="true" inert>
            <span class="sweep"><span class="shimmerContent"><span class="shimmerText" data-shimmer-text="${label}"></span></span></span>
          </span>
        </span>
      </span>
    </span>
  </div>`
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('adornRunningStatuses', () => {
  it('replaces the whale icon with the animated image before the icon box', () => {
    document.body.innerHTML = runningRowMarkup()
    adornRunningStatuses()

    const image = document.querySelector('img[data-prts-icon]')
    const icon = document.querySelector('.runningIcon')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')?.startsWith('data:image/gif;base64,')).toBe(true)
    expect((image?.getAttribute('src') ?? '').length).toBeGreaterThan(1000)
    expect(image?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.previousElementSibling).toBe(image)
    expect(icon instanceof HTMLElement ? icon.style.display : undefined).toBe('none')
  })

  it('doubles the icon with a transform, leaving the row layout box alone', () => {
    document.body.innerHTML = runningRowMarkup()
    adornRunningStatuses()

    const image = document.querySelector('img[data-prts-icon]')
    expect(image instanceof HTMLElement ? image.style.width : undefined).toBe('16px')
    expect(image instanceof HTMLElement ? image.style.height : undefined).toBe('16px')
    expect(image?.getAttribute('style') ?? '').toContain('scale(2)')
  })

  it('rewrites the visible label, the screen-reader status, and the shimmer attribute', () => {
    document.body.innerHTML = runningRowMarkup()
    adornRunningStatuses()

    expect(document.querySelector('.shimmerText')?.textContent).toBe(REWRITTEN_LABEL)
    expect(document.querySelector('[role="status"]')?.textContent).toBe(REPLACEMENT_LABEL)
    expect(document.querySelector('[data-shimmer-text]')?.getAttribute('data-shimmer-text')).toBe(REWRITTEN_LABEL)
  })

  it('keeps the elapsed-time suffix and the whole label when no clock is running', () => {
    document.body.innerHTML = runningRowMarkup(SOURCE_LABEL)
    adornRunningStatuses()

    expect(document.querySelector('.shimmerText')?.textContent).toBe(REPLACEMENT_LABEL)
  })

  it('adorns a row once even when called repeatedly', () => {
    document.body.innerHTML = runningRowMarkup()
    adornRunningStatuses()
    adornRunningStatuses()

    expect(document.querySelectorAll('img[data-prts-icon]').length).toBe(1)
    expect(document.querySelectorAll('.shimmerText')[0]?.textContent).toBe(REWRITTEN_LABEL)
  })

  it('leaves markup outside a running row untouched', () => {
    document.body.innerHTML = `<div class="other">${LABEL}</div>` + runningRowMarkup()
    adornRunningStatuses()

    expect(document.querySelector('.other')?.textContent).toBe(LABEL)
    expect(document.querySelectorAll('img[data-prts-icon]').length).toBe(1)
  })

  it('restores the original icon when the image fails to load', () => {
    document.body.innerHTML = runningRowMarkup()
    adornRunningStatuses()

    const image = document.querySelector('img[data-prts-icon]')
    const icon = document.querySelector('.runningIcon')
    image?.dispatchEvent(new Event('error'))

    expect(document.querySelector('img[data-prts-icon]')).toBeNull()
    expect(icon instanceof HTMLElement ? icon.style.display : undefined).toBe('')
  })
})

describe('installRunningStatusOverride', () => {
  it('re-applies the label after React writes the original copy back', async () => {
    document.body.innerHTML = runningRowMarkup()
    disposers.push(installRunningStatusOverride())
    expect(document.querySelector('.shimmerText')?.textContent).toBe(REWRITTEN_LABEL)

    const text = document.querySelector('.shimmerText')
    if (text === null) throw new Error('fixture missing the label node')
    text.textContent = '深度求索中，用时 4秒 ···'

    await vi.waitFor(() => {
      expect(document.querySelector('.shimmerText')?.textContent).toBe('正在连接至PRTS神经元，用时 4秒 ···')
    })
  })

  it('adorns a row that mounts after installation', async () => {
    disposers.push(installRunningStatusOverride())
    document.body.insertAdjacentHTML('beforeend', runningRowMarkup())

    await vi.waitFor(() => {
      expect(document.querySelectorAll('img[data-prts-icon]').length).toBe(1)
    })
  })

  it('stops rewriting after disposal', async () => {
    document.body.innerHTML = runningRowMarkup()
    const dispose = installRunningStatusOverride()
    expect(document.querySelector('.shimmerText')?.textContent).toBe(REWRITTEN_LABEL)
    dispose()

    const text = document.querySelector('.shimmerText')
    if (text === null) throw new Error('fixture missing the label node')
    text.textContent = LABEL
    await new Promise((resolve) => { setTimeout(resolve, 0) })

    expect(document.querySelector('.shimmerText')?.textContent).toBe(LABEL)
  })
})
