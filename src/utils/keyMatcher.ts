/**
 * Utilities for matching keyboard input against configured key bindings
 */

import type { Key } from 'ink';
import type { KeyAction } from '../types/keymap.js';

/**
 * Matches Ink input event against a config string like "ctrl+f", "up", "j"
 *
 * @param input - The literal character typed
 * @param key - Ink's Key object with special key flags
 * @param keyString - Config string like "ctrl+f", "shift+up", "j"
 * @returns True if the input matches the key string
 *
 * @example
 * matchesKey('j', {}, 'j') // true
 * matchesKey('', { upArrow: true }, 'up') // true
 * matchesKey('f', { ctrl: true }, 'ctrl+f') // true
 */
export function matchesKey(input: string, key: Key, keyString: string): boolean {
	const parts = keyString.toLowerCase().split('+');
	const mainKey = parts.pop()!;
	const modifiers = new Set(parts);

	// Check modifiers match (except shift for literal chars - see below)
	if (modifiers.has('ctrl') && !key.ctrl) return false;
	if (!modifiers.has('ctrl') && key.ctrl) return false;
	if (modifiers.has('meta') && !key.meta) return false;
	if (!modifiers.has('meta') && key.meta) return false;

	// Map special key names to Ink key properties
	const specialKeys: Record<string, keyof Key> = {
		up: 'upArrow',
		down: 'downArrow',
		left: 'leftArrow',
		right: 'rightArrow',
		return: 'return',
		enter: 'return',
		escape: 'escape',
		esc: 'escape',
		pageup: 'pageUp',
		pagedown: 'pageDown',
		tab: 'tab',
	};

	const inkKey = specialKeys[mainKey];
	if (inkKey) {
		// For special keys, check shift modifier if explicitly requested
		if (modifiers.has('shift') && !key.shift) return false;
		if (!modifiers.has('shift') && key.shift) return false;
		return key[inkKey] === true;
	}

	// Special handling for space - check input character
	if (mainKey === 'space') {
		// For space with explicit shift modifier
		if (modifiers.has('shift') && !key.shift) return false;
		if (!modifiers.has('shift') && key.shift) return false;
		return input === ' ';
	}

	// Literal character match - exact case match required
	// For literal characters, shift is encoded in the character itself
	// (e.g., '?' requires shift but we match on '?' not 'shift+/')
	// So we ignore the shift modifier for literal chars
	if (modifiers.has('shift')) {
		// If 'shift+x' is in config, check shift modifier
		if (!key.shift) return false;
	}
	// Don't check !modifiers.has('shift') - allow naturally shifted chars

	return input === mainKey;
}

/**
 * Checks if input matches ANY binding for an action
 *
 * @param input - The literal character typed
 * @param key - Ink's Key object
 * @param action - The semantic action to check (e.g., 'nav.up')
 * @param keyMap - Resolved keymap (from preset + overrides)
 * @returns True if input matches any binding for the action
 *
 * @example
 * const keyMap = { 'nav.up': ['k', 'up'] };
 * isAction('k', {}, 'nav.up', keyMap) // true
 * isAction('', { upArrow: true }, 'nav.up', keyMap) // true
 */
export function isAction(
	input: string,
	key: Key,
	action: KeyAction,
	keyMap: Record<KeyAction, string[]>,
): boolean {
	const bindings = keyMap[action] || [];
	return bindings.some((binding) => matchesKey(input, key, binding));
}
