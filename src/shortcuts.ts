export type Action =
  | "undo"
  | "redo"
  | "play"
  | "setIn"
  | "setOut"
  | "addZoom"
  | "addCut"
  | "addSpeed"
  | "addText"
  | "arrow"
  | "remove"
  | "back"
  | "forward"
  | "backLong"
  | "forwardLong"
  | "toStart"
  | "toEnd"
  | "help";

export interface KeyInput {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/** Shortcut list shown in the app, in display order. */
export const SHORTCUTS: readonly { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "Play / pause" },
  { keys: ["←", "→"], label: "Step 0.1 s (Shift: 1 s)" },
  { keys: ["Home", "End"], label: "Go to clip start / end" },
  { keys: ["I", "O"], label: "Set clip start / end" },
  { keys: ["Z"], label: "Add zoom at playhead" },
  { keys: ["X"], label: "Cut 1 s at playhead" },
  { keys: ["S"], label: "Speed up 2 s at playhead" },
  { keys: ["T"], label: "Add text at playhead" },
  { keys: ["A"], label: "Arrow on / off for text at playhead" },
  { keys: ["Del"], label: "Remove cut, speed-up, text or zoom at playhead" },
  { keys: ["Ctrl/⌘ Z"], label: "Undo" },
  { keys: ["Ctrl/⌘ Shift Z"], label: "Redo" },
  { keys: ["?"], label: "Show shortcuts" },
];

/** Map a key press to an editor action, or null when it isn't a shortcut. */
export function actionFor(e: KeyInput): Action | null {
  const mod = Boolean(e.ctrlKey || e.metaKey);
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.altKey) return null;
  if (mod) {
    if (key === "z") return e.shiftKey ? "redo" : "undo";
    if (key === "y" && !e.shiftKey) return "redo";
    return null;
  }
  switch (key) {
    case " ":
      return "play";
    case "i":
      return "setIn";
    case "o":
      return "setOut";
    case "z":
      return "addZoom";
    case "x":
      return "addCut";
    case "s":
      return "addSpeed";
    case "t":
      return "addText";
    case "a":
      return "arrow";
    case "Delete":
    case "Backspace":
      return "remove";
    case "ArrowLeft":
      return e.shiftKey ? "backLong" : "back";
    case "ArrowRight":
      return e.shiftKey ? "forwardLong" : "forward";
    case "Home":
      return "toStart";
    case "End":
      return "toEnd";
    case "?":
      return "help";
    default:
      return null;
  }
}
