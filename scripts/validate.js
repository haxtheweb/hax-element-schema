#!/usr/bin/env node
/**
 * Validate HAXElementSchema payloads.
 *
 * Usage:
 *   node scripts/validate.js [--json] [--strict] <file> [file...]
 *
 * Each file may hold one element object, an array of element objects, or a
 * haxProperties document (every `demoSchema` entry is validated).
 *
 * --json    machine-readable report (one object per file)
 * --strict  treat warnings as errors
 * Exit code: 0 when every file is valid, 1 otherwise.
 */
const fs = require('fs')
const path = require('path')
const Ajv2020 = require('ajv/dist/2020')

const SCHEMA = path.join(__dirname, '..', 'hax-element-schema.schema.json')

function buildValidator () {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  return ajv.compile(JSON.parse(fs.readFileSync(SCHEMA, 'utf8')))
}

// mirrors isURLAttribute / badURLProtocols in webcomponents elements/utils
const URL_ATTRS = ['src', 'srcset', 'source', 'url', 'link-url', 'href', 'xlink:href', 'action', 'formaction', 'poster', 'data', 'cite']
const isURLAttribute = (name) => URL_ATTRS.includes(name) || /(^|[-_:])(src|source|href|url)$/.test(name)
const UNSAFE_PROTOCOL = /^\s*(javascript|vbscript|data):/i

const camelToDash = (s) => s.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()

/** Locate the element objects inside a document, with their JSON pointer. */
function collect (doc) {
  if (Array.isArray(doc)) return { kind: 'array', items: doc.map((el, i) => ({ el, at: `/${i}` })) }
  const looksLikeHaxProperties = doc && typeof doc === 'object' && typeof doc.tag === 'undefined' &&
    ['demoSchema', 'settings', 'gizmo', 'api'].some((k) => k in doc)
  if (looksLikeHaxProperties) {
    const demos = Array.isArray(doc.demoSchema) ? doc.demoSchema : []
    return { kind: 'haxProperties', items: demos.map((el, i) => ({ el, at: `/demoSchema/${i}` })) }
  }
  return { kind: 'element', items: [{ el: doc, at: '' }] }
}

/** Behavior checks JSON Schema cannot express. */
function behaviorChecks (el, at) {
  const warnings = []
  if (!el || typeof el !== 'object') return warnings
  const props = el.properties && typeof el.properties === 'object' ? el.properties : {}
  const seen = new Map()
  for (const key of Object.keys(props)) {
    const p = `${at}/properties/${key}`
    if (key === 'innerHTML' || key === 'innerText') {
      warnings.push({ path: p, message: `"${key}" is ignored by haxElementToNode; put markup in "content"` })
      continue
    }
    if (/^on[a-z]+$/i.test(key)) {
      warnings.push({ path: p, message: `event-handler attribute "${key}" is always stripped` })
    }
    if (typeof el.tag === 'string' && ['iframe', 'webview'].includes(el.tag) && camelToDash(key) === 'srcdoc') {
      warnings.push({ path: p, message: '"srcdoc" is stripped from iframes; use "src"' })
    }
    const attr = camelToDash(key)
    if (isURLAttribute(attr) && typeof props[key] === 'string' && UNSAFE_PROTOCOL.test(props[key])) {
      warnings.push({ path: p, message: `javascript:, vbscript: and data: URLs are stripped from URL attributes like "${attr}"; reference a file instead` })
    }
    if (seen.has(attr)) {
      warnings.push({ path: p, message: `"${key}" and "${seen.get(attr)}" both become the "${attr}" attribute; keep one` })
    } else {
      seen.set(attr, key)
    }
  }
  if (typeof el.content === 'string' && /\s(?:[\w:-]*(?:src|href|source|url)|poster|action|formaction|cite|data)\s*=\s*["']?\s*(javascript|vbscript|data):/i.test(el.content)) {
    warnings.push({ path: `${at}/content`, message: 'javascript:, vbscript: and data: URLs in content attributes are stripped' })
  }
  if (typeof el.content === 'string' && /<script[\s>]/i.test(el.content)) {
    warnings.push({ path: `${at}/content`, message: '<script> in content is escaped by HAX and will not run' })
  }
  if (el.gizmo) {
    warnings.push({ path: `${at}/gizmo`, message: 'gizmo is attached at runtime by haxElementPrototype(); do not author it' })
  }
  return warnings
}

function formatAjv (errors, at) {
  return (errors || []).map((e) => {
    let msg = e.message
    if (e.params && e.params.additionalProperty) msg += ` ("${e.params.additionalProperty}"; prefix custom keys with "x-")`
    if (/\/properties\/[^/]+$/.test(e.instancePath) && e.keyword === 'type') msg += ' (null is written as the string "null"; omit the key instead)'
    return { path: `${at}${e.instancePath}` || '/', message: msg }
  })
}

function validateDoc (doc, validate) {
  const { kind, items } = collect(doc)
  let errors = []
  let warnings = []
  if (kind === 'haxProperties' && items.length === 0) {
    warnings.push({ path: '/demoSchema', message: 'no demoSchema entries to validate' })
  }
  for (const { el, at } of items) {
    validate(el)
    errors = errors.concat(formatAjv(validate.errors, at))
    warnings = warnings.concat(behaviorChecks(el, at))
  }
  return { kind, count: items.length, errors, warnings }
}

function main (argv) {
  const args = argv.slice(2)
  let asJson = false
  let strict = false
  const files = []
  for (const a of args) {
    if (a === '--json') asJson = true
    else if (a === '--strict') strict = true
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0])
      return 0
    } else files.push(a)
  }
  if (!files.length) {
    console.error('usage: validate.js [--json] [--strict] <file> [file...]')
    return 2
  }
  const validate = buildValidator()
  const reports = files.map((file) => {
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      return { file, kind: null, valid: false, errors: [{ path: '/', message: `cannot read JSON: ${e.message}` }], warnings: [] }
    }
    const r = validateDoc(doc, validate)
    return { file, ...r, valid: r.errors.length === 0 && (!strict || r.warnings.length === 0) }
  })
  if (asJson) console.log(JSON.stringify(reports, null, 2))
  else {
    for (const r of reports) {
      console.log(`${r.valid ? 'PASS' : 'FAIL'} ${r.file}${r.kind ? ` (${r.kind}${r.kind !== 'element' ? `, ${r.count} element(s)` : ''})` : ''}`)
      for (const e of r.errors) console.log(`  error   ${e.path}: ${e.message}`)
      for (const w of r.warnings) console.log(`  warning ${w.path}: ${w.message}`)
    }
  }
  return reports.every((r) => r.valid) ? 0 : 1
}

module.exports = { buildValidator, validateDoc, behaviorChecks }

if (require.main === module) {
  process.exitCode = main(process.argv)
}
