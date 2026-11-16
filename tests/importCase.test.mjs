import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
function filesIn(directory) {
  return readdirSync(path.join(root, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const name = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesIn(name) : [name];
  });
}
const files = filesIn("src");
const exact = new Set(files);
const candidates = (target) => [
  target,
  ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].map(
    (suffix) => target + suffix,
  ),
];
function relativeModules(name) {
  const source = ts.createSourceFile(
    name,
    readFileSync(path.join(root, name), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const modules = [];
  function visit(node) {
    const specifier =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? node.arguments[0]
          : undefined;
    if (
      specifier &&
      ts.isStringLiteral(specifier) &&
      specifier.text.startsWith(".")
    ) {
      modules.push(specifier.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return modules;
}

test("relative source imports resolve with exact case even on Windows", () => {
  const invalid = [];
  for (const name of files.filter((name) => /\.[cm]?[jt]sx?$/.test(name))) {
    for (const specifier of relativeModules(name)) {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(name), specifier),
      );
      if (!candidates(target).some((name) => exact.has(name)))
        invalid.push(`${name}: ${specifier}`);
    }
  }
  assert.deepEqual(
    invalid,
    [],
    "Linux/Vercel must resolve the same modules as local development",
  );
});

test("shared icons have one canonical directory and a single catalog", () => {
  const icons = files.filter((name) =>
    name.toLowerCase().startsWith("src/shared/icons/"),
  );
  assert.ok(icons.length > 0);
  assert.ok(icons.every((name) => name.startsWith("src/shared/icons/")));
  assert.equal(
    new Set(files.map((name) => name.toLowerCase())).size,
    files.length,
  );
  assert.deepEqual(
    icons.filter((name) => /icon-catalog/i.test(name)),
    ["src/shared/icons/icon-catalog.ts"],
  );
});
