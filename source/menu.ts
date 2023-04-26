import {app, shell, Menu, MenuItemConstructorOptions, dialog} from 'electron';
import {
	is,
	appMenu,
} from 'electron-util';
import config from './config';
import {sendAction, toggleTrayIcon, toggleLaunchMinimized} from './util';

export default async function updateMenu(): Promise<Menu> {
	const preferencesSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Bounce Dock on Message',
			type: 'checkbox',
			visible: is.macos,
			checked: config.get('bounceDockOnMessage'),
			click() {
				config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
			}
		},
		// {
		// 	label: 'Show Message Preview in Notifications',
		// 	type: 'checkbox',
		// 	checked: config.get('notificationMessagePreview'),
		// 	click(menuItem) {
		// 		config.set('notificationMessagePreview', menuItem.checked);
		// 	}
		// },
		{
			label: 'Show Unread Badge',
			type: 'checkbox',
			checked: config.get('showUnreadBadge'),
			click() {
				config.set('showUnreadBadge', !config.get('showUnreadBadge'));
				sendAction('reload');
			}
		},
		// {
		// 	label: 'Spell Checker',
		// 	type: 'checkbox',
		// 	checked: config.get('isSpellCheckerEnabled'),
		// 	click() {
		// 		config.set('isSpellCheckerEnabled', !config.get('isSpellCheckerEnabled'));
		// 		showRestartDialog('Chaport needs to be restarted to enable or disable the spell checker.');
		// 	}
		// },
		// {
		// 	label: 'Hardware Acceleration',
		// 	type: 'checkbox',
		// 	checked: config.get('hardwareAcceleration'),
		// 	click() {
		// 		config.set('hardwareAcceleration', !config.get('hardwareAcceleration'));
		// 		showRestartDialog('Chaport needs to be restarted to change hardware acceleration.');
		// 	}
		// },
		{
			label: 'Always on Top',
			id: 'always-on-top',
			type: 'checkbox',
			accelerator: 'CommandOrControl+Shift+T',
			checked: config.get('alwaysOnTop'),
			async click(menuItem, focusedWindow, event) {
				if (!config.get('alwaysOnTop') && config.get('showAlwaysOnTopPrompt') && event.shiftKey) {
					const result = await dialog.showMessageBox(focusedWindow!, {
						message: 'Are you sure you want the window to stay on top of other windows?',
						detail: 'This was triggered by Command/Control+Shift+T.',
						buttons: [
							'Display on Top',
							'Don\'t Display on Top'
						],
						defaultId: 0,
						cancelId: 1,
						checkboxLabel: 'Don\'t ask me again'
					});

					config.set('showAlwaysOnTopPrompt', !result.checkboxChecked);

					if (result.response === 0) {
						config.set('alwaysOnTop', !config.get('alwaysOnTop'));
						focusedWindow?.setAlwaysOnTop(menuItem.checked);
					} else if (result.response === 1) {
						menuItem.checked = false;
					}
				} else {
					config.set('alwaysOnTop', !config.get('alwaysOnTop'));
					focusedWindow?.setAlwaysOnTop(menuItem.checked);
				}
			}
		},
		{
			label: 'Launch at Login',
			visible: is.macos || is.windows,
			type: 'checkbox',
			checked: app.getLoginItemSettings().openAtLogin,
			click(menuItem) {
				app.setLoginItemSettings({
					openAtLogin: menuItem.checked,
					openAsHidden: menuItem.checked
				});
			}
		},
		{
			id: 'showTrayIcon',
			label: 'Show Tray Icon',
			type: 'checkbox',
			enabled: (is.linux || is.windows) && !config.get('launchMinimized'),
			checked: config.get('showTrayIcon'),
			click() {
				toggleTrayIcon();
			}
		},
		{
			label: 'Launch Minimized',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('launchMinimized'),
			click() {
				toggleLaunchMinimized(menu);
			}
		}
	];

	// const viewSubmenu: MenuItemConstructorOptions[] = [
	// 	{
	// 		label: 'Reset Text Size',
	// 		accelerator: 'CommandOrControl+0',
	// 		click() {
	// 			sendAction('zoom-reset');
	// 		}
	// 	},
	// 	{
	// 		label: 'Increase Text Size',
	// 		accelerator: 'CommandOrControl+Plus',
	// 		click() {
	// 			sendAction('zoom-in');
	// 		}
	// 	},
	// 	{
	// 		label: 'Decrease Text Size',
	// 		accelerator: 'CommandOrControl+-',
	// 		click() {
	// 			sendAction('zoom-out');
	// 		}
	// 	},
	// ];

	const debugSubmenu: MenuItemConstructorOptions[] = [
		{
			label: 'Show Settings',
			click() {
				config.openInEditor();
			}
		},
		{
			label: 'Show App Data',
			click() {
				shell.openPath(app.getPath('userData'));
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Delete Settings',
			click() {
				config.clear();
				app.relaunch();
				app.quit();
			}
		},
		{
			label: 'Delete App Data',
			click() {
				shell.moveItemToTrash(app.getPath('userData'));
				app.relaunch();
				app.quit();
			}
		}
	];

	const macosTemplate: MenuItemConstructorOptions[] = [
		appMenu([
			{
				label: 'Preferences',
				submenu: preferencesSubmenu
			},
			{
				type: 'separator'
			},
			{
				label: 'Relaunch Chaport',
				click() {
					app.relaunch();
					app.quit();
				}
			}
		]),
		{
			role: 'editMenu'
		},
		{
			role: 'windowMenu'
		},
	];

	const linuxWindowsTemplate: MenuItemConstructorOptions[] = [
		{
			role: 'fileMenu',
			submenu: [
				{
					label: 'Settings',
					submenu: preferencesSubmenu
				},
				{
					type: 'separator'
				},
				{
					label: 'Relaunch Chaport',
					click() {
						app.relaunch();
						app.quit();
					}
				},
				{
					role: 'quit'
				}
			]
		},
		{
			role: 'editMenu'
		},
		// {
		// 	role: 'viewMenu',
		// 	submenu: viewSubmenu
		// },
	];

	const template = is.macos ? macosTemplate : linuxWindowsTemplate;

	if (is.development) {
		template.push({
			label: 'Debug',
			submenu: debugSubmenu
		});
	}

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	return menu;
}
