# GitHub Copilot Instructions — GOV.UK Prototype Kit App

These instructions guide effective prompting and safe code generation in any GOV.UK Prototype Kit (GPK) service exploration. They are intentionally generic and should not mirror domain‑specific quirks from this repository. Apply GOV.UK Design System (GDS) and Service Manual guidance; only change major GDS versions when explicitly requested.

---
## 1. Scope & Philosophy
Prototypes exist to validate user needs, content, interaction, information architecture, and accessibility—not to build production systems. Keep code disposable, minimal, and comprehensible. Every addition should answer a research question or remove ambiguity.

---
## 2. Version & Dependency Policy
Pinned major versions:
- GOV.UK Prototype Kit: keep existing major (v13) unless user explicitly asks to upgrade.
- GOV.UK Frontend: do not bump major without explicit instruction (stay within current major 5.x).
- Ancillary libraries (e.g. MOJ Frontend): same rule—no major upgrade silently.

When suggesting updates: provide rationale (security fix, accessibility improvement, deprecated API) and require explicit confirmation before changing a major version.

---
## 3. Core Principles
• Start with user needs (first Government Design Principle).
2. One thing per page; simplify cognitive load.
3. Progressive enhancement: everything works without JavaScript.
4. Accessibility by design: structure / semantics first, styling second.
5. Reuse before inventing: choose existing patterns; only diverge with documented evidence.
6. Minimise data: store only necessary temporary state in session; purge when not needed.
7. Embrace iteration: small patches > large rewrites.
8. Readability over cleverness: junior team members should understand flows quickly.

---
## 4. Suggested Workflow
1. Define user need & success measure.
2. List pages, their single question/task, and session keys.
3. Identify existing GDS patterns covering each need; note gaps.
4. Draft content (plain English, active voice, avoids jargon).
5. Implement minimal route + template; add validation & accessibility hooks.
6. Test with users (or internal review) → capture observations.
7. Iterate: remove, refine, or extend.

---
## 5. Page Creation Checklist
Use or adapt this for every new page:
1. Filename: kebab-case (`add-delivery-address.html`).
2. Location: appropriate phase folder (`alpha` for exploration, `beta` for refinement, `gamma` for latest canonical journey).
3. Layout: `govuk-grid-row` + `govuk-grid-column-two-thirds` main area.
4. Title & H1: Concise task or question; page title starts with H1 wording.
5. Form: single purpose; group related fields only if required to answer one question.
6. Validation: server-side (mandatory fields, format, conditional logic). Rerender same template with error summary.
7. Error Summary: first interactive element (auto focus); each link maps directly to input ID.
8. Field errors: `aria-describedby` linking input → hint + error message IDs.
9. Session persistence: `req.session.data['key-name']`; initialise arrays with `|| []`.
10. Redirect: next logical step or return loop if incomplete.
11. Accessibility: heading hierarchy, landmarks, focus order preserved after dynamic actions.
12. Optional test: if adding JS enhancement, include at least one keyboard interaction test + axe scan.

---
## 6. Routes & Coding Patterns
Minimal POST pattern with early return:
```javascript
router.post('/gamma/example', (req, res) => {
  const answer = req.body['example-answer']
  if (!answer) return res.redirect('/gamma/example')
  req.session.data['example-answer'] = answer
  return res.redirect('/gamma/next-step')
})
```
Array deletion:
```javascript
const items = req.session.data['items'] || []
items.splice(index, 1)
req.session.data['items'] = items
```
Avoid deep nesting—prefer small helpers:
```javascript
function storeSingle(req, key, value){
  if (value == null || value === '') return false
  req.session.data[key] = value
  return true
}
```

---
## 7. Session Data Guidelines
| Guideline | Rationale |
|-----------|-----------|
| Short-lived | Reduces risk of stale data influencing later steps |
| Primitive/simple structures | Easier to inspect in templates |
| Consistent naming (kebab or snake case) | Improves readability & reduces typos |
| Validate before write | Prevents storing unusable data |
| Clear arrays after deletions or resets | Avoids orphaned entries |

Never store real personal data—use synthetic, minimal placeholders.

---
## 8. Accessibility Essentials
1. Always provide descriptive page titles (`<title>` matches H1 + service name suffix if needed).
2. Use semantic elements (fieldset/legend for grouped inputs, list semantics for enumerations).
3. Ensure error summary appears before main content and receives focus.
4. Provide visible keyboard focus states (default GOV.UK styles acceptable).
5. Test with axe, keyboard-only navigation, and where possible screen reader smoke test (NVDA / VoiceOver).
6. Avoid custom controls unless necessary; native elements with GOV.UK styling are preferable.
7. Manage focus when adding/removing dynamic content (e.g., move focus to heading or the newly added item container).

