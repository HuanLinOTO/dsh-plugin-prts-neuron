/**
 * prts-neuron — host half.
 *
 * The plugin has no host-side behavior: its `cordis.patch.yml` row exists so
 * that the client roster scanner sees a Loader entry whose package declares
 * `dsh.client`, and boots the browser half from it.
 *
 * @module @huanlin/dsh-plugin-prts-neuron
 */
import type { Context } from '@deepseek-ai/cordis'

/** Loader row name; the browser half composes under the same id. */
export const name = 'prts-neuron'

/**
 * Host plugin body.
 * @param _ctx - host context; unused because all work happens in the browser half.
 */
export function apply(_ctx: Context): void {}
