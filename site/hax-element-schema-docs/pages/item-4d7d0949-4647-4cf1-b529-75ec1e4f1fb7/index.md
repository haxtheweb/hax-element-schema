Runtime conversion behavior
---------------------------

In HAX core, conversion happens primarily in two functions:

*   `haxElementToNode(haxSchema)` — converts a schema object to a real DOM node.
*   `nodeToHaxElement(node, eventName)` — converts a DOM node to a schema object.

Important behavior to be aware of:

*   Camel-cased property keys are converted to dash-cased attributes where needed.
*   `true` sets boolean attributes, `false` removes them.
*   Object/array values are set as properties when possible.
*   `content` becomes light DOM (`innerHTML`) on conversion.
*   `iframe` is rewritten to `webview` in sandboxed environments.

JSON Schema
-----------

This spec includes a machine-readable JSON Schema, `hax-element-schema.schema.json`, for validation and tooling support against the [repository source](https://github.com/haxtheweb/hax-element-schema/blob/master/hax-element-schema.schema.json).

Why this exists
---------------

*   Keep `HAXElementSchema` documentation focused and easy to discover.
*   Provide canonical examples for docs, tests, and tooling.
*   Offer a shared reference for systems that import/export HAX element payloads.