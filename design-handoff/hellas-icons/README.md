# Hellas Study — original interface icons

- `src/components/HellasIcons.tsx`: project-owned action glyphs drawn on a 32-unit grid. React SVG components preserve `size`, `strokeWidth`, `className`, styles, ARIA attributes and refs. Names at call sites stay stable; no third-party path data or stock icon component imports are used.
- `src/components/StudyIcon.tsx`: section and topic icons reuse the original generated cut-paper artwork from `header-paper-v1`, `progress-artwork-v1`, and `topics`.
- Functional glyphs follow the active text color. The contrast theme renders the illustrative icons in grayscale.
- All icons are decorative next to the existing translated text or accessible button labels. Sizes, click handlers, keyboard focus and animations remain owned by their existing controls.

The existing logo, hand-authored ornaments and learning illustrations are retained. The separate Parthenon redesign is still at the reference-selection stage.