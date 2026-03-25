"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { terminalService } from "@/lib/api/terminal";
import type { TerminalServerMessage } from "@/lib/api/terminal";

export type TerminalStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseTerminalWebSocketOptions {
  onOutput?: (data: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  onClosed?: (reason: string) => void;
}

interface UseTerminalWebSocketReturn {
  status: TerminalStatus;
  error: string | null;
  connect: (cols: number, rows: number) => void;
  disconnect: () => void;
  sendInput: (data: string) => void;
  sendResize: (cols: number, rows: number) => void;
}

export function useTerminalWebSocket(
  options: UseTerminalWebSocketOptions = {}
): UseTerminalWebSocketReturn {
  const [status, setStatus] = useState<TerminalStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep options in a ref to avoid stale closures in event handlers
  const optionsRef = useRef<UseTerminalWebSocketOptions>(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const connect = useCallback(
    (cols: number, rows: number) => {
      cleanup();
      setError(null);
      setStatus("connecting");

      const ws = terminalService.createTerminalSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initial size as first message; backend expects this before
        // spawning the shell so the pty is sized correctly from the start.
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: TerminalServerMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "ready":
              setStatus("connected");
              optionsRef.current.onReady?.();
              break;

            case "output":
              if (msg.data) {
                optionsRef.current.onOutput?.(msg.data);
              }
              break;

            case "error":
              setStatus("error");
              setError(msg.data || "Terminal error");
              optionsRef.current.onError?.(msg.data || "Terminal error");
              cleanup();
              break;

            case "closed":
              setStatus("disconnected");
              optionsRef.current.onClosed?.(msg.reason || "Session closed");
              cleanup();
              break;

            case "status":
              // Informational status messages — no state change needed
              break;
          }
        } catch {
          // Non-JSON frames are treated as raw output
          optionsRef.current.onOutput?.(event.data);
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("WebSocket connection error");
        optionsRef.current.onError?.("WebSocket connection error");
        cleanup();
      };

      ws.onclose = () => {
        // Only update state if we weren't already in a terminal error state
        setStatus((prev) => (prev === "error" ? prev : "disconnected"));
        wsRef.current = null;
      };
    },
    [cleanup]
  );

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("disconnected");
    setError(null);
  }, [cleanup]);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", data }));
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  return { status, error, connect, disconnect, sendInput, sendResize };
}