---
## 9. GDS Component Usage
| Component Need | Recommended Pattern |
|----------------|---------------------|
| Multi-step progress | Task list component + Complete multiple tasks pattern |
| Summary of entries | Summary list (with visually hidden change text) |
| Data input validation | Error summary + inline error messages |
| Date input (basic) | Three separate day/month/year inputs |
| Enhanced date selection | Optional progressive enhancement—fallback remains plain inputs |

Do not reinvent patterns without research evidence; link to official docs when proposing divergence.

---
## 10. Sass / CSS Guidelines
1. Single entry stylesheet (`application.scss`) importing partials.
2. Namespace custom additions with `.app-` to avoid clashes.
3. Avoid overriding core GOV.UK variables globally; create modifiers or utility classes.
4. Consolidate duplicate declarations; prefer composition.
5. Keep print considerations (legible fonts, removed non-essential decoration) for key summary pages.

---
## 11. JavaScript Progressive Enhancement
Principles:
* No JS: All critical tasks still achievable.
* Enhancement layer: attached via `data-module` attribute or explicit instantiation after `initAll()`.
* Accessibility: roles, labels, focus traps, keyboard navigation (Tab, Shift+Tab, Escape) implemented and tested.
* Error resilience: fail silently—if enhancement breaks, form stays usable.

Testing snippet pattern:
```javascript
import { getByRole } from '@testing-library/dom'
import { configureAxe } from 'jest-axe'
// create component DOM, instantiate, run axe, assert keyboard interactions
```

---
## 12. Testing Strategy (Prototype Level)
Minimum recommended for custom JS:
1. Initialiser renders expected interactive elements.
2. Keyboard navigation (focus order) works.
3. Axe scan has no serious violations.
4. Basic state change (e.g., add/remove item) reflected in DOM.

Prefer fast, deterministic tests; avoid network calls and complex mocks.

---
## 13. Refactoring Triggers
Refactor when ANY of:
* ≥3 identical or near-identical blocks.
* Long route handlers (> ~25 lines) containing repeated parsing.
* Sass declaration duplication more than twice.
* Session keys inconsistently named (mix of camelCase/kebab-case).

Refactor approach:
1. Identify repetition & target function scope.
2. Write tiny helper (pure if possible).
3. Patch one usage; verify behaviour.
4. Migrate remaining usages incrementally.

---
## 14. Prompt Patterns (Generic)
1. "List pages, data keys, and validation rules for a prototype journey collecting user contact details (generic)."
2. "Generate a route + template for a yes/no branching question using error summary pattern."
3. "Refactor duplicate array push logic in routes into a helper—show patch diff only."
4. "Suggest a patch removing duplicate Sass typography declarations while preserving media queries."
5. "Create a date formatting Nunjucks filter and apply it in a generic check-your-answers template—show diffs."
6. "Accessibility audit checklist for a new dynamic add/remove list component (WCAG 2.2 AA)."
7. "Provide a keyboard interaction test skeleton for a modal enhancement using jest-axe + Testing Library."

Meta-prompt:
"Before coding, summarise user need, pages, keys, validation, accessibility risks, and small refactors. Then output minimal diffs only."

---
## 15. Anti-Patterns (Avoid)
| Anti-Pattern | Why Avoid |
|--------------|-----------|
| Large monolithic route logic | Hard to iterate quickly |
| Silent validation failures | Users unclear why blocked |
| Inline styles or component rewrites | Inconsistent and brittle |
| Excess JS for simple tasks | Increases complexity & risk |
| Storing full objects of test data | Bloats session, obscures key needs |

---
## 16. Maintaining These Instructions
When dependencies or patterns change:
1. List changes (versions, new helpers, deprecated patterns).
2. Confirm major versions unchanged unless explicitly approved.
3. Update examples to reflect new patterns (keep them generic).
4. Remove outdated or domain-specific references.
5. Keep under ~300 lines for readability.

---
## 17. Quick Reference Paths
| Task | Path |
|------|------|
| New page | `app/views/<phase>/` |
| Routes | `app/routes.js` |
| Session defaults | `app/data/session-data-defaults.js` |
| Filters | `app/filters.js` |
| Sass partials | `app/assets/sass/` |
| JS components & tests | `app/assets/stylesheets/` |

---
Use these generic best practices to keep prototype evolution fast, accessible, and aligned with GOV.UK guidance. Always seek explicit confirmation before upgrading major design system versions.
