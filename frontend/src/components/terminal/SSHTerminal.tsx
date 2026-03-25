"use client";

import { useEffect, useRef } from "react";

interface SSHTerminalProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  onReady: (write: (data: string) => void, cols: number, rows: number) => void;
}

export function SSHTerminal({ onData, onResize, onReady }: SSHTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store callbacks in refs to avoid re-running the effect on every render
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onDataRef.current = onData;
    onResizeRef.current = onResize;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let termInstance: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fitAddonInstance: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      // Dynamic imports keep xterm out of the SSR bundle entirely
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      // xterm CSS must also be loaded dynamically
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — no type declarations for CSS module imports
      await import("@xterm/xterm/css/xterm.css");

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily:
          '"Geist Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
        theme: {
          background: "#09090b",
          foreground: "#fafafa",
          cursor: "#fafafa",
          selectionBackground: "#27272a",
          black: "#09090b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#fafafa",
          brightBlack: "#52525b",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#ffffff",
        },
        allowTransparency: false,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termInstance = term;
      fitAddonInstance = fitAddon;

      // Wire user keyboard input to parent
      term.onData((data: string) => {
        onDataRef.current(data);
      });

      // Wire terminal resize events to parent
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        onResizeRef.current(cols, rows);
      });

      // Expose write function and initial dimensions to parent
      const write = (data: string) => term.write(data);
      onReadyRef.current(write, term.cols, term.rows);

      // Fit terminal when the container changes size
      resizeObserver = new ResizeObserver(() => {
        if (fitAddonInstance && !disposed) {
          try {
            fitAddonInstance.fit();
          } catch {
            // fit() can throw if the terminal has been disposed
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    };

    init();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      termInstance?.dispose();
    };
    // Intentionally empty dep array — we only want to initialize once and
    // rely on the callback refs for stable access to the latest props.
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      // Prevent the browser's default drag/drop behaviour inside the terminal
      onDragOver={(e) => e.preventDefault()}
    />
  );
}
