import React, { useEffect, useMemo, useRef, useState } from "react";
import BoardView from "../components/Board";
import Hands from "../components/Hands";
import Palette from "../components/Palette";
import ThemeModal from "../components/ThemeModal";
import {
	Board,
	DEFAULT_THEME,
	Hand,
	Preview,
	Theme,
	Algorithm,
	AlgoConfig,
	DEFAULT_ALGO_CONFIG,
	N,
} from "../types";
import { emptyBoard, place, findBestByAlgorithm } from "../lib/board";
import { ensurePWA } from "../lib/pwa";
import {
	loadBoard,
	saveBoard,
	loadHands,
	saveHands,
	loadSpeed,
	saveSpeed,
	loadTheme,
	saveTheme,
	loadAlgo,
	saveAlgo,
	loadAlgoCfg,
	saveAlgoCfg,
} from "../lib/storage";
import { buildGroupedShapes } from "../lib/shapes";

export default function BlockBlastHelper() {
	const [theme, setTheme] = useState<Theme>(() => loadTheme(DEFAULT_THEME));
	const [stepMs, setStepMs] = useState<number>(() => loadSpeed(3000));
	const [algo, setAlgo] = useState<Algorithm>(() => loadAlgo("hybrid"));
	const [algoCfg, setAlgoCfg] = useState<AlgoConfig>(() =>
		loadAlgoCfg(DEFAULT_ALGO_CONFIG),
	);

	const [board, setBoard] = useState<Board>(() => loadBoard(N, emptyBoard()));
	const [selected, setSelected] = useState<Array<Hand | null>>([
		null,
		null,
		null,
	]);
	const [preview, setPreview] = useState<Preview | null>(null);
	const [activeStep, setActiveStep] = useState(0);

	useEffect(() => {
		ensurePWA(theme);
		saveTheme(theme);
	}, [theme]);
	useEffect(() => saveSpeed(stepMs), [stepMs]);
	useEffect(() => saveAlgo(algo), [algo]);
	useEffect(() => saveAlgoCfg(algoCfg), [algoCfg]);
	useEffect(() => saveBoard(board), [board]);
	useEffect(() => {
		const ids = selected.map((h) => (h ? { id: h.id } : null));
		saveHands(ids);
	}, [selected]);

	// rebuild hands from saved ids once
	useEffect(() => {
		const saved = loadHands();
		if (!saved) return;
		import("../lib/shapes").then(({ buildGroupedShapes }) => {
			const GROUPED = buildGroupedShapes();
			const findById = (id: string) => {
				for (const arr of Object.values(GROUPED)) {
					const hit = arr.find((s) => s.id === id);
					if (hit) return hit;
				}
				return null;
			};
			setSelected(
				[0, 1, 2].map((i) => {
					const ref = saved[i];
					if (!ref) return null;
					const s = findById(ref.id);
					if (!s) return null;
					const color = [theme.hand1Color, theme.hand2Color, theme.hand3Color][
						i
					];
					return { id: s.id, shape: s.cells, color, idx: i };
				}),
			);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// recompute preview on changes
	useEffect(() => {
		const hands = selected.filter(Boolean) as Hand[];
		if (!hands.length) {
			setPreview(null);
			return;
		}
		setPreview(findBestByAlgorithm(board, hands, algo, algoCfg));
	}, [board, selected, algo, algoCfg]);

	// loop preview
	const GAP_MS = 300;
	const timer = useRef<number | null>(null);
	useEffect(() => {
		if (!preview?.steps.length) return;
		if (timer.current) {
			window.clearInterval(timer.current);
			timer.current = null;
		}
		setActiveStep(0);
		const len = preview.steps.length;
		timer.current = window.setInterval(
			() => setActiveStep((i) => (i + 1) % len),
			stepMs + GAP_MS,
		);
		return () => {
			if (timer.current) window.clearInterval(timer.current);
		};
	}, [preview, stepMs]);

	const setBoardCell = (x: number, y: number, v: 0 | 1 | "toggle") => {
		setBoard((prev) => {
			const next = prev.map((r) => r.slice());
			next[y][x] = (v === "toggle" ? (next[y][x] ? 0 : 1) : v) as 0 | 1;
			return next;
		});
	};
	const resetBoard = () => setBoard(emptyBoard());
	const applyBestNow = () => {
		if (!preview?.steps.length) return;
		setBoard((prev) => {
			let b = prev;
			for (const step of preview.steps)
				b = place(b, step.hand.shape, step.ox, step.oy).board;
			return b;
		});
		setSelected([null, null, null]);
		setPreview(null);
	};
	const setHand = (slotIdx: number, s: { id: string; cells: number[][] }) => {
		const color = [theme.hand1Color, theme.hand2Color, theme.hand3Color][
			slotIdx
		];
		const hand: Hand = { id: s.id, shape: s.cells as any, color, idx: slotIdx };
		setSelected((prev) => {
			const n = prev.slice();
			n[slotIdx] = hand;
			return n;
		});
	};
	const clearHand = (slotIdx: number) =>
		setSelected((prev) => {
			const n = prev.slice();
			n[slotIdx] = null;
			return n;
		});

		// shapes flat list (for autoplay)
	const allShapes = useMemo(() => {
		const g = buildGroupedShapes();
		return Object.values(g).flat();
	}, []);

	// ===== Autoplay =====
	const [autoplay, setAutoplay] = useState(false);
	const autoplayTimer = useRef<number | null>(null);

	function pickRandomHandsSet(): Array<Hand> {
		// pick 3 unique random shapes, color-coded by slot
		const picks: number[] = [];
		while (picks.length < 3) {
			const idx = Math.floor(Math.random() * allShapes.length);
			if (!picks.includes(idx)) picks.push(idx);
		}
		return picks.map((i, slot) => {
			const s = allShapes[i];
			const color = [theme.hand1Color, theme.hand2Color, theme.hand3Color][slot];
			return { id: s.id, shape: s.cells, color, idx: slot };
		});
	}

	function scheduleNextAutoplayCycle() {
		if (!autoplay) return;

		let candidate = pickRandomHandsSet();

		// Set the chosen hands (triggers preview)
		setSelected([candidate[0], candidate[1], candidate[2]]);

		// Wait for 3 steps worth of animation + buffer, then apply and recurse
		const waitMs = stepMs * 3 + 600;
		if (autoplayTimer.current) { window.clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
		autoplayTimer.current = window.setTimeout(() => {
			if (!autoplay) return;
			// recompute preview to be safe (board may not have changed during wait)
			const confirmPreview = findBestByAlgorithm(board, candidate!, algo, algoCfg);
			// If still valid, apply; else just stop gracefully
			if (confirmPreview.steps.length === 3) {
				setBoard(prev => {
					let b = prev;
					for (const step of confirmPreview.steps) b = place(b, step.hand.shape, step.ox, step.oy).board;
					return b;
				});
			} else {
				stopAutoplay();
				return;
			}
			setSelected([null, null, null]);
			// queue next round
			scheduleNextAutoplayCycle();
		}, waitMs);
	}

	function startAutoplay() {
		if (autoplay) return;
		setAutoplay(true);
	}
	function stopAutoplay() {
		setAutoplay(false);
		if (autoplayTimer.current) { window.clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
	}
	// Kick cycles when autoplay flips on
	useEffect(() => {
		if (autoplay) scheduleNextAutoplayCycle();
		return () => {
			if (autoplayTimer.current) { window.clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoplay, board, algo, algoCfg, stepMs, theme.hand1Color, theme.hand2Color, theme.hand3Color]);

	// layout
	const shell: React.CSSProperties = {
		minHeight: "100vh",
		width: "100%",
		maxWidth: "100vw",
		overflowX: "hidden",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		color: "#e5e7eb",
		background: "linear-gradient(135deg, #0f172a, #020617 60%, #000)",
		padding: 12,
	};
	const glass = (padding = 12): React.CSSProperties => ({
		width: "100%",
		maxWidth: "min(520px, 100vw - 24px)",
		borderRadius: 24,
		border: "1px solid rgba(255,255,255,0.10)",
		background: `rgba(255,255,255,${theme.glass})`,
		boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
		backdropFilter: "blur(10px)",
		padding,
	});
	const button: React.CSSProperties = {
		padding: "8px 12px",
		borderRadius: 12,
		background: "rgba(255,255,255,0.10)",
		fontSize: 12,
		border: "1px solid rgba(255,255,255,0.12)",
		color: "#e5e7eb",
		cursor: "pointer",
		userSelect: "none",
	};
	const selectStyle: React.CSSProperties = {
		...button,
		background: "rgba(0,0,0,0.25)",
	};

	// theme modal & install
	const [showTheme, setShowTheme] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [canInstall, setCanInstall] = useState(false);
	useEffect(() => {
		const handler = (e: any) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setCanInstall(true);
		};
		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);
	const handleInstall = () => {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		deferredPrompt.userChoice.finally(() => {
			setDeferredPrompt(null);
			setCanInstall(false);
		});
	};

	const handsCount = (selected.filter(Boolean) as Hand[]).length;
	const noMoves = handsCount > 0 && (!preview || preview.steps.length < handsCount);

	return (
		<div style={shell}>

			{/* Top bar with Algorithm select */}
			<div
				style={{
					...glass(12),
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					position: "sticky",
					top: 0,
					zIndex: 20,
				}}
			>
				<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
					<div style={{ fontSize: 18, fontWeight: 600 }}>
						Block Blast Helper
					</div>
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					{canInstall && (
						<button
							style={{ ...button, borderColor: theme.accentColor }}
							onClick={handleInstall}
						>
							Install App
						</button>
					)}
					<button
						onClick={applyBestNow}
						style={{ ...button, borderColor: theme.accentColor }}
					>
						Continue
					</button>
				</div>
			</div>

			{/* Actions */}
			<div
				style={{
					...glass(8),
					marginTop: 12,
					display: "flex",
					gap: 8,
					flexWrap: "wrap",
					justifyContent: "left",
				}}
			>
				<div
					style={{ width: "100%", display: "flex", gap: 8, marginBottom: 10 }}
				>
					<button onClick={() => setBoard(emptyBoard())} style={button}>
						Reset
					</button>
					<button
						onClick={() => setStepMs((s) => Math.min(6000, s + 400))}
						style={button}
					>
						Slower
					</button>
					<button
						onClick={() => setStepMs((s) => Math.max(800, s - 400))}
						style={button}
					>
						Faster
					</button>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "6px 8px",
						}}
					>
						<span style={{ fontSize: 12, opacity: 0.8 }}>Anim speed:</span>
						<strong style={{ color: theme.accentColor }}>
							{Math.round(stepMs / 100) / 10}s/step
						</strong>
					</div>
				</div>

				<button onClick={() => setShowTheme(true)} style={button}>
					Customize Theme
				</button>

				<select
					value={algo}
					onChange={(e) => setAlgo(e.target.value as Algorithm)}
					style={selectStyle}
					title="Algorithm"
				>
					<option value="max_clearance">Max Clearance</option>
					<option value="max_positional">Max Positional</option>
					<option value="hybrid">Hybrid (50/50)</option>
				</select>

				{!autoplay ? (
					<button onClick={startAutoplay} style={{ ...button, borderColor: theme.accentColor }}>Autoplay</button>
				) : (
					<button onClick={stopAutoplay} style={{ ...button, borderColor: theme.accentColor, background: "rgba(239,68,68,0.25)" }}>Stop</button>
				)}

				<div style={{ width: "100%", display: "flex", gap: 8 }}>
					<div
						style={{
							...glass(10),
							borderRadius: 10,
							marginTop: 12,
							display: "grid",
							gap: 10,
						}}
					>
						{/* Search cap for DFS-based modes */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "140px 1fr auto",
								gap: 8,
								alignItems: "center",
							}}
						>
							<div style={{ fontSize: 12, opacity: 0.8 }}>
								Search cap (nodes)
							</div>
							<input
								type="range"
								min={5000}
								max={200000}
								step={5000}
								value={algoCfg.maxNodes}
								onChange={(e) =>
									setAlgoCfg((c) => ({
										...c,
										maxNodes: parseInt(e.target.value, 10),
									}))
								}
							/>
							<div style={{ fontSize: 12, color: theme.accentColor }}>
								{algoCfg.maxNodes.toLocaleString()}
							</div>
						</div>

						{/* Hybrid weights */}
						{algo === "hybrid" && (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "140px 1fr auto",
									gap: 8,
									alignItems: "center",
								}}
							>
								<div style={{ fontSize: 12, opacity: 0.8 }}>
									Hybrid weight (Clearance)
								</div>
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									value={Math.round(algoCfg.hybridWeights.clearance * 100)}
									onChange={(e) => {
										const c = parseInt(e.target.value, 10) / 100;
										setAlgoCfg((cfg) => ({
											...cfg,
											hybridWeights: { clearance: c, positional: 1 - c },
										}));
									}}
								/>
								<div style={{ fontSize: 12, color: theme.accentColor }}>
									{Math.round(algoCfg.hybridWeights.clearance * 100)} /{" "}
									{Math.round(algoCfg.hybridWeights.positional * 100)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Board */}
			<div style={{ ...glass(16), marginTop: 16 }}>
				{noMoves && (
					<div style={{
						marginBottom: 12,
						padding: "8px 12px",
						borderRadius: 10,
						border: "1px solid rgba(239,68,68,0.4)",
						background: "rgba(239,68,68,0.15)",
						color: "#fecaca",
						fontSize: 12,
						textAlign: "center"
					}}>
						No possible moves with the current hands.
					</div>
				)}
				<BoardView
					board={board}
					setBoardCell={(x, y, mode) => setBoardCell(x, y, mode)}
					preview={preview && preview.steps.length === handsCount ? preview : null}
					activeStep={activeStep}
					stepMs={stepMs}
					theme={theme}
				/>
			</div>

			<Hands
				selected={selected}
				clearHand={(i) =>
					setSelected((p) => {
						const n = p.slice();
						n[i] = null;
						return n;
					})
				}
				theme={theme}
			/>
			<Palette
				selected={selected}
				setHand={(i, s) => {
					const color = [theme.hand1Color, theme.hand2Color, theme.hand3Color][
						i
					];
					const hand: Hand = { id: s.id, shape: s.cells, color, idx: i };
					setSelected((prev) => {
						const n = prev.slice();
						n[i] = hand;
						return n;
					});
				}}
				theme={theme}
			/>

			<div
				style={{
					opacity: 0.6,
					fontSize: 12,
					padding: 24,
					textAlign: "center",
					maxWidth: "min(520px, 100vw - 24px)",
				}}
			>
				Drag across the grid to toggle. Pick up to 3 pieces. Preview loops;
				Continue applies it.
				{/* Add copyright */}
				<br />
				&copy; 2025 Reynara0
			</div>

			{showTheme && (
				<ThemeModal
					theme={theme}
					onClose={() => setShowTheme(false)}
					onSave={setTheme}
				/>
			)}
		</div>
	);
}
