import { useRef } from "react";
import { N } from "../types";

export function useDragToggle(
	cellSize: number,
	setCell: (x: number, y: number) => void,
) {
	const ref = useRef<HTMLDivElement | null>(null);
	const dragging = useRef(false);
	const toggled = useRef<Set<string>>(new Set());

	const toggleAtPointer = (
		e: PointerEvent | React.PointerEvent<HTMLDivElement>,
	) => {
		const el = ref.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const px = (e as PointerEvent).clientX ?? (e as any).nativeEvent.clientX;
		const py = (e as PointerEvent).clientY ?? (e as any).nativeEvent.clientY;
		const x = Math.floor((px - rect.left) / cellSize);
		const y = Math.floor((py - rect.top) / cellSize);
		if (x < 0 || y < 0 || x >= N || y >= N) return;
		const key = `${x},${y}`;
		if (toggled.current.has(key)) return;
		toggled.current.add(key);
		setCell(x, y);
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		dragging.current = true;
		toggled.current.clear();
		toggleAtPointer(e);
	};
	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging.current) return;
		toggleAtPointer(e);
	};
	const onPointerUp = () => {
		dragging.current = false;
		toggled.current.clear();
	};

	return { ref, onPointerDown, onPointerMove, onPointerUp };
}
