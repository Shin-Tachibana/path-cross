import test from "ava";

import { normalizeArray } from "./utils";

test("(method) normalizeArray", (t) => {
  return t.is(
    normalizeArray(["var", "mobile", "Documents", "..", "Application"], true),
    ["var", "mobile", "Application"]
  );
});
