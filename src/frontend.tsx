/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import BlockBlastHelper from "./app/BlockBlastHelper";

function start() {
	const root = createRoot(document.getElementById("root")!);
	root.render(
		<React.StrictMode>
			<BlockBlastHelper />
		</React.StrictMode>,
	);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}
