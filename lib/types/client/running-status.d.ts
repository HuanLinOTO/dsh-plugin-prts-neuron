/**
 * Adorn every running-status row under a root, leaving other rows untouched.
 * @param root - subtree to search; the whole document by default.
 */
export declare function adornRunningStatuses(root?: ParentNode): void;
/**
 * Keep the running status rewritten for as long as the plugin is loaded.
 * @returns disposer that stops observing; rewrites already applied remain.
 */
export declare function installRunningStatusOverride(): () => void;
