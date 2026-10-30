`HAXElementSchema` is the lightweight object format HAX uses as a virtual DOM representation before converting to real DOM nodes.

This is a companion spec to [hax-schema](https://haxtheweb.github.io/hax-schema/). Where `hax-schema` explains the full `haxProperties` contract for element authoring, this site focuses specifically on the element payload objects used in `demoSchema`, insertion, and conversion workflows.

Core shape
----------

`HAXElementSchema` is an object with this shape:

<a11y-collapse heading-button="heading-button"><h2 slot="heading">Field reference</h2><div slot="content"><ul><li><strong>tag</strong> (required): HTML/custom-element tag name to create.</li><li><strong>properties</strong> (optional): key/value map of attributes and/or properties.</li><li><strong>content</strong> (optional): string content assigned as light DOM.</li><li><strong>eventName</strong> (optional): event metadata added by insertion pipelines.</li></ul></div></a11y-collapse>

See a concrete object example below: