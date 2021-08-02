import _process from "process";

import * as posix from "./posix";
import * as win32 from "./win32";

const isWin32 = _process.platform === "win32";
export { win32, posix };

export const sep = isWin32 ? win32.sep : posix.sep;
export const delimiter = isWin32 ? win32.delimiter : posix.delimiter;
export const resolve = isWin32 ? win32.resolve : posix.resolve;
export const normalize = isWin32 ? win32.normalize : posix.normalize;
export const isAbsolute = isWin32 ? win32.isAbsolute : posix.isAbsolute;
export const join = isWin32 ? win32.join : posix.join;
export const relative = isWin32 ? win32.relative : posix.relative;
export const _makeLong = isWin32 ? win32._makeLong : posix._makeLong;
export const dirname = isWin32 ? win32.dirname : posix.dirname;
export const basename = isWin32 ? win32.basename : posix.basename;
export const extname = isWin32 ? win32.extname : posix.extname;
export const format = isWin32 ? win32.format : posix.format;
export const parse = isWin32 ? win32.parse : posix.parse;
