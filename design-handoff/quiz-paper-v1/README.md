# Quiz paper v1

Approved design: light answer strips, olive correct-answer outline and a pale sage result tab. Implemented only in the playing phase of Quiz; topic selection and results retain their behavior.

## Assets

Generated with the built-in image generation tool on 2026-10-12. Full prompt set: `prompts.json`. Assets retain original alpha, no raster cropping or repainting.

| File in telegram-bot/webapp/public/assets/quiz-paper-v1 | Purpose | Size |
| --- | --- | --- |
| answer-paper.png | Blank ivory answer strip, live letter and copy layered above | 2172 x 724 |
| correct-tab.png | Sage paper annotation, live check and localized label | 2172 x 724 |
| archive-collage.png | Neutral Aegean cartography, compass and archive postcard | 1586 x 992 |

Answer strip and tab include transparent clearance. CSS backgrounds compensate for it with center positioning and 105% / 293% and 112% / 157% sizing. They scale with the answer row; no text is part of the bitmap.

The main sheet reuses flashcard-backing-v1.png with nine-slice sizing. Topic labels reuse the project's topic-labels assets. Other subjects reuse their existing generated paper illustrations; the archive collage appears in history. The next-question button reuses terracotta-paper.webp.

## Behavior

Answers are actual buttons. Greek speech controls are separate sibling buttons and remain usable after selection. Correct and wrong states both have explicit text, not color alone. Press feedback takes 130 ms; the result tab enters in 210 ms and the explanation in 240 ms. Reduced-motion disables transitions and entrance animations.

All labels are localized in i18n.tsx. Scoring, one-shot selection guards, pronunciation and final-session persistence remain in Quiz.tsx.

Desktop layout flows with content, with extra bottom clearance inside the torn sheet. Height <=850 px uses smaller illustration and answer padding. Extremely long content can scroll rather than clip. Mobile validation intentionally deferred per owner instruction.
