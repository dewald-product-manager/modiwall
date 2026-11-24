/* The one way this site turns a string into markup. The CSP enforces Trusted Types, so any other
   innerHTML assignment throws instead of running. Only pass fixed strings written in this code. */
const policy = globalThis.trustedTypes?.createPolicy('modiwall', { createHTML: (s) => s });

export const html = (s) => (policy ? policy.createHTML(s) : s);
