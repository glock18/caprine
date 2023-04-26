import {ipcRenderer as ipc} from 'electron-better-ipc';
import {is} from 'electron-util';

// ipc.answerMain('find', () => {
// 	const searchBox =
// 		// Old UI
// 		document.querySelector<HTMLElement>('._58al') ??
// 		// Newest UI
// 		document.querySelector<HTMLElement>('[aria-label="Search Messenger"]');

// 	searchBox!.focus();
// });

ipc.answerMain('reload', () => {
	location.reload();
});

function renderOverlayIcon(messageCount: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.height = 128;
	canvas.width = 128;
	canvas.style.letterSpacing = '-5px';

	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#f42020';
	ctx.beginPath();
	ctx.ellipse(64, 64, 64, 64, 0, 0, 2 * Math.PI);
	ctx.fill();
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.font = '90px sans-serif';
	ctx.fillText(String(Math.min(99, messageCount)), 64, 96);

	return canvas;
}

ipc.answerMain('render-overlay-icon', (messageCount: number): {data: string; text: string} => {
	return {
		data: renderOverlayIcon(messageCount).toDataURL(),
		text: String(messageCount)
	};
});

ipc.answerMain('render-native-emoji', (emoji: string): string => {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	canvas.width = 256;
	canvas.height = 256;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	if (is.macos) {
		context.font = '256px system-ui';
		context.fillText(emoji, 128, 154);
	} else {
		context.textBaseline = 'bottom';
		context.font = '225px system-ui';
		context.fillText(emoji, 128, 256);
	}

	const dataUrl = canvas.toDataURL();
	return dataUrl;
});

// Handle title bar double-click.
window.addEventListener('dblclick', (event: Event) => {
	const target = event.target as HTMLElement;
	const titleBar = target.closest('.header');

	if (!titleBar) {
		return;
	}

	ipc.callMain('titlebar-doubleclick');
}, {
	passive: true
});

ipc.answerMain('notification-callback', (data: unknown) => {
	window.postMessage({type: 'notification-callback', data}, '*');
});
