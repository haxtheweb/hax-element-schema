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

- `tag` (required): HTML/custom-element tag name to create.
- `properties` (optional): key/value map of attributes and/or properties.
- `content` (optional): string content assigned as light DOM.
- `eventName` (optional): event metadata added by insertion pipelines.

See a concrete object example in [`example.json`](example.json).

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
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/utils/utils.js#L1207-L1314

- **DOM -> virtual DOM conversion**  
  `nodeToHaxElement(node, eventName)` serializes existing nodes into `HAXElementSchema`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/utils/utils.js#L1500-L1718

- **Prototype/factory creation of virtual DOM objects**  
  `haxElementPrototype(gizmo, properties, content)` returns `{ tag, properties, content, gizmo }`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js#L5102-L5109

- **Tray insertion pipeline dispatches virtual DOM payloads**  
  `hax-tray` resolves `demoSchema[0]` or builds a prototype object and dispatches it via `hax-insert-content`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-tray.js#L1081-L1136

- **Store insertion pipeline consumes virtual DOM payloads**  
  `_haxStoreInsertContent` consumes `detail.tag/content/properties` and converts to DOM via `haxElementToNode` for inline and replace flows.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js#L4067-L4192

- **Keyboard shortcuts are modeled as virtual DOM snippets**  
  Shortcut map entries are `HAXElementSchema`-style objects and are converted to nodes at runtime.  
  References:  
  - https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js#L2975-L2985  
  - https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/hax-body.js#L1852-L1878

- **Duplicate workflow round-trips through virtual DOM**  
  `haxDuplicateNode` converts DOM -> `HAXElementSchema` -> DOM to ensure clean cloning.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/hax-body.js#L2426-L2443

- **Dev helper insertion uses demoSchema virtual DOM**  
  `globalThis.Hax.add` inserts using `schema.demoSchema[0]` via `haxElementToNode`.  
  Reference: https://github.com/haxtheweb/webcomponents/blob/master/elements/hax-body/lib/hax-store.js#L5348-L5355

## Runtime conversion behavior
In HAX core, conversion happens primarily in:

- `haxElementToNode(haxSchema)` - converts schema object to a real DOM node.
- `nodeToHaxElement(node, eventName)` - converts a DOM node to schema.

Important behavior:

- Camel-cased property keys are converted to dash-cased attributes where needed.
- `true` sets boolean attributes, `false` removes them.
- Object/array values are set as properties when possible.
- `content` becomes light DOM (`innerHTML`) on conversion.
- `iframe` is rewritten to `webview` in sandboxed environments.

## JSON Schema
This repo includes [`hax-element-schema.schema.json`](hax-element-schema.schema.json), a machine-readable JSON Schema for validation and tooling support.

## Why this exists
- Keep `HAXElementSchema` documentation focused and easy to discover.
- Provide canonical examples for docs, tests, and tooling.
- Offer a shared reference for systems that import/export HAX element payloads.
