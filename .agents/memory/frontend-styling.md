---
name: Frontend styling expectations
description: The user's Tailwind CSS direction for Bookatlas.
---

Use advanced Tailwind CSS practices for Bookatlas.

**Why:** The user explicitly requested “also use the most advanced tailwind CSS”.

**How to apply:** Prefer the latest stable compatible release and modern
CSS-first Tailwind features. Include responsive behavior, visible keyboard
focus, and reduced-motion support. A request to use advanced Tailwind is not
permission for an unrelated visual redesign or framework replacement.

For Bookatlas, prioritize mobile over desktop whenever the two conflict, and
prioritize simplicity over adding features.

**Why:** The user specified mobile-first usability and simplicity as
non-negotiable product rules.

**How to apply:** Include mobile usability review in every sprint. Test phone
and tablet layouts, iOS and Android behavior, Lighthouse, and touch controls
before calling a feature complete. Be clear when physical-device or Lighthouse
checks were not run.
