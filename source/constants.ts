import * as path from 'path';
import {fixPathForAsarUnpack} from 'electron-util';

export const chaportIconPath = fixPathForAsarUnpack(path.join(__dirname, '..', 'static', 'Icon.png'));
export const chaportMacIcnsPath = fixPathForAsarUnpack(path.join(__dirname, '..', 'static', 'AppIcon.icns'));
