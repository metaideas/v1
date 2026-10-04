import {
  generateCode,
  type ImportItemInput,
  type ProxifiedImportItem,
  type ProxifiedModule,
  parseModule,
} from "magicast"

function getProgram(mod: ProxifiedModule) {
  if (mod.$ast.type !== "Program") {
    throw new Error(`Expected a module, received ${mod.$ast.type}.`)
  }

  return mod.$ast
}

function checkIsValueImport(item: ProxifiedImportItem) {
  return (
    item.$declaration.importKind !== "type"
    && !("importKind" in item.$ast && item.$ast.importKind === "type")
  )
}

// Magicast merges a new specifier into the first declaration from the same module, so merge only
// when that declaration can hold it: a value import without a namespace or a second default.
function checkCanMerge(mod: ProxifiedModule, item: ImportItemInput) {
  const target = mod.imports.$items.find((existing) => existing.from === item.from)
  if (!target || item.imported === "*" || target.$declaration.importKind === "type") return false

  return mod.imports.$items
    .filter((existing) => existing.$declaration === target.$declaration)
    .every(
      ({ imported }) => imported !== "*" && (item.imported !== "default" || imported !== "default")
    )
}

// Magicast builds the declaration without a source location, so the printer separates it from the
// statement that follows instead of reusing text from another parse.
function insertImport(mod: ProxifiedModule, item: ImportItemInput) {
  const program = getProgram(mod)
  const scratch = parseModule("")
  scratch.imports.$append(item)
  const declaration = getProgram(scratch).body.at(0)
  if (!declaration) throw new Error(`Could not build an import from ${item.from}.`)

  const lastImport = program.body.findLastIndex((node) => node.type === "ImportDeclaration")
  program.body.splice(lastImport + 1, 0, declaration)
}

// Returns undefined when a local name the edit needs already refers to another binding.
export function addImports(source: string, imports: readonly ImportItemInput[]) {
  const mod = parseModule(source)

  for (const item of imports) {
    const local = item.local ?? item.imported
    const binding = mod.imports.$items.find((existing) => existing.local === local)

    if (binding) {
      const isSameBinding =
        binding.from === item.from
        && binding.imported === item.imported
        && checkIsValueImport(binding)
      if (!isSameBinding) return

      continue
    }

    if (checkCanMerge(mod, item)) {
      mod.imports.$append(item)
    } else {
      insertImport(mod, item)
    }
  }

  return `${generateCode(mod).code.trimEnd()}\n`
}
