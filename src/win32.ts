/* eslint-disable functional/no-let */
/* eslint-disable functional/no-this-expression */
/* eslint-disable no-useless-escape */
import _process from "process";

import { normalizeArray, trimArray } from "./utils";
import type { PathObject } from "./utils";
// Regex to split a windows path into three parts: [*, device, slash,
// tail] windows-only
const splitDeviceRe =
  /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;

// Regex to split the tail part of the above into [*, dir, basename, ext]
const splitTailRe =
  /^([\s\S]*?)((?:\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))(?:[\\\/]*)$/;

// Function to split a filename into [root, dir, basename, ext]
function win32SplitPath(
  filename: string
): readonly [string, string, string, string] {
  // Separate device+slash from tail
  const result = splitDeviceRe.exec(filename),
    device = (result?.[1] || "") + (result?.[2] || ""),
    tail = result?.[3] || "";
  // Split the tail into dir, basename and extension
  const result2 = splitTailRe.exec(tail),
    dir = result2?.[1] ?? "",
    basename = result2?.[2] ?? "",
    ext = result2?.[3] ?? "";
  return [device, dir, basename, ext];
}

function win32StatPath(path: string): {
  readonly device: string;
  readonly isUnc: boolean;
  readonly isAbsolute: boolean;
  readonly tail: string;
} {
  const result = splitDeviceRe.exec(path),
    device = result?.[1] || "",
    isUnc = !!device && device[1] !== ":";
  return {
    device,
    isUnc,
    isAbsolute: isUnc || !!result?.[2], // UNC paths are always absolute
    tail: result?.[3] ?? "",
  };
}

function normalizeUNCRoot(device: string): string {
  return `\\\\${device.replace(/^[\\\/]+/, "").replace(/[\\\/]+/g, "\\")}`;
}

