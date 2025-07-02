const fs = require("fs");
const path = require("path");

/**
 * Codemod to:
 * 1. Add .ts extensions to local imports
 * 2. Convert type-only imports to use "import type" syntax
 * Usage: npx jscodeshift -t ts-imports-optimizer.js --parser=tsx src/
 */
module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Helper function to determine if import is local (starts with . or ..)
  function isLocalImport(importPath) {
    return importPath.startsWith("./") || importPath.startsWith("../");
  }

  // Helper function to check if path already has an extension
  function hasExtension(importPath) {
    return path.extname(importPath) !== "";
  }

  // Helper function to analyze if an import is used only for types
  function isTypeOnlyImport(importDeclaration) {
    const specifiers = importDeclaration.specifiers || [];

    // If it's already a type import, skip
    if (importDeclaration.importKind === "type") {
      return false;
    }

    // Check each imported identifier to see if it's used only in type positions
    return specifiers.every((spec) => {
      if (spec.type === "ImportDefaultSpecifier") {
        return isIdentifierUsedOnlyAsType(spec.local.name);
      } else if (spec.type === "ImportSpecifier") {
        return isIdentifierUsedOnlyAsType(spec.local.name);
      }
      return false;
    });
  }

  // Helper function to check if an identifier is used only in type positions
  function isIdentifierUsedOnlyAsType(identifierName) {
    let isTypeOnly = true;

    // Find all references to this identifier
    root.find(j.Identifier, { name: identifierName }).forEach((path) => {
      const parent = path.parent;
      const grandParent = path.parent.parent;

      // Skip the import declaration itself
      if (
        parent.value.type === "ImportSpecifier" ||
        parent.value.type === "ImportDefaultSpecifier"
      ) {
        return;
      }

      // Check if it's used in type positions
      const isInTypePosition =
        // Type annotations: foo: SomeType
        parent.value.type === "TSTypeReference" ||
        // Generic type parameters: Array<SomeType>
        parent.value.type === "TSTypeParameterInstantiation" ||
        // Interface extends: interface Foo extends SomeType
        parent.value.type === "TSExpressionWithTypeArguments" ||
        // Type assertions: value as SomeType
        (parent.value.type === "TSTypeAssertion" && parent.value.typeAnnotation === path.value) ||
        // Function return types: (): SomeType => {}
        parent.value.type === "TSTypeAnnotation" ||
        // Variable type annotations: const x: SomeType
        (grandParent && grandParent.value.type === "TSTypeAnnotation") ||
        // Union/intersection types: SomeType | OtherType
        parent.value.type === "TSUnionType" ||
        parent.value.type === "TSIntersectionType" ||
        // Mapped types, conditional types, etc.
        parent.value.type === "TSMappedType" ||
        parent.value.type === "TSConditionalType";

      if (!isInTypePosition) {
        isTypeOnly = false;
      }
    });

    return isTypeOnly;
  }

  let hasChanges = false;

  // Transform import declarations
  root.find(j.ImportDeclaration).forEach((nodePath) => {
    const importPath = nodePath.value.source.value;

    // 1. Add .ts extension to local imports
    if (isLocalImport(importPath) && !hasExtension(importPath)) {
      nodePath.value.source.value = importPath + ".ts";
      hasChanges = true;
    }

    // 2. Convert to type-only import if all imports are types
    if (isTypeOnlyImport(nodePath.value)) {
      nodePath.value.importKind = "type";
      hasChanges = true;
    }
  });

  // Also handle individual import specifiers that could be type-only
  // Convert: import { SomeType, someValue } from 'module'
  // To: import { type SomeType, someValue } from 'module'
  root.find(j.ImportDeclaration).forEach((nodePath) => {
    const importDecl = nodePath.value;

    // Skip if already a type import
    if (importDecl.importKind === "type") {
      return;
    }

    let hasTypeSpecifiers = false;

    if (importDecl.specifiers) {
      importDecl.specifiers.forEach((spec) => {
        if (spec.type === "ImportSpecifier" && !spec.importKind) {
          if (isIdentifierUsedOnlyAsType(spec.local.name)) {
            spec.importKind = "type";
            hasTypeSpecifiers = true;
            hasChanges = true;
          }
        }
      });
    }
  });

  // Transform dynamic imports (add .ts extension)
  root
    .find(j.CallExpression, {
      callee: { type: "Import" },
    })
    .forEach((nodePath) => {
      const arg = nodePath.value.arguments[0];
      if (arg && arg.type === "Literal" && typeof arg.value === "string") {
        const importPath = arg.value;

        if (isLocalImport(importPath) && !hasExtension(importPath)) {
          arg.value = importPath + ".ts";
          hasChanges = true;
        }
      }
    });

  // Transform export ... from statements (add .ts extension)
  root.find(j.ExportNamedDeclaration).forEach((nodePath) => {
    if (nodePath.value.source) {
      const importPath = nodePath.value.source.value;

      if (isLocalImport(importPath) && !hasExtension(importPath)) {
        nodePath.value.source.value = importPath + ".ts";
        hasChanges = true;
      }
    }
  });

  // Transform export * from statements (add .ts extension)
  root.find(j.ExportAllDeclaration).forEach((nodePath) => {
    const importPath = nodePath.value.source.value;

    if (isLocalImport(importPath) && !hasExtension(importPath)) {
      nodePath.value.source.value = importPath + ".ts";
      hasChanges = true;
    }
  });

  return hasChanges ? root.toSource() : null;
};
