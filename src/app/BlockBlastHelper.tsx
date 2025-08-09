import React, { useEffect, useRef, useState } from "react";
import {
	Board,
	DEFAULT_THEME,
	Hand,
	Preview,
	Theme,
	Algorithm,
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
} from "../lib/storage";
import BoardView from "../components/Board";
import Hands from "../components/Hands";
import Palette from "../components/Palette";
import ThemeModal from "../components/ThemeModal";

export default function BlockBlastHelper() {
	const [theme, setTheme] = useState<Theme>(() => loadTheme(DEFAULT_THEME));
	const [stepMs, setStepMs] = useState<number>(() => loadSpeed(3000));
	const [algo, setAlgo] = useState<Algorithm>(() => loadAlgo("beam"));

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
		setPreview(findBestByAlgorithm(board, hands, algo));
	}, [board, selected, algo]);

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

	return (
		<div style={shell}>
			<style>{`
        @keyframes pulseStep {
          0% { transform: scale(0.9); opacity: 0.2; }
          25% { transform: scale(1.0); opacity: 0.95; }
          100% { transform: scale(0.9); opacity: 0.2; }
        }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:50; }
      `}</style>

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
					<select
						value={algo}
						onChange={(e) => setAlgo(e.target.value as Algorithm)}
						style={selectStyle}
						title="Algorithm"
					>
						<option value="greedy">Greedy</option>
						<option value="beam">Beam(K=120)</option>
						<option value="rollout">Rollout(N=40)</option>
					</select>
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
				<button onClick={() => setShowTheme(true)} style={button}>
					Customize Theme
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

			{/* Board */}
			<div style={{ ...glass(16), marginTop: 16 }}>
				<BoardView
					board={board}
					setBoardCell={(x, y, mode) => setBoardCell(x, y, mode)}
					preview={preview}
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
