export type PathObject = {
  readonly root?: string;
  readonly dir: string;
  readonly base?: string;
  readonly sep?: string;
  readonly ext: string;
  readonly name: string;
};
// resolves . and .. elements in a path array with directory names there
// must be no slashes or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
export function normalizeArray(
  parts: readonly string[],
  allowAboveRoot: boolean
): readonly string[] {
  const res = [];

  // eslint-disable-next-line functional/no-loop-statement
  for (const p of parts) {
    // ignore empty parts
    if (!p || p === ".") continue;

    if (p === "..") {
      if (res.length && res[res.length - 1] !== "..") {
        // eslint-disable-next-line functional/immutable-data
        res.pop();
      } else if (allowAboveRoot) {
        // eslint-disable-next-line functional/immutable-data
        res.push("..");
      }
    } else {
      // eslint-disable-next-line functional/immutable-data
      res.push(p);
    }
  }

  return res;
}

// returns an array with empty elements removed from either end of the input
// array or the original array if no elements need to be removed
export function trimArray(arr: readonly string[]): readonly string[] {
  const lastIndex = arr.length - 1;
  // eslint-disable-next-line functional/no-let
  let start = 0;
  // eslint-disable-next-line functional/no-loop-statement
  for (; start <= lastIndex; start++) {
    if (arr[start]) break;
  }

  // eslint-disable-next-line functional/no-let
  let end = lastIndex;
  // eslint-disable-next-line functional/no-loop-statement
  for (; end >= 0; end--) {
    if (arr[end]) break;
  }

  if (start === 0 && end === lastIndex) return arr;
  if (start > end) return [];
  return arr.slice(start, end + 1);
}
