/* eslint-disable no-useless-escape */
/* eslint-disable functional/no-throw-statement */
/* eslint-disable functional/no-let */

import _process from "process";

import { normalizeArray, trimArray } from "./utils";
import type { PathObject } from "./utils";

const splitPathRe =
  /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

function posixSplitPath(filename: string): readonly string[] {
  return splitPathRe.exec(filename)?.slice(1) || [];
}

export const sep = "/";
export const delimiter = ":";
// eslint-disable-next-line functional/functional-parameters
export function resolve(...args: readonly string[]): string {
  let resolvedPath = "",
    resolvedAbsolute = false;

  // eslint-disable-next-line functional/no-loop-statement
  for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? args[i] : _process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== "string") {
      throw new TypeError("Arguments to path.resolve must be strings");
    } else if (!path) {
      continue;
    }

    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = path[0] === "/";
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(
    resolvedPath.split("/"),
    !resolvedAbsolute
  ).join("/");

  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
}
export function normalize(path: string): string {
  const _isAbsolute = isAbsolute(path),
    trailingSlash = path && path[path.length - 1] === "/";

  // Normalize the path
  path = normalizeArray(path.split("/"), !_isAbsolute).join("/");

  if (!path && !_isAbsolute) {
    path = ".";
  }
  if (path && trailingSlash) {
    path += "/";
  }

  return (_isAbsolute ? "/" : "") + path;
}
export function isAbsolute(path: string): boolean {
  return path.charAt(0) === "/";
}
// eslint-disable-next-line functional/functional-parameters
export function join(...args: readonly string[]): string {
  let path = "";

  // eslint-disable-next-line functional/no-loop-statement
  for (const segment of args) {
    if (typeof segment !== "string") {
      throw new TypeError("Arguments to path.join must be strings");
    }
    if (segment) {
      if (!path) {
        path += segment;
      } else {
        path += `/${segment}`;
      }
    }
  }

  return normalize(path);
}
export function relative(from: string, to: string): string {
  from = resolve(from).substr(1);
  to = resolve(to).substr(1);

  const fromParts = trimArray(from.split("/"));
  const toParts = trimArray(to.split("/"));

  const length = Math.min(fromParts.length, toParts.length);
  let samePartsLength = length;
  // eslint-disable-next-line functional/no-loop-statement
  for (let i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  let outputParts = [];
  // eslint-disable-next-line functional/no-loop-statement
  for (let i = samePartsLength; i < fromParts.length; i++) {
    // eslint-disable-next-line functional/immutable-data
    outputParts.push("..");
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join("/");
}
export function _makeLong(path: string): string {
  return path;
}
export function dirname(path: string): string {
  const result = posixSplitPath(path);
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
export function basename(path: string, ext?: string): string {
  let f = posixSplitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
}
export function extname(path: string): string {
  return posixSplitPath(path)[3];
}
export function format(pathObject: PathObject): string {
  if (pathObject == null || typeof pathObject !== "object") {
    throw new TypeError(
      `Parameter 'pathObject' must be an object, not ${typeof pathObject}`
    );
  }

  const root = pathObject.root || "";

  if (typeof root !== "string") {
    throw new TypeError(
      `'pathObject.root' must be a string or undefined, not ${typeof pathObject.root}`
    );
  }

  const dir = pathObject.dir ? pathObject.dir + sep : "";
  const base = pathObject.base || "";
  return dir + base;
}
export function parse(pathString: string): PathObject {
  if (typeof pathString !== "string") {
    throw new TypeError(
      `Parameter 'pathString' must be a string, not ${typeof pathString}`
    );
  }
  const allParts = [...posixSplitPath(pathString)];
  if (!allParts || allParts.length !== 4) {
    throw new TypeError(`Invalid path '${pathString}'`);
  }
  // eslint-disable-next-line functional/immutable-data
  allParts[1] = allParts[1] || "";
  // eslint-disable-next-line functional/immutable-data
  allParts[2] = allParts[2] || "";
  // eslint-disable-next-line functional/immutable-data
  allParts[3] = allParts[3] || "";

  return {
    root: allParts[0],
    dir: allParts[0] + allParts[1].slice(0, -1),
    base: allParts[2],
    ext: allParts[3],
    name: allParts[2].slice(0, allParts[2].length - allParts[3].length),
  };
}
