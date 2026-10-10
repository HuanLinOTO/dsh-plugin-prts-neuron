/**
 * prts-neuron — browser half.
 *
 * One registration: the running-status override (`installRunningStatusOverride`),
 * installed as an owned effect so unloading the plugin disconnects the observer.
 *
 * @module @huanlin/dsh-plugin-prts-neuron/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Browser plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
