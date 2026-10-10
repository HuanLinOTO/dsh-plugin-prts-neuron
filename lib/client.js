window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-prts-neuron", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;

//#region src/client/copy.ts
/**
* The copy and icon the running-status override applies, in one place.
*
* The values are build-time constants rather than plugin config: the client
* roster's boot rows carry no `config` field, so a browser half cannot read the
* Cordis row config (see README → Known Limitations).
*/
/** Copy the Chat running status shows; ui-chat's shipped Chinese label only. */
const SOURCE_LABEL = "深度求索中";
/** Copy that replaces {@link SOURCE_LABEL}, keeping the trailing "，用时 …" suffix. */
const REPLACEMENT_LABEL = "正在连接至PRTS神经元";
/** Animated icon that replaces the running status's whale-tail illustration. */
const ICON_URL = "https://i0.hdslb.com/bfs/new_dyn/a5a0a0adb386867b3f5db5713576f9f5107716290.gif";

//#endregion
//#region src/client/running-status.ts
/** Marker attribute on the injected image, so one row is adorned at most once. */
const ICON_ATTRIBUTE = "data-prts-icon";
/** Attribute ui-chat puts on the running-status row. */
const ROW_SELECTOR = "[data-chat-running]";
/** Attribute TextShimmer's decorative overlay takes its copy from. */
const SHIMMER_ATTRIBUTE = "data-shimmer-text";
/** Injected icon footprint: a 16px square that fits the row's 22px line box. */
const ICON_STYLE = "width:16px;height:16px;flex:none;object-fit:contain";
/**
* Replace the label inside one text value.
* @param value - a text node's value or a shimmer attribute value.
* @returns the value with every source label replaced, unchanged when it has none.
*/
function replaceLabel(value) {
	return value.includes(SOURCE_LABEL) ? value.replaceAll(SOURCE_LABEL, REPLACEMENT_LABEL) : value;
}
/**
* Put the animated icon in front of the row's own icon box and hide that box.
*
* The image is a sibling the row's renderer does not own: React patches the
* icon box and the label it created and leaves this node alone. A failed load
* (offline, hotlink protection) removes the image and unhides the original.
* @param row - one running-status row.
*/
function adornIcon(row) {
	if (row.querySelector(`img[${ICON_ATTRIBUTE}]`) !== null) return;
	const icon = row.querySelector("svg")?.parentElement ?? null;
	if (icon === null) return;
	const image = document.createElement("img");
	image.setAttribute(ICON_ATTRIBUTE, "");
	image.setAttribute("aria-hidden", "true");
	image.setAttribute("referrerpolicy", "no-referrer");
	image.alt = "";
	image.draggable = false;
	image.style.cssText = ICON_STYLE;
	image.src = ICON_URL;
	image.addEventListener("error", () => {
		image.remove();
		icon.style.removeProperty("display");
	}, { once: true });
	icon.style.setProperty("display", "none");
	icon.before(image);
}
/**
* Rewrite the row's label copy wherever it is rendered: the visible text node,
* the inert screen-reader status line, and TextShimmer's decorative overlay.
* @param row - one running-status row.
*/
function rewriteLabel(row) {
	const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		const value = node.nodeValue;
		if (value === null) continue;
		const next = replaceLabel(value);
		if (next !== value) node.nodeValue = next;
	}
	for (const element of row.querySelectorAll(`[${SHIMMER_ATTRIBUTE}]`)) {
		const value = element.getAttribute(SHIMMER_ATTRIBUTE);
		if (value === null) continue;
		const next = replaceLabel(value);
		if (next !== value) element.setAttribute(SHIMMER_ATTRIBUTE, next);
	}
}
/**
* Adorn every running-status row under a root, leaving other rows untouched.
* @param root - subtree to search; the whole document by default.
*/
function adornRunningStatuses(root = document) {
	for (const row of root.querySelectorAll(ROW_SELECTOR)) {
		adornIcon(row);
		rewriteLabel(row);
	}
}
/**
* Keep the running status rewritten for as long as the plugin is loaded.
* @returns disposer that stops observing; rewrites already applied remain.
*/
function installRunningStatusOverride() {
	adornRunningStatuses();
	const observer = new MutationObserver(() => {
		adornRunningStatuses();
	});
	observer.observe(document.documentElement, {
		subtree: true,
		childList: true,
		characterData: true,
		attributes: true,
		attributeFilter: [SHIMMER_ATTRIBUTE]
	});
	return () => {
		observer.disconnect();
	};
}

//#endregion
//#region src/client/index.ts
/**
* Browser plugin body.
* @param ctx - client root context.
*/
function apply(ctx) {
	ctx.effect(installRunningStatusOverride, "prts-neuron: running status override");
}

//#endregion
exports.apply = apply;
return module.exports; } });
//# sourceMappingURL=client.js.map