import { html, unsafeStatic } from 'lit/static-html.js';
import { getNativeEventName } from 'src/utils/eventUtils';
import type { ElementRegistry } from 'src/types';

export function getHTMLTag(type, registry: ElementRegistry) {
    if (window.customElements.get(type)) {
        // If this is the tag of a registered custom element, allow it to be used.
        // This is deemed unsafe because we're injecting html tags using dynamic user-generated content,
        // which is typically an XSS vector; but considering we're only doing it for
        // registered custom elements, I think it's (probably) fine.
        // Note that only user-defined custom elements will fall here;
        // Twixt "primitives" like `twixt-button` get handled below, since the `type` is 'button'.
        return unsafeStatic(type);
    }
    // Fallback to the registry's default element.
    return registry[type] || registry.default;
}

// Parse JSX-friendly props into their corresponding Lit expression.
// https://lit.dev/docs/templates/expressions/
export function parseProps(type, props, registry: ElementRegistry) {
    const parsedProps = {};
    let eventName;

    for (const propName of Object.keys(props)) {
        // If the type is the element registry, we consider it a "primitive".
        // In DOM, these will be your `button`s, `div`s, etc.
        // in Canvas, these would be `twixt-button`, `twixt-div`, etc.
        if (registry[type]) {
            // We don't want to automatically attach events to the top-level node of non-primitives (i.e user-defined custom elements).
            // Meaning, <MyCustomElement onClick={...} /> should _not_ automatically
            // get a click handler on its top node - it should be up to <MyCustomElement />'s implementation
            // to decide how (or if) it should handle a received prop that _happens_ to be named "onClick".
            eventName = getNativeEventName(propName);
            if (eventName) {
                parsedProps[`@${eventName}`] = props[propName];
            } else if (typeof props[propName] === 'boolean') {
                // Likewise, don't set attributes on non-primitives, just forward the props.
                parsedProps[`?${propName}`] = props[propName];
            }
        }
        // Forward the prop to the element.
        parsedProps[`.${propName}`] = props[propName];
    };

    return parsedProps;
}

// Handle any type-based overrides to the children's Lit expression, if any.
// Useful if, for example, a custom element registry needs to handle text in any special way.
export function parseChildren(children = [], registry: ElementRegistry) {
    const parsedChildren = [];
    for (const child of children) {
        const wrapper = registry[typeof child];
        parsedChildren.push(wrapper
            ? html`<${wrapper}>${child}</${wrapper}>`
            : child
        );
    }
    return parsedChildren;
}