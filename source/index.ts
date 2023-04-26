import * as path from 'path';
import { readFileSync } from 'fs';
import {
	app,
	dialog,
	nativeImage,
	screen as electronScreen,
	shell,
	BrowserWindow,
	Menu,
	// Notification,
	MenuItemConstructorOptions,
	systemPreferences
} from 'electron';
import { ipcMain } from 'electron-better-ipc';
import { autoUpdater } from 'electron-updater';
import electronDl = require('electron-dl');
import electronContextMenu = require('electron-context-menu');
import electronLocalshortcut = require('electron-localshortcut');
// import electronDebug = require('electron-debug');
import { is } from 'electron-util';
// import doNotDisturb = require('@sindresorhus/do-not-disturb');
import updateAppMenu from './menu';
import config from './config';
import tray from './tray';
import { sendAction } from './util';
import ensureOnline from './ensure-online';
import { setUpMenuBarMode } from './menu-bar-mode';
import { chaportIconPath, chaportMacIcnsPath } from './constants';

ipcMain.setMaxListeners(100);

// electronDebug({
// 	isEnabled: true, // TODO: This is only enabled to allow `Command+R` because messenger.com sometimes gets stuck after computer waking up
// 	showDevTools: false
// });

electronDl();
electronContextMenu({
	showCopyImageAddress: true,
});

app.setAppUserModelId('com.chaport.chaport');

if (!config.get('hardwareAcceleration')) {
	app.disableHardwareAcceleration();
}

if (!is.development && !is.linux) {
	(async () => {
		const FOUR_HOURS = 1000 * 60 * 60 * 4;
		setInterval(async () => {
			await autoUpdater.checkForUpdates();
		}, FOUR_HOURS);

		autoUpdater.on('update-downloaded', ({}, releaseNotes, releaseName) => { // eslint-disable-line no-empty-pattern
			const dialogOptions = {
				type: 'info',
				buttons: ['Restart', 'Later'],
				title: 'Application Update',
				message: process.platform === 'win32' ? releaseNotes : releaseName,
				detail: 'A new version has been downloaded. Restart the application to apply the updates.'
			};

			dialog.showMessageBox(dialogOptions).then((returnValue) => { // eslint-disable-line promise/prefer-await-to-then
				if (returnValue.response === 0) {
					setImmediate(() => {
						app.removeAllListeners('window-all-closed');
						app.removeAllListeners('before-quit');
						if (mainWindow != null) { // eslint-disable-line no-eq-null, eqeqeq
							mainWindow.removeAllListeners('close');
							mainWindow.close();
						}

						autoUpdater.quitAndInstall(false);
					});
				}
			});
		});
		// autoUpdater.on('before-quit-for-update', rememberWindowStateAndQuit);
		await autoUpdater.checkForUpdates();
	})();
}

let mainWindow: BrowserWindow;
let isQuitting = false;
let previousMessageCount = 0;
let dockMenu: Menu;
const isDNDEnabled = false;

if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

// Preserves the window position when a display is removed and Chaport is moved to a different screen.
app.on('ready', () => {
	electronScreen.on('display-removed', () => {
		const [x, y] = mainWindow.getPosition();
		mainWindow.setPosition(x, y);
	});
});

async function updateBadge(messageCount: number): Promise<void> {
	if (is.macos || is.linux) {
		if (config.get('showUnreadBadge') && !isDNDEnabled) {
			app.badgeCount = messageCount;
		}

		if (
			is.macos &&
			!isDNDEnabled &&
			config.get('bounceDockOnMessage') &&
			previousMessageCount !== messageCount
		) {
			app.dock.bounce('informational');
			previousMessageCount = messageCount;
		}
	}

	if (is.linux || is.windows) {
		if (config.get('showUnreadBadge')) {
			tray.setBadge(messageCount > 0);
		}

		if (config.get('flashWindowOnMessage')) {
			mainWindow.flashFrame(messageCount !== 0);
		}
	}

	tray.update(messageCount);

	if (is.windows && (!config.get('showUnreadBadge') || messageCount === 0)) {
		mainWindow.setOverlayIcon(null, '');
	}
}

function updateTrayIcon(): void {
	if (!config.get('showTrayIcon') || config.get('quitOnWindowClose')) {
		tray.destroy();
	} else {
		tray.create(mainWindow);
	}
}

ipcMain.answerRenderer('update-tray-icon', updateTrayIcon);

function setNotificationsMute(status: boolean): void {
	const label = 'Mute Notifications';
	const muteMenuItem = Menu.getApplicationMenu()!.getMenuItemById('mute-notifications');

	config.set('notificationsMuted', status);
	muteMenuItem.checked = status;

	if (is.macos) {
		const item = dockMenu.items.find((x) => x.label === label);
		item!.checked = status;
	}
}

function createMainWindow(): BrowserWindow {
	const lastWindowState = config.get('lastWindowState');

	// Messenger or Work Chat
	const mainURL = 'https://app.chaport.com';
	// const mainURL = 'http://local-app.chaport.com';

	const win = new BrowserWindow({
		title: app.name,
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: is.macos ? chaportMacIcnsPath : (is.linux ? chaportIconPath : undefined),
		minWidth: 400,
		minHeight: 400,
		alwaysOnTop: config.get('alwaysOnTop'),
		titleBarStyle: 'default',
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nativeWindowOpen: true,
			contextIsolation: true,
			spellcheck: config.get('isSpellCheckerEnabled'),
			plugins: true,
			enableRemoteModule: true
		},
	});

	// Note: {} is a silly TS way to skip an unused argument ('event' here)
	win.on('page-title-updated', ({}, title: string, explicitSet: boolean) => { // eslint-disable-line no-empty-pattern
		if (explicitSet && title) {
			const match = title.match(/^\((\d+)\)/);
			if (match) {
				const unreadCount = Number.parseInt(match[1], 10);
				updateBadge(unreadCount);
				// app.setBadgeCount(unreadCount);
			} else {
				updateBadge(0);
				// app.setBadgeCount(0);
			}
		}
	});

	if (is.macos) {
		win.webContents.userAgent = win.webContents.userAgent.replace('Chaport/', 'ChaportDesktop/Mac/');
	} else if (is.windows) {
		win.webContents.userAgent = win.webContents.userAgent.replace('Chaport/', 'ChaportDesktop/Windows/');
	}
	// alert(win.webContents.userAgent);

	// let previousDarkMode = darkMode.isEnabled;
	// darkMode.onChange(() => {
	// 	if (darkMode.isEnabled !== previousDarkMode) {
	// 		previousDarkMode = darkMode.isEnabled;
	// 		win.webContents.send('set-theme');
	// 	}
	// });

	if (is.macos) {
		win.setSheetOffset(40);
	}

	win.loadURL(mainURL);

	win.on('close', (event) => {
		if (config.get('quitOnWindowClose')) {
			app.quit();
			return;
		}

		// Workaround for https://github.com/electron/electron/issues/20263
		// Closing the app window when on full screen leaves a black screen
		// Exit fullscreen before closing
		if (is.macos && mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', () => {
				mainWindow.hide();
			});
			mainWindow.setFullScreen(false);
		}

		if (!isQuitting) {
			event.preventDefault();

			// Workaround for https://github.com/electron/electron/issues/10023
			win.blur();
			if (is.macos) {
				// On macOS we're using `app.hide()` in order to focus the previous window correctly
				app.hide();
			} else {
				win.hide();
			}
		}
	});

	win.on('focus', () => {
		if (config.get('flashWindowOnMessage')) {
			// This is a security in the case where messageCount is not reset by page title update
			win.flashFrame(false);
		}
	});

	win.on('resize', () => {
		const { isMaximized } = config.get('lastWindowState');
		config.set('lastWindowState', { ...win.getNormalBounds(), isMaximized });
	});

	win.on('maximize', () => {
		config.set('lastWindowState.isMaximized', true);
	});

	win.on('unmaximize', () => {
		config.set('lastWindowState.isMaximized', false);
	});

	return win;
}

(async () => {
	await Promise.all([ensureOnline(), app.whenReady()]);
	await updateAppMenu();
	mainWindow = createMainWindow();

	// Workaround for https://github.com/electron/electron/issues/5256
	electronLocalshortcut.register(mainWindow, 'CommandOrControl+=', () => {
		sendAction('zoom-in');
	});

	// Start in menu bar mode if enabled, otherwise start normally
	setUpMenuBarMode(mainWindow);

	if (is.macos) {
		const firstItem: MenuItemConstructorOptions = {
			label: 'Mute Notifications',
			type: 'checkbox',
			checked: config.get('notificationsMuted'),
			async click() {
				setNotificationsMute(await ipcMain.callRenderer(mainWindow, 'toggle-mute-notifications'));
			}
		};

		dockMenu = Menu.buildFromTemplate([firstItem]);
		app.dock.setMenu(dockMenu);

		// Dock icon is hidden initially on macOS
		if (config.get('showDockIcon')) {
			app.dock.show();
		}

		ipcMain.once('conversations', () => {
			// Messenger sorts the conversations by unread state.
			// We select the first conversation from the list.
			sendAction('jump-to-conversation', 1);
		});

		ipcMain.answerRenderer('conversations', (conversations: Conversation[]) => {
			if (conversations.length === 0) {
				return;
			}

			const items = conversations.map(({ label, icon }, index) => {
				return {
					label: `${label}`,
					icon: nativeImage.createFromDataURL(icon),
					click: () => {
						mainWindow.show();
						sendAction('jump-to-conversation', index + 1);
					}
				};
			});

			app.dock.setMenu(Menu.buildFromTemplate([firstItem, { type: 'separator' }, ...items]));
		});
	}

	const { webContents } = mainWindow;

	webContents.on('dom-ready', async () => {
		await updateAppMenu();

		if (config.get('launchMinimized') || app.getLoginItemSettings().wasOpenedAsHidden) {
			mainWindow.hide();
			tray.create(mainWindow);
		} else {
			if (config.get('lastWindowState').isMaximized) {
				mainWindow.maximize();
			}

			mainWindow.show();
		}

		setNotificationsMute(await ipcMain.callRenderer(mainWindow, 'toggle-mute-notifications', {
			defaultStatus: config.get('notificationsMuted')
		}));

		await webContents.executeJavaScript(
			readFileSync(path.join(__dirname, 'notifications-isolated.js'), 'utf8')
		);
	});

	webContents.on('will-navigate', async (event, url) => {
		const isInternal = (url: string): boolean => {
			const { hostname } = new URL(url);
			return hostname.endsWith('.chaport.com');
		};

		if (isInternal(url)) {
			return;
		}

		event.preventDefault();
		await shell.openExternal(url);
	});
})();

function toggleMaximized(): void {
	if (mainWindow.isMaximized()) {
		mainWindow.unmaximize();
	} else {
		mainWindow.maximize();
	}
}

ipcMain.answerRenderer('titlebar-doubleclick', () => {
	if (is.macos) {
		const doubleClickAction = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string');

		if (doubleClickAction === 'Minimize') {
			mainWindow.minimize();
		} else if (doubleClickAction === 'Maximize') {
			toggleMaximized();
		}
	} else {
		toggleMaximized();
	}
});

app.on('activate', () => {
	if (mainWindow) {
		mainWindow.show();
	}
});

app.on('before-quit', rememberWindowStateAndQuit);

function rememberWindowStateAndQuit() {
	isQuitting = true;

	// Checking whether the window exists to work around an Electron race issue:
	// https://github.com/sindresorhus/caprine/issues/809
	if (mainWindow) {
		const { isMaximized } = config.get('lastWindowState');
		config.set('lastWindowState', { ...mainWindow.getNormalBounds(), isMaximized });
	}
}