// eslint-disable-next-line functional/no-class
export default new (class {
  readonly sep: string = "\\";
  readonly delimiter: string = ";";

  // eslint-disable-next-line functional/functional-parameters
  resolve(...args: readonly string[]): string {
    let resolvedDevice = "",
      resolvedTail = "",
      resolvedAbsolute = false,
      isUnc = false;

    // eslint-disable-next-line functional/no-loop-statement
    for (let i = args.length - 1; i >= -1; i--) {
      let path: string;
      if (i >= 0) {
        path = args[i];
      } else if (!resolvedDevice) {
        path = _process.cwd();
      } else {
        // Windows has the concept of drive-specific current working
        // directories. If we've resolved a drive letter but not yet an
        // absolute path, get cwd for that drive. We're sure the device is not
        // an unc path at this points, because unc paths are always absolute.
        path = _process.env[`=${resolvedDevice}`];
        // Verify that a drive-local cwd was found and that it actually points
        // to our drive. If not, default to the drive's root.
        if (
          !path ||
          path.substr(0, 3).toLowerCase() !==
            `${resolvedDevice.toLowerCase()}\\`
        ) {
          path = `${resolvedDevice}\\`;
        }
      }

      // Skip empty and invalid entries
      if (typeof path !== "string") {
        // eslint-disable-next-line functional/no-throw-statement
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        continue;
      }

      const result = win32StatPath(path);
      const device = result.device;
      isUnc = result.isUnc;
      const isAbsolute = result.isAbsolute;
      const tail = result.tail;

      if (
        device &&
        resolvedDevice &&
        device.toLowerCase() !== resolvedDevice.toLowerCase()
      ) {
        // This path points to another device so it is not applicable
        continue;
      }

      if (!resolvedDevice) {
        resolvedDevice = device;
      }
      if (!resolvedAbsolute) {
        resolvedTail = `${tail}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute;
      }

      if (resolvedDevice && resolvedAbsolute) {
        break;
      }
    }

    // Convert slashes to backslashes when `resolvedDevice` points to an UNC
    // root. Also squash multiple slashes into a single one where appropriate.
    if (isUnc) {
      resolvedDevice = normalizeUNCRoot(resolvedDevice);
    }

    // At this point the path should be resolved to a full absolute path,
    // but handle relative paths to be safe (might happen when process.cwd()
    // fails)

    // Normalize the tail path
    resolvedTail = normalizeArray(
      resolvedTail.split(/[\\\/]+/),
      !resolvedAbsolute
    ).join("\\");

    return (
      resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || "."
    );
  }
  normalize(path: string): string {
    const result = win32StatPath(path);
    const isUnc = result.isUnc;
    const isAbsolute = result.isAbsolute;

    let { device, tail } = result;

    const trailingSlash = /[\\\/]$/.test(tail);

    // Normalize the tail path

    tail = normalizeArray(tail.split(/[\\\/]+/), !isAbsolute).join("\\");

    if (!tail && !isAbsolute) {
      tail = ".";
    }
    if (tail && trailingSlash) {
      tail += "\\";
    }

    // Convert slashes to backslashes when `device` points to an UNC root.
    // Also squash multiple slashes into a single one where appropriate.
    if (isUnc) {
      device = normalizeUNCRoot(device);
    }

    return device + (isAbsolute ? "\\" : "") + tail;
  }
  isAbsolute(path: string): boolean {
    return win32StatPath(path).isAbsolute;
  }
  // eslint-disable-next-line functional/functional-parameters
  join(...args: readonly string[]): string {
    const paths = [];

    // eslint-disable-next-line functional/no-loop-statement
    for (const arg of args) {
      if (typeof arg !== "string") {
        // eslint-disable-next-line functional/no-throw-statement
        throw new TypeError("Arguments to path.join must be strings");
      }
      if (arg) {
        // eslint-disable-next-line functional/immutable-data
        paths.push(arg);
      }
    }

    let joined = paths.join("\\");

    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for an UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at an UNC path. This is assumed when the first
    // non-empty string arguments starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as an UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\')
    if (!/^[\\\/]{2}[^\\\/]/.test(paths[0])) {
      joined = joined.replace(/^[\\\/]{2,}/, "\\");
    }

    return this.normalize(joined);
  }
  relative(from: string, to: string): string {
    from = this.resolve(from);
    to = this.resolve(to);

    // windows is not case sensitive
    const lowerFrom = from.toLowerCase();
    const lowerTo = to.toLowerCase();

    const toParts = trimArray(to.split("\\"));

    const lowerFromParts = trimArray(lowerFrom.split("\\"));
    const lowerToParts = trimArray(lowerTo.split("\\"));

    const length = Math.min(lowerFromParts.length, lowerToParts.length);
    let samePartsLength = length;
    // eslint-disable-next-line functional/no-loop-statement
    for (let i = 0; i < length; i++) {
      if (lowerFromParts[i] !== lowerToParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    if (samePartsLength == 0) {
      return to;
    }

    let outputParts = [];
    // eslint-disable-next-line functional/no-loop-statement
    for (let i = samePartsLength; i < lowerFromParts.length; i++) {
      // eslint-disable-next-line functional/immutable-data
      outputParts.push("..");
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join("\\");
  }
  _makeLong(path: string): string {
    // Note: this will *probably* throw somewhere.
    if (typeof path !== "string") return path;

    if (!path) {
      return "";
    }

    const resolvedPath = this.resolve(path);

    if (/^[a-zA-Z]\:\\/.test(resolvedPath)) {
      // path is local filesystem path, which needs to be converted
      // to long UNC path.
      return `\\\\?\\${resolvedPath}`;
    } else if (/^\\\\[^?.]/.test(resolvedPath)) {
      // path is network UNC path, which needs to be converted
      // to long UNC path.
      return `\\\\?\\UNC\\${resolvedPath.substring(2)}`;
    }

    return path;
  }
  dirname(path: string): string {
    const result = win32SplitPath(path);
    const root = result[0];
    let dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  }
  basename(path: string, ext?: string): string {
    let f = win32SplitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  }
  extname(path: string): string {
    return win32SplitPath(path)[3];
  }
  format(pathObject: PathObject): string {
    if (pathObject == null || typeof pathObject !== "object") {
      // eslint-disable-next-line functional/no-throw-statement
      throw new TypeError(
        `Parameter 'pathObject' must be an object, not ${typeof pathObject}`
      );
    }

    const root = pathObject.root || "";

    if (typeof root !== "string") {
      // eslint-disable-next-line functional/no-throw-statement
      throw new TypeError(
        `'pathObject.root' must be a string or undefined, not ${typeof pathObject.root}`
      );
    }

    const dir = pathObject.dir;
    const base = pathObject.base || "";
    if (!dir) {
      return base;
    }
    if (dir[dir.length - 1] === this.sep) {
      return dir + base;
    }
    return dir + this.sep + base;
  }
  parse(pathString: string): PathObject {
    if (typeof pathString !== "string") {
      // eslint-disable-next-line functional/no-throw-statement
      throw new TypeError(
        `Parameter 'pathString' must be a string, not ${typeof pathString}`
      );
    }
    const allParts = win32SplitPath(pathString);
    if (!allParts || allParts.length !== 4) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new TypeError(`Invalid path '${pathString}'`);
    }
    return {
      root: allParts[0],
      dir: allParts[0] + allParts[1].slice(0, -1),
      base: allParts[2],
      ext: allParts[3],
      name: allParts[2].slice(0, allParts[2].length - allParts[3].length),
    };
  }
})();
