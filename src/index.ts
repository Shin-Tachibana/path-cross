import _process from "process";

import posix from "./posix";
import win32 from "./win32";

export default _process.platform === "win32" ? win32 : posix;
export { win32, posix };
