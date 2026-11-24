
const policy = globalThis.trustedTypes?.createPolicy('modiwall', { createHTML: (s) => s });
export const html = (s) => (policy ? policy.createHTML(s) : s);
