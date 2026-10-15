#!/usr/bin/env node
/**
 * Self-test: valid examples must pass with no warnings; files in
 * examples/invalid must produce the expected errors and warnings.
 */
const fs = require('fs')
const path = require('path')
const { buildValidator, validateDoc } = require('./validate.js')

const root = path.join(__dirname, '..')
const validate = buildValidator()
let failures = 0

const check = (file, expectValid, expectErrors = [], expectWarnings = []) => {
  const doc = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  const r = validateDoc(doc, validate)
  const errText = r.errors.map((e) => `${e.path}: ${e.message}`).join('\n')
  const warnText = r.warnings.map((w) => `${w.path}: ${w.message}`).join('\n')
  const okValid = expectValid ? r.errors.length === 0 && r.warnings.length === 0 : r.errors.length > 0
  const missing = expectErrors.filter((m) => !errText.includes(m))
    .concat(expectWarnings.filter((m) => !warnText.includes(m)).map((m) => `warning: ${m}`))
  if (!okValid || missing.length) {
    failures++
    console.log(`FAIL ${file}`)
    if (!okValid) console.log(`  errors:\n    ${errText.split('\n').join('\n    ')}\n  warnings:\n    ${warnText.split('\n').join('\n    ')}`)
    for (const m of missing) console.log(`  missing expected: ${m}`)
  } else {
    console.log(`ok   ${file}`)
  }
}

check('example.json', true)
check('example.haxProperties.json', true)
check('examples/minimal.json', true)
check('examples/slots.json', true)
check('examples/property-types.json', true)
check('examples/variants.json', true)
check('examples/invalid/common-mistakes.json', false, [
  '/tag: must match pattern',
  '("attributes"; prefix custom keys with "x-")',
  '/properties/citation: must be',
  'omit the key instead'
], [
  '"innerHTML" is ignored',
  'event-handler attribute "onclick" is always stripped',
  'both become the "image-alt" attribute',
  '<script> in content is escaped',
  'data: URLs are stripped from URL attributes like "poster-src"'
])
process.exitCode = failures ? 1 : 0
