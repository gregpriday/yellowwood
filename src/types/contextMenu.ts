import type { CommandServices } from '../commands/types.js';

export type ContextMenuItemType = 'action' | 'separator' | 'submenu' | 'command';

export type ContextMenuScope = 'file' | 'folder' | 'both';

/**
 * An executable action in the context menu.
 * Executes directly via a function.
 */
export interface ContextMenuAction {
	id: string;
	label: string;
	scope: ContextMenuScope;
	icon?: string; // Optional emoji/icon
	shortcut?: string; // Display shortcut hint (e.g., "⌘C")
	execute: (path: string, services: CommandServices) => Promise<void>;
	matchPattern?: string; // Glob pattern to match files (JSON serializable condition)
}

/**
 * A slash command integration in the context menu.
 * Executes by invoking a registered command.
 */
export interface ContextMenuCommand {
	id: string;
	label: string;
	scope: ContextMenuScope;
	icon?: string;
	commandName: string; // Slash command to execute (e.g., "copytree")
	args?: string[]; // Arguments to pass (file path auto-appended)
	matchPattern?: string; // Glob pattern to match files
}

/**
 * A visual separator between menu items.
 */
export interface ContextMenuSeparator {
	id: string;
	scope: ContextMenuScope;
}

/**
 * A submenu containing nested menu items.
 */
export interface ContextMenuSubmenu {
	id: string;
	label: string;
	scope: ContextMenuScope;
	icon?: string;
	items: ContextMenuItem[];
}

/**
 * Union type representing any context menu item.
 */
export type ContextMenuItem =
	| ({ type: 'action' } & ContextMenuAction)
	| ({ type: 'command' } & ContextMenuCommand)
	| ({ type: 'separator' } & ContextMenuSeparator)
	| ({ type: 'submenu' } & ContextMenuSubmenu);

/**
 * User-configurable context menu settings.
 */
export interface ContextMenuConfig {
	items?: ContextMenuItem[]; // User-defined custom items
	disableDefaults?: string[]; // IDs of default items to hide
}
