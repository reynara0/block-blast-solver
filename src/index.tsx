import { serve } from "bun";
import index from "./index.html";

const server = serve({
	routes: {
		// Serve index.html for all unmatched routes.
		"/*": index,

		"/sw.ts": () => {
			return new Response(Bun.file("./src/lib/sw.ts"), {
				headers: { "Content-Type": "text/javascript" },
			});
		},

		// Serve public files from the public directory.
		"/public/*": (req) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				return new Response("Method Not Allowed", { status: 405 });
			}

			if (req.url.startsWith("/public/")) {
				if (req.url.includes("..")) {
					return new Response("Forbidden", { status: 403 });
				}
				if (!Bun.file(`./public${req.url.replace("/public", "")}`).exists()) {
					return new Response("Not Found", { status: 404 });
				}
			}

			const url = new URL(req.url);
			const path = url.pathname.replace("/public", "");
			return new Response(Bun.file(`./public${path}`));
		},
	},

	development: process.env.NODE_ENV !== "production" && {
		// Enable browser hot reloading in development
		hmr: true,

		// Echo console logs from the browser to the server
		console: true,
	},
});
