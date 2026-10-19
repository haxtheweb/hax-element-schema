# hax-element-schema
Documentation for `HAXElementSchema`, the lightweight object format HAX uses as a virtual DOM representation before converting to real DOM nodes.

This is a companion repo to `hax-schema`. Where `hax-schema` explains the full `haxProperties` contract for element authoring, this repo focuses specifically on the element payload objects used in `demoSchema`, insertion, and conversion workflows.

## Core shape
`HAXElementSchema` is an object with this shape:

```json
{
  "tag": "my-tag",
  "properties": {
    "title": "Example title"
  },
  "content": "<p>Inner HTML content</p>",
  "eventName": "insert-element"
}
```

- `tag` (required): lowercase HTML or custom-element tag name to create.
- `properties` (optional): key/value map of attributes and/or properties (see [Runtime conversion behavior](#runtime-conversion-behavior)).
- `content` (optional): string content assigned as light DOM (`innerHTML`). Children can target named slots with `slot="name"`.
- `eventName` (optional): set by `nodeToHaxElement()` (default `insert-element`); not needed when authoring.
- `description` (optional): human label for one of several `demoSchema` variants. HAX core does not read it.
- `gizmo` (runtime only): attached by `haxElementPrototype()` when HAX builds a payload from search results. Never author it.
- `x-*` (optional): extension keys for tool-specific data. Every other key is rejected.

See a concrete object example in [`example.json`](example.json), and more in [`examples/`](examples).

## Machine-readable schema and validation

[`hax-element-schema.schema.json`](hax-element-schema.schema.json) is JSON Schema draft 2020-12. `scripts/validate.js` validates a single element, an array of elements, or every `demoSchema` entry of a haxProperties file, and adds warnings for runtime behavior a schema cannot express (ignored `innerHTML` keys, stripped `on*` attributes, two keys that dash-case to the same attribute, `<script>` in content).

From npm (no install needed):

```bash
npx -p @haxtheweb/hax-element-schema hax-element-validate my-element.haxProperties.json
```

From a clone:

```bash
npm install
node scripts/validate.js example.json examples/variants.json
node scripts/validate.js --json path/to/lib/my-element.haxProperties.json
npm test
```

Every `demoSchema` entry in the webcomponents monorepo (94 haxProperties files) passes.

## Rules for tools and agents writing HAXElementSchema

1. **Use `properties` for values and `content` for markup.** `innerHTML` / `innerText` keys are ignored, and `attributes` is not a key.
2. **Pick one spelling per value.** `mediaTitle` and `media-title` both become the `media-title` attribute, so use the camelCase JS property name.
3. **Never use `null`.** It is written as the literal attribute value `"null"`; omit the key instead.
4. **`false` removes an attribute; it does not set a property to false.** It cannot turn off a property whose default is `true` (for example awesome-explosion's `soundEnabled`), so check the element's defaults first.
5. **No event handlers, `srcdoc` or inline URLs.** `on*` attributes are always stripped, `srcdoc` is stripped from iframes, and `javascript:` / `vbscript:` / `data:` URLs are stripped from URL attributes, so reference files (`files/photo.jpg`) instead of embedding them.
6. **Inside haxProperties, the first `demoSchema` entry is what HAX inserts**, so it should be a complete, good-looking default. Validate with `scripts/validate.js` after editing.

## Relationship to haxProperties
Inside a `haxProperties` file, `demoSchema` is an array of `HAXElementSchema` objects:

```json
{
  "demoSchema": [
    {
      "tag": "block-quote",
      "properties": {
        "citation": "Padmé Amidala: Star wars, Episode II"
      },
      "content": "<p>So this is how liberty dies... with thunderous applause</p>"
    }
  ]
}
```

See [`example.haxProperties.json`](example.haxProperties.json) for a full sample.

## HAXElementSchema as virtual DOM (with source references)
HAX uses this object shape as a lightweight virtual DOM payload during authoring operations. The object is passed around, transformed, and only materialized into actual nodes at insertion/render time.

Primary usage points in core:

- **Virtual DOM -> DOM conversion**  
  `haxElementToNode(haxSchema)` creates real nodes from `tag`, `properties`, and `content`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/utils/utils.js

- **DOM -> virtual DOM conversion**  
  `nodeToHaxElement(node, eventName)` serializes existing nodes into `HAXElementSchema`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/utils/utils.js

- **Prototype/factory creation of virtual DOM objects**  
  `haxElementPrototype(gizmo, properties, content)` returns `{ tag, properties, content, gizmo }`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js

- **Tray insertion pipeline dispatches virtual DOM payloads**  
  `hax-tray` resolves `demoSchema[0]` or builds a prototype object and dispatches it via `hax-insert-content`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-tray.js

- **Store insertion pipeline consumes virtual DOM payloads**  
  `_haxStoreInsertContent` consumes `detail.tag/content/properties` and converts to DOM via `haxElementToNode` for inline and replace flows.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js

- **Keyboard shortcuts are modeled as virtual DOM snippets**  
  Shortcut map entries are `HAXElementSchema`-style objects and are converted to nodes at runtime.  
  References:  
  - https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js  
  - https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/hax-body.js

- **Duplicate workflow round-trips through virtual DOM**  
  `haxDuplicateNode` converts DOM -> `HAXElementSchema` -> DOM to ensure clean cloning.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/hax-body.js

- **Dev helper insertion uses demoSchema virtual DOM**  
  `globalThis.Hax.add` inserts using `schema.demoSchema[0]` via `haxElementToNode`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js

## Runtime conversion behavior
In HAX core, conversion happens primarily in:

- `haxElementToNode(haxSchema)` - converts schema object to a real DOM node.
- `nodeToHaxElement(node, eventName)` - converts a DOM node to schema.

Important behavior:

| `properties` value | What `haxElementToNode()` does |
| --- | --- |
| string / number | `setAttribute(dash-case(key), value)` |
| `true` | sets the boolean attribute |
| `false` | removes the attribute (it does **not** set the property to `false`) |
| array / plain object | assigned as an element property instead of an attribute |
| `null` | written as the string `"null"`; avoid |
| `innerHTML` / `innerText` key | ignored; use `content` |
| `on*` key | always stripped (along with any `on*` attribute that appears in `content`) |
| `srcdoc` on `iframe` / `webview` | stripped |
| `javascript:` / `vbscript:` / `data:` value in a URL attribute (`src`, `href`, `poster`, `*-src`, `*-url`, ...) | attribute stripped, here and in `content` |

- `content` becomes light DOM (`innerHTML`) on conversion.
- `iframe` is rewritten to `webview` in sandboxed (desktop) environments.
- `nodeToHaxElement()` goes the other way: it reads the node's declared properties and attributes into `properties`, its light DOM into `content`, and sets `eventName`.

## JSON Schema
This repo includes [`hax-element-schema.schema.json`](hax-element-schema.schema.json), a machine-readable JSON Schema for validation and tooling support.

## Why this exists
- Keep `HAXElementSchema` documentation focused and easy to discover.
- Provide canonical examples for docs, tests, and tooling.
- Offer a shared reference for systems that import/export HAX element payloads.

## Releasing

This package is versioned with the rest of the HAX ecosystem and is published by the ubiquity release (`scripts/ubiquity-push.sh` in haxtheweb/webcomponents), which runs `commit-and-tag-version --release-as <ecosystem version>`, pushes the tag and runs `npm publish`. To cut a release of just this package, run `npm run release` (tests, bumps the version and CHANGELOG, tags, pushes to `master`, publishes).
