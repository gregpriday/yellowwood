import { useEffect } from 'react';
import { useStdin } from 'ink';
import { parseMouseSequences, TerminalMouseEvent } from '../utils/mouseInput.js';

interface UseTerminalMouseProps {
  enabled: boolean;
  onMouse: (event: TerminalMouseEvent) => void;
}

export function useTerminalMouse({ enabled, onMouse }: UseTerminalMouseProps) {
  const { stdin, setRawMode } = useStdin();

  useEffect(() => {
    if (!enabled || !stdin) return;

    // 1. Enable Raw Mode
    setRawMode?.(true);

    // 2. Enable Mouse Reporting (Click events + SGR format)
    process.stdout.write('\x1b[?1000h\x1b[?1006h');

    const handleData = (data: Buffer) => {
      const text = data.toString();
      // Parse all events in the chunk (handles buffering/rapid inputs)
      const events = parseMouseSequences(text);
      events.forEach(event => onMouse(event));
    };

    stdin.on('data', handleData);

    return () => {
      // Cleanup: Disable mouse reporting
      // We do NOT disable raw mode here, because other components (like useKeyboard)
      // still need it active to detect input (e.g., the second Ctrl+C).
      process.stdout.write('\x1b[?1000l\x1b[?1006l');
      stdin.off('data', handleData);
    };
  }, [enabled, stdin, setRawMode, onMouse]);
}