// Hand-made paper illustrations for specific flashcards (geography set, 16 pictures).
// Generated from design-handoff/geography-all-16/manifest.json: the link is the question id
// and nothing else. NN is the manifest order; the files are alpha-trimmed WebP copies of
// the delivered PNGs. `before` = the picture may show while the answer is hidden; the
// others (manifest recommendedVisibility 'after-reveal') appear only once it is open.
// File names are neutral on purpose: they must not give the answer away.
export interface QuestionHint {
  file: string;
  before: boolean;
}

export const QUESTION_HINTS: Record<string, QuestionHint> = {
  '4513fa48-047e-4307-9361-821dc1288e8e': { file: 'geo-01.webp', before: true },
  'c3c4a6d8-3409-4584-a9c5-24065cd7aa79': { file: 'geo-02.webp', before: false },
  'a4806421-4be2-42ab-a5eb-b1ae939ef8ed': { file: 'geo-03.webp', before: true },
  'f49de748-6ded-47cf-963d-4a27e1f964d2': { file: 'geo-04.webp', before: true },
  '00411bd1-aa5a-4bf1-8c32-93c477ea094d': { file: 'geo-05.webp', before: true },
  '5fbabc54-c8f8-48e4-956f-5ff97d12b4c5': { file: 'geo-06.webp', before: false },
  '1bc6dece-014a-45fd-b640-185bf934b3d2': { file: 'geo-07.webp', before: false },
  '7d19cd30-507c-46a4-9435-cafc6055fdea': { file: 'geo-08.webp', before: false },
  'a915a7d8-7b7c-4702-91ec-91697f620748': { file: 'geo-09.webp', before: false },
  'd8d680ce-e74a-4030-b2bc-b547d125694c': { file: 'geo-10.webp', before: false },
  '3d7f2b7c-c6ae-447c-ba48-c15ffe5303ec': { file: 'geo-11.webp', before: true },
  '7c246e7f-b51b-40fa-afa5-a1a45f66eb99': { file: 'geo-12.webp', before: true },
  'd8555b87-cf9d-4c03-8023-134bace3e135': { file: 'geo-13.webp', before: true },
  '3e17f6d0-2f54-4a44-bf4e-06837d7ec483': { file: 'geo-14.webp', before: true },
  'd30b8b68-7462-4ee7-8b44-de05b956b667': { file: 'geo-15.webp', before: true },
  '5897fb5a-4a0f-47ac-8117-ed93e80e5556': { file: 'geo-16.webp', before: true },
};

export const questionHintUrl = (file: string) => `${import.meta.env.BASE_URL}assets/pureplay/question-hints/${file}`;
