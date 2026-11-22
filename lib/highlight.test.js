import assert from "node:assert/strict";
import test from "node:test";
import { highlight } from "./highlight.js";

test("escapes HTML in every mode", () => {
  const evil = '<img src=x onerror="alert(1)">';
  for (const lang of ["auto", "plaintext", "javascript", "nonsense"]) {
    const { html } = highlight(evil, lang);
    assert.ok(!html.includes("<img"), `unescaped in ${lang}`);
  }
});

test("highlights a chosen language and detects one automatically", () => {
  assert.match(highlight("const x = 1;", "javascript").html, /hljs-keyword/);
  assert.equal(highlight("def f(x):\n    return x + 1\n\nprint(f(2))", "auto").language, "python");
  assert.equal(highlight('print("hello from a phone")\nfor i in range(3):\n    print(i)', "auto").language, "python");
});
