import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useLcuStore } from "../stores/lcu";

export function useLcuEvents() {
	const { setConnected, setDisconnected } = useLcuStore();

	useEffect(() => {
		const unlisteners = [
			listen<{ port: number }>("lcu-connected", (e) => {
				setConnected(e.payload.port);
			}),
			listen("lcu-disconnected", () => {
				setDisconnected();
			}),
		];

		return () => {
			for (const p of unlisteners) {
				p.then((fn) => fn());
			}
		};
	}, [setConnected, setDisconnected]);
}
