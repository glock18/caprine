require('dotenv').config();
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('• notarizing')

  const appName = context.packager.appInfo.productFilename;
  return await notarize({
    tool: 'notarytool',
    appBundleId: 'com.chaport.chaportdesktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    teamId: '3ARLUHV2UZ',
  });
};
