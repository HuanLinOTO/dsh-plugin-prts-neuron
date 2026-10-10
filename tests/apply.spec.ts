/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest'
import * as client from '../src/client/index.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

it('installs the running-status override as an owned client effect', async () => {
  const effect = vi.fn(() => () => {})
  const ctx = { effect } as unknown as Parameters<typeof client.apply>[0]

  client.apply(ctx)

  expect(effect).toHaveBeenCalledTimes(1)
  expect(effect.mock.calls[0]?.[1]).toBe('prts-neuron: running status override')
  const install = effect.mock.calls[0]?.[0] as (() => () => void) | undefined
  expect(typeof install).toBe('function')
})
