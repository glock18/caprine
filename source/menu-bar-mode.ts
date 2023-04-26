import { app, globalShortcut, BrowserWindow } from 'electron';
import { is } from 'electron-util';
import config from './config';
import tray from './tray';

const menuBarShortcut = 'Command+Shift+y';

export function toggleMenuBarMode(window: BrowserWindow): void {
	window.setVisibleOnAllWorkspaces(false);

	globalShortcut.unregister(menuBarShortcut);

	tray.destroy();
	app.dock.show();
	window.show();
}

export function setUpMenuBarMode(window: BrowserWindow): void {
	if (is.macos) {
		toggleMenuBarMode(window);
	} else if (config.get('showTrayIcon') && !config.get('quitOnWindowClose')) {
		tray.create(window);
	}
}
