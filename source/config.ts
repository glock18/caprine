import Store = require('electron-store');

type StoreType = {
	// theme: 'system' | 'light' | 'dark';
	zoomFactor: number;
	lastWindowState: { // +
		x: number;
		y: number;
		width: number;
		height: number;
		isMaximized: boolean;
	};
	showDockIcon: boolean; // +
	showTrayIcon: boolean; // only linux and windows
	alwaysOnTop: boolean; // +
	showAlwaysOnTopPrompt: boolean; // +
	bounceDockOnMessage: boolean; // +
	showUnreadBadge: boolean; // +
	launchMinimized: boolean; // only linux and windows
	flashWindowOnMessage: boolean; // only linux and windows, no set calls
	notificationMessagePreview: boolean; // check and maybe remove
	notificationsMuted: boolean; // check and maybe remove
	hardwareAcceleration: boolean; // commented out, default used
	quitOnWindowClose: boolean; // no setters
	isSpellCheckerEnabled: boolean; // commented out, default used
	spellCheckerLanguages: string[]; // apparently default used
};

const schema: Store.Schema<StoreType> = {
	// theme: {
	// 	type: 'string',
	// 	enum: ['system', 'light', 'dark'],
	// 	default: 'system'
	// },
	zoomFactor: {
		type: 'number',
		default: 1
	},
	lastWindowState: {
		type: 'object',
		properties: {
			x: {
				type: 'number'
			},
			y: {
				type: 'number'
			},
			width: {
				type: 'number'
			},
			height: {
				type: 'number'
			},
			isMaximized: {
				type: 'boolean'
			}
		},
		default: {
			x: undefined,
			y: undefined,
			width: 800,
			height: 600,
			isMaximized: false
		}
	},
	showDockIcon: {
		type: 'boolean',
		default: true
	},
	showTrayIcon: {
		type: 'boolean',
		default: true
	},
	alwaysOnTop: {
		type: 'boolean',
		default: false
	},
	showAlwaysOnTopPrompt: {
		type: 'boolean',
		default: true
	},
	bounceDockOnMessage: {
		type: 'boolean',
		default: true
	},
	showUnreadBadge: {
		type: 'boolean',
		default: true
	},
	launchMinimized: {
		type: 'boolean',
		default: false
	},
	flashWindowOnMessage: {
		type: 'boolean',
		default: true
	},
	notificationMessagePreview: {
		type: 'boolean',
		default: true
	},
	notificationsMuted: {
		type: 'boolean',
		default: false
	},
	hardwareAcceleration: {
		type: 'boolean',
		default: true
	},
	quitOnWindowClose: {
		type: 'boolean',
		default: false
	},
	isSpellCheckerEnabled: {
		type: 'boolean',
		default: true
	},
	spellCheckerLanguages: {
		type: 'array',
		items: {
			type: 'string'
		},
		default: []
	}
};

const store = new Store<StoreType>({ schema });

export default store;
