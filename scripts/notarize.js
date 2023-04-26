require('dotenv').config(); // eslint-disable-line
const { notarize } = require('electron-notarize');

exports.default = async (context) => {
	const { electronPlatformName, appOutDir } = context;
	if (electronPlatformName !== 'darwin') {
		return;
	}

	console.log('• notarizing');

	const appName = context.packager.appInfo.productFilename;
	return notarize({
		tool: 'notarytool',
		appBundleId: 'com.chaport.chaportdesktop',
		appPath: `${appOutDir}/${appName}.app`,
		appleId: process.env.APPLEID,
		appleIdPassword: process.env.APPLEIDPASS,
		teamId: '3ARLUHV2UZ',
	});
};
