/**
 * Reading the STRUCTURE of a module, instead of its text.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 *
 * Three independent reviews rejected the same family in a row, and the third
 * one named what the two previous fixes had in common: the guard scanned the
 * source LINE BY LINE. A line is not a statement. An import spread over several
 * lines has no line that both starts with `import` and carries its `from`, so
 * it matched nothing; a dynamic `await import('...')` starts with neither.
 *
 * That was not hypothetical. The gatekeeper reaches `y-indexeddb` through a
 * dynamic import, so the library that opens the CRDT database was ABSENT from
 * the list the guard derived from it -- any module could have imported it and
 * the guard would have stayed green.
 *
 * So the mechanism changes rather than the pattern. The TypeScript parser
 * answers the two questions the regexes were approximating:
 *   - which modules does this file pull in AT RUNTIME (however it is written);
 *   - does this file REFERENCE a storage global (as a value, not as a word).
 *
 * A parser has no blind spot in the shape of the syntax, because the shape is
 * what it is built to read. Comments and strings stop being special cases:
 * they are not identifiers, so they never reach anything.
 */

import ts from 'typescript';

/** Where a forbidden name was reached, for a message a human can act on. */
export interface Reach {
  readonly line: number;
  readonly text: string;
}

function parse(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/** True when the whole import/export clause vanishes at compile time. */
function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  // `import 'x';` — a side effect, and running it is exactly the risk.
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false; // a default binding is a value
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    // `import { type A, type B } from 'x'` erases entirely; one value keeps it.
    return bindings.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

function isTypeOnlyReExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  if (clause && ts.isNamedExports(clause)) {
    return clause.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

/**
 * Every module specifier this file pulls in at RUNTIME, in any syntax.
 *
 * Covers what the line reader missed: an import spread over several lines, a
 * dynamic `import()`, a `require()`, and a re-export -- which reaches the
 * library just as surely as an import does, and hands it to someone else.
 *
 * `import type` is absent on purpose, everywhere. A type reaches nothing: it
 * disappears at compile time, and that is the whole difference that matters.
 */
export function runtimeModuleSpecifiers(source: string, fileName = 'module.ts'): string[] {
  const found = new Set<string>();
  walk(parse(fileName, source), (node) => {
    if (ts.isImportDeclaration(node)) {
      if (isTypeOnlyImport(node)) return;
      if (ts.isStringLiteral(node.moduleSpecifier)) found.add(node.moduleSpecifier.text);
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (isTypeOnlyReExport(node)) return;
      if (ts.isStringLiteral(node.moduleSpecifier)) found.add(node.moduleSpecifier.text);
      return;
    }
    if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (!isDynamicImport && !isRequire) return;
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteral(argument)) found.add(argument.text);
    }
  });
  return [...found];
}

/** Package specifiers only — our own relative modules are not libraries. */
export function runtimeLibraries(source: string, fileName = 'module.ts'): string[] {
  return runtimeModuleSpecifiers(source, fileName).filter(
    (specifier) => !specifier.startsWith('.'),
  );
}

/**
 * True when this identifier is the name being DECLARED, not a value reached.
 *
 * `const localStorageRaw = ...` was flagged by the first text guard, and a
 * guard that gets in the way of legitimate work is a guard someone switches
 * off. The parser makes the distinction structural: a binding position is a
 * different place in the tree, not a different spelling.
 */
function isDeclarationName(node: ts.Identifier): boolean {
  const parent = node.parent as ts.Node | undefined;
  if (!parent) return false;
  if (
    ts.isVariableDeclaration(parent) ||
    ts.isParameter(parent) ||
    ts.isBindingElement(parent) ||
    ts.isFunctionDeclaration(parent) ||
    ts.isClassDeclaration(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isPropertyAssignment(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isEnumMember(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent)
  ) {
    return parent.name === node;
  }
  return false;
}

/**
 * A key written as text, in `something['localStorage']`.
 *
 * Found by the review of 2026-09-03, and executed rather than argued: the check
 * below used to visit identifiers only, so writing the name as a STRING slipped
 * past it while reaching exactly the same store at runtime. `obj.localStorage`
 * and `obj['localStorage']` are the same gesture spelled two ways.
 *
 * A plain string elsewhere stays innocent -- `'localStorage:theme'` as a
 * storage key is a word, not a door. What makes this one a door is its
 * POSITION: the key of a member access.
 */
function isComputedKey(node: ts.Node, names: readonly string[]): boolean {
  if (!ts.isElementAccessExpression(node)) return false;
  const key = node.argumentExpression;
  if (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) {
    return names.includes(key.text);
  }
  return false;
}

/**
 * Every place this file references one of `names` as a VALUE.
 *
 * `window.localStorage` counts, and so does `window['localStorage']`: a member
 * access on any object still reaches the store, however the key is spelled. A
 * string used as anything else does not -- it is a word, not a door.
 *
 * The honest limit, worth knowing before trusting a green: reading source can
 * always be defeated by a name assembled at runtime (`obj[a + b]`). Nothing
 * that reads text can see through that, which is why a trap watches the lock
 * itself while the suite runs -- see `tests/storage-door/runtime-trap.ts`.
 */
export function globalReaches(
  source: string,
  names: readonly string[],
  fileName = 'module.ts',
): Reach[] {
  const file = parse(fileName, source);
  const found: Reach[] = [];
  const record = (node: ts.Node): void => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    const text = source.split(/\r?\n/)[line]?.trim() ?? '';
    found.push({ line: line + 1, text: text.slice(0, 90) });
  };
  walk(file, (node) => {
    if (isComputedKey(node, names)) {
      record(node);
      return;
    }
    if (!ts.isIdentifier(node)) return;
    if (!names.includes(node.text)) return;
    if (isDeclarationName(node)) return;
    record(node);
  });
  return found;
}
