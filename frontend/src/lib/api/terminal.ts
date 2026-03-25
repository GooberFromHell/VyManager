/**
 * Terminal API Service
 *
 * Provides WebSocket connection for interactive SSH terminal sessions.
 */

// ============================================================================
// Message Types
// ============================================================================

/** Messages sent from server to client */
export interface TerminalServerMessage {
  type: "ready" | "output" | "status" | "error" | "closed";
  data?: string;
  reason?: string;
}

/** Input message sent from client to server */
export interface TerminalInputMessage {
  type: "input";
  data: string;
}

/** Resize message sent from client to server */
export interface TerminalResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

/** Init message sent on connection to set terminal size */
export interface TerminalInitMessage {
  type: "init";
  cols: number;
  rows: number;
}

/** All client-to-server message types */
export type TerminalClientMessage =
  | TerminalInputMessage
  | TerminalResizeMessage
  | TerminalInitMessage
  | { type: "ping" };

// ============================================================================
// Terminal Service
// ============================================================================

class TerminalService {
  /**
   * Create a WebSocket connection for the interactive terminal.
   * Connects directly to the backend (Next.js cannot proxy WebSockets).
   */
  createTerminalSocket(): WebSocket {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `ws://${window.location.hostname}:8000`;
    return new WebSocket(`${wsUrl}/vyos/terminal/ws/shell`);
  }
}

export const terminalService = new TerminalService();
