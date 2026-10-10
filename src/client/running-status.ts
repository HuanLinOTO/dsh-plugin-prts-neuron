/**
 * Rewrite the Chat running-status row in place.
 *
 * ui-chat renders the row as `[data-chat-running]` with a whale-tail icon and a
 * TextShimmer label, and re-renders it on every clock tick (default once per
 * second). The override therefore works as a mutation-driven post-pass: it
 * swaps the icon once per row and re-applies the copy whenever React writes the
 * label back. Both writes are idempotent, so the observer settles after each
 * render instead of looping.
 *
 * The row's DOM contract used here is ui-chat's authored markup: the
 * `data-chat-running` attribute, the label's `data-shimmer-text` attribute
 * (TextShimmer's decorative overlay reads its copy from it), and the whale SVG
 * whose parent is the icon box. Class names are CSS-module hashes and are
 * deliberately not matched.
 *
 * @module @huanlin/dsh-plugin-prts-neuron/client
 */
import { ICON_URL, REPLACEMENT_LABEL, SOURCE_LABEL } from './copy.ts'

/** Marker attribute on the injected image, so one row is adorned at most once. */
const ICON_ATTRIBUTE = 'data-prts-icon'

/** Attribute ui-chat puts on the running-status row. */
const ROW_SELECTOR = '[data-chat-running]'

/** Attribute TextShimmer's decorative overlay takes its copy from. */
const SHIMMER_ATTRIBUTE = 'data-shimmer-text'

/**
 * Injected icon footprint. The 16px box is what the row lays out, so the row's
 * 22px line box and its spacing stay as ui-chat authored them; the visible
 * doubling is a transform, which repaints larger without reflowing anything.
 * Transform scaling also resamples the 1000px animation at paint time, so the
 * doubled icon is sharper than a 32px layout box would be.
 */
const ICON_STYLE =
  'width:16px;height:16px;flex:none;object-fit:contain;transform:scale(2);transform-origin:center'

/**
 * Replace the label inside one text value.
 * @param value - a text node's value or a shimmer attribute value.
 * @returns the value with every source label replaced, unchanged when it has none.
 */
function replaceLabel(value: string): string {
  return value.includes(SOURCE_LABEL) ? value.replaceAll(SOURCE_LABEL, REPLACEMENT_LABEL) : value
}

/**
 * Put the animated icon in front of the row's own icon box and hide that box.
 *
 * The image is a sibling the row's renderer does not own: React patches the
 * icon box and the label it created and leaves this node alone. A failed load
 * (offline, hotlink protection) removes the image and unhides the original.
 * @param row - one running-status row.
 */
function adornIcon(row: Element): void {
  if (row.querySelector(`img[${ICON_ATTRIBUTE}]`) !== null) return
  const icon = row.querySelector('svg')?.parentElement ?? null
  if (icon === null) return
  const image = document.createElement('img')
  image.setAttribute(ICON_ATTRIBUTE, '')
  image.setAttribute('aria-hidden', 'true')
  // Bilibili serves these animations to page referrers only.
  image.setAttribute('referrerpolicy', 'no-referrer')
  image.alt = ''
  image.draggable = false
  image.style.cssText = ICON_STYLE
  image.src = ICON_URL
  image.addEventListener('error', () => {
    image.remove()
    icon.style.removeProperty('display')
  }, { once: true })
  icon.style.setProperty('display', 'none')
  icon.before(image)
}

/**
 * Rewrite the row's label copy wherever it is rendered: the visible text node,
 * the inert screen-reader status line, and TextShimmer's decorative overlay.
 * @param row - one running-status row.
 */
function rewriteLabel(row: Element): void {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const value = node.nodeValue
    if (value === null) continue
    const next = replaceLabel(value)
    if (next !== value) node.nodeValue = next
  }
  for (const element of row.querySelectorAll(`[${SHIMMER_ATTRIBUTE}]`)) {
    const value = element.getAttribute(SHIMMER_ATTRIBUTE)
    if (value === null) continue
    const next = replaceLabel(value)
    if (next !== value) element.setAttribute(SHIMMER_ATTRIBUTE, next)
  }
}

/**
 * Adorn every running-status row under a root, leaving other rows untouched.
 * @param root - subtree to search; the whole document by default.
 */
export function adornRunningStatuses(root: ParentNode = document): void {
  for (const row of root.querySelectorAll(ROW_SELECTOR)) {
    adornIcon(row)
    rewriteLabel(row)
  }
}

/**
 * Keep the running status rewritten for as long as the plugin is loaded.
 * @returns disposer that stops observing; rewrites already applied remain.
 */
export function installRunningStatusOverride(): () => void {
  adornRunningStatuses()
  const observer = new MutationObserver(() => { adornRunningStatuses() })
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [SHIMMER_ATTRIBUTE],
  })
  return () => { observer.disconnect() }
}
