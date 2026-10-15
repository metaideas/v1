// `shiki/core` resolves to a WebAssembly entry under Nitro's `unwasm` export condition, which the
// Vite SSR build cannot bundle, so import the core it re-exports.
import { createHighlighterCore, type GrammarState, type HighlighterCore } from "@shikijs/core"
import * as React from "react"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

// Add the languages you need. Each one loads the first time it is used.
const languages = {
  bash: () => import("shiki/langs/shellscript.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
}

const aliases: Record<string, keyof typeof languages> = {
  js: "javascript",
  md: "markdown",
  py: "python",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  ts: "typescript",
  yml: "yaml",
  zsh: "bash",
}

let highlighter: Promise<HighlighterCore> | undefined

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine({ forgiving: true }),
    langs: [],
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
  })

  return highlighter
}

function isListedLanguage(name: string): name is keyof typeof languages {
  return Object.hasOwn(languages, name)
}

function getLanguage(language: string) {
  const name = language.toLowerCase()

  if (name === "ansi") {
    return name
  }

  if (isListedLanguage(name)) {
    return name
  }

  return aliases[name] ?? null
}

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
  const lang = getLanguage(language)

  if (!lang) {
    return null
  }

  const shiki = await getHighlighter()

  if (lang !== "ansi" && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang])
  }

  return {
    // Returns one React node per line, and the grammar state after the last
    // line. Pass that state back to continue where the code left off.
    highlight(code: string, state?: GrammarState) {
      const { tokens } = shiki.codeToTokens(code, {
        defaultColor: false,
        grammarState: state,
        lang,
        themes: { dark: "github-dark", light: "github-light" },
      })

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => (
            <span
              // oxlint-disable-next-line react/no-array-index-key -- Tokens have no identity apart from their position in the line.
              key={index}
              style={token.htmlStyle}
              className="text-(--shiki-light) dark:text-(--shiki-dark)"
            >
              {token.content}
            </span>
          ))
        ),
        state: shiki.getLastGrammarState(tokens),
      }
    },
    // ANSI colors carry across lines but have no grammar state to resume
    // from, so ANSI is always tokenized from the start.
    incremental: lang !== "ansi",
  }
}
