import React, { useRef } from "react";
import { Board, Theme, Preview, N } from "../types";
import { normalize } from "../lib/board";

type Props = {
	board: Board;
	setBoardCell: (x: number, y: number, v: 0 | 1 | "toggle") => void;
	preview: Preview | null;
	activeStep: number;
	stepMs: number;
	theme: Theme;
	cellSize?: number;
};

export default function BoardView({
	board,
	setBoardCell,
	preview,
	activeStep,
	stepMs,
	theme,
	cellSize = 40,
}: Props) {
	const gridPx = N * cellSize;

	const boardRef = useRef<HTMLDivElement | null>(null);
	const dragging = useRef(false);
	const toggledThisDrag = useRef<Set<string>>(new Set());

	const boardStyle: React.CSSProperties = {
		position: "relative",
		width: gridPx,
		height: gridPx,
		touchAction: "none", // critical for mobile drag
		userSelect: "none",
	};

	const cellBase: React.CSSProperties = {
		position: "absolute",
		width: cellSize - 4,
		height: cellSize - 4,
		borderRadius: 8,
		border: "1px solid rgba(255,255,255,0.08)",
	};

	function toggleAtPointer(e: React.PointerEvent<HTMLDivElement>) {
		const el = boardRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		// prevent page scroll on iOS during drag
		e.preventDefault();

		const px = e.clientX;
		const py = e.clientY;
		const x = Math.floor((px - rect.left) / cellSize);
		const y = Math.floor((py - rect.top) / cellSize);
		if (x < 0 || y < 0 || x >= N || y >= N) return;

		const key = `${x},${y}`;
		if (toggledThisDrag.current.has(key)) return; // avoid flipping back and forth in one pass
		toggledThisDrag.current.add(key);
		setBoardCell(x, y, "toggle");
	}

	function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
		boardRef.current?.setPointerCapture?.(e.pointerId);
		dragging.current = true;
		toggledThisDrag.current.clear();
		toggleAtPointer(e);
	}

	function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
		if (!dragging.current) return;
		toggleAtPointer(e);
	}

	function onPointerUp() {
		dragging.current = false;
		toggledThisDrag.current.clear();
	}

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				width: "100%",
			}}
		>
			<div
				ref={boardRef}
				style={boardStyle}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				{/* Base grid */}
				{board.map((row, y) =>
					row.map((val, x) => (
						<div
							key={`${x}-${y}`}
							style={{
								...cellBase,
								left: x * cellSize,
								top: y * cellSize,
								background: val ? theme.filledColor : theme.emptyColor,
								boxShadow: val
									? "inset 0 0 8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.4)"
									: "inset 0 0 8px rgba(255,255,255,0.03)",
							}}
						/>
					)),
				)}

				{/* Preview overlay with intersection-aware styling */}
				{preview?.steps.map((s, idx) => {
					const isActive = idx === activeStep;
					const past = preview && idx < activeStep;
					const baseOpacity = isActive ? 0.95 : past ? 0.25 : 0.12;
					return (
						<React.Fragment key={`step-${idx}`}>
							{normalize(s.hand.shape).map(([sx, sy], i) => {
								const gx = s.ox + sx,
									gy = s.oy + sy;
								const overlapsFilled = board[gy]?.[gx] === 1;
								return (
									<div
										key={`c-${i}`}
										style={{
											...cellBase,
											pointerEvents: "none",
											left: gx * cellSize,
											top: gy * cellSize,
											background: overlapsFilled ? "transparent" : s.hand.color,
											border: overlapsFilled
												? "2px solid rgba(255,255,255,0.9)"
												: "1px solid rgba(255,255,255,0.18)",
											boxShadow: overlapsFilled
												? `0 0 10px ${s.hand.color}`
												: undefined,
											mixBlendMode: overlapsFilled ? "normal" : "screen",
											opacity: baseOpacity,
											animation: isActive
												? `pulseStep ${stepMs}ms ease-in-out infinite`
												: undefined,
										}}
									/>
								);
							})}
							<div
								style={{
									position: "absolute",
									left: s.ox * cellSize,
									top: s.oy * cellSize,
									padding: "2px 6px",
									borderRadius: 6,
									fontSize: 11,
									fontWeight: 700,
									background: "rgba(0,0,0,0.6)",
									opacity: baseOpacity,
								}}
							>
								{idx + 1}
							</div>
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}
