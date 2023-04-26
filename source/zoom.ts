import config from './config';
import {
	BrowserWindow,
} from 'electron';

const zoomSteps = new Map([0.5, 0.75, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5] as Iterable<[number, number]>);

export function setZoom(win: BrowserWindow, zoomFactor?: number) {
	if (!zoomFactor) {
		return; // ignore the call if zoomFactor isn't passed or passed undefined
	}

	config.set('zoomFactor', zoomFactor);
	win.webContents.setZoomFactor(zoomFactor);
}

export function initializeZoom(win: BrowserWindow) {
	win.webContents.setZoomFactor(config.get('zoomFactor'));
	win.webContents
		.setVisualZoomLevelLimits(0.5, 5)
		.catch((error) => { console.log(error); }); // eslint-disable-line

	win.webContents.on('zoom-changed', ({}, zoomDirection) => { // eslint-disable-line no-empty-pattern
		if (zoomDirection === 'in') {
			increaseZoom(win);
		}

		if (zoomDirection === 'out') {
			decreaseZoom(win);
		}
	});
}

export function resetZoom(win: BrowserWindow) {
	setZoom(win, 1);
}

export function decreaseZoom(win: BrowserWindow) {
	const currentZoom = config.get('zoomFactor');
	for (const [key, value] of zoomSteps) {
		if (value >= currentZoom) {
			setZoom(win, zoomSteps.get(key - 1));
			return;
		}
	}
}

export function increaseZoom(win: BrowserWindow) {
	const currentZoom = config.get('zoomFactor');
	for (const [key, value] of zoomSteps) {
		if (value >= currentZoom) {
			setZoom(win, zoomSteps.get(key + 1));
			return;
		}
	}
}
