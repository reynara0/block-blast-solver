import { Theme } from "../types";

export function ensurePWA(theme: Theme) {
	if (!document.querySelector('link[rel="manifest"]')) {
		const link = document.createElement("link");
		link.rel = "manifest";
		link.href = "/public/manifest.webmanifest";
		document.head.appendChild(link);
	}
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.getRegistrations().then((rs) => {
			if (rs.length === 0) navigator.serviceWorker.register("./sw.ts");
		});
	}
	// allow theme color sync
	let meta = document.querySelector(
		'meta[name="theme-color"]',
	) as HTMLMetaElement | null;
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.appendChild(meta);
	}
	meta.content = theme.accentColor;
}
