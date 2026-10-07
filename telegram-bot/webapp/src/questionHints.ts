// Hand-made paper illustrations for specific flashcards (geography 16 + culture 22 + laws 17 pictures).
// Generated from the delivered manifests (geography-all-16, culture-question-hints-v1, laws-question-hints-v1): the link is the question id
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
  // culture (culture-question-hints-v1, 22 pictures; all may show before the answer)
  '33620323-3e0b-4e23-9edd-801e0aae74da': { file: 'culture-01.webp', before: true },
  '096e3941-5d65-45c1-b1c9-ab5ce87be10f': { file: 'culture-02.webp', before: true },
  '57d654b4-24f2-44ec-9ccb-1915cb701db3': { file: 'culture-03.webp', before: true },
  '121277c0-185d-4843-b796-e5cf586f875f': { file: 'culture-04.webp', before: true },
  '6cdf3f08-b724-48cd-ae9e-592d81ee4506': { file: 'culture-05.webp', before: true },
  'e560214e-42ca-4930-b2cb-2a30227fd2ab': { file: 'culture-06.webp', before: true },
  '6a6539b4-8a93-4fe7-b61d-dcea9c2959ff': { file: 'culture-07.webp', before: true },
  'cda61fdd-139e-445d-bb94-0d4587b4e1a1': { file: 'culture-08.webp', before: true },
  '7e1cba9f-a5d0-4536-9765-739dfacf29f5': { file: 'culture-09.webp', before: true },
  'aacb6d4c-8add-4f2a-a328-a2779f670cdc': { file: 'culture-10.webp', before: true },
  'd50e6790-c366-4b6e-9928-afc9fafcbd4b': { file: 'culture-11.webp', before: true },
  '7051cce4-7005-4d55-9bec-69a1c984280c': { file: 'culture-12.webp', before: true },
  '9556772e-6770-47f7-9326-d35fff46bd7f': { file: 'culture-13.webp', before: true },
  '82e79f77-ced8-4b63-afe3-d1e80791979f': { file: 'culture-14.webp', before: true },
  '9e24653a-ff76-4c5e-94f5-45ad1ff39fb9': { file: 'culture-15.webp', before: true },
  '8b1f808d-9627-46e5-86e8-f6f3d88db372': { file: 'culture-16.webp', before: true },
  'da927f46-15ee-4c0d-888a-e93310586337': { file: 'culture-17.webp', before: true },
  '2103599b-b505-453d-86bb-2c342512ff6e': { file: 'culture-18.webp', before: true },
  'c9daa1c8-09dc-4074-8cf1-32e31147454d': { file: 'culture-19.webp', before: true },
  '3a89fd76-9a4e-482f-ae39-49fde21ebb34': { file: 'culture-20.webp', before: true },
  'b902e07e-10d9-46cf-88be-472251f955f8': { file: 'culture-21.webp', before: true },
  'd8cb973e-9d49-481c-a889-6be194e4d2cc': { file: 'culture-22.webp', before: true },
  // laws (laws-question-hints-v1, 17 pictures; all may show before the answer)
  'd2010467-bad4-4cc8-86d4-fba1e5805f3e': { file: 'laws-01.webp', before: true },
  'b3fc201e-1890-48ea-8bcf-f4d26f9aaa1d': { file: 'laws-02.webp', before: true },
  'b8f66c49-46c2-4bd4-be5f-601ab2ab164b': { file: 'laws-03.webp', before: true },
  'ea914529-05ab-4fcf-bc48-d30b8964033c': { file: 'laws-04.webp', before: true },
  '7d78b707-3a04-450d-9887-17b19def9bbf': { file: 'laws-05.webp', before: true },
  'e2440a2e-0efe-40e4-bbac-b5188d8e7c1c': { file: 'laws-06.webp', before: true },
  '18958906-22ab-42eb-a793-8b2751882542': { file: 'laws-07.webp', before: true },
  '6b952e54-376c-48e2-8629-c34efdb8a24a': { file: 'laws-08.webp', before: true },
  '5567f840-a46c-413d-a0a8-306cb075158a': { file: 'laws-09.webp', before: true },
  '4d2c5633-77a1-4727-bf28-d0abcd94d701': { file: 'laws-10.webp', before: true },
  '00841b1e-cba6-408e-9e54-ee9d0e7774b4': { file: 'laws-11.webp', before: true },
  '585c4d02-c037-4008-b3a3-7dd93d0ecfc3': { file: 'laws-12.webp', before: true },
  'ebf48c1e-a8c1-43d6-b083-c04d29e5dde0': { file: 'laws-13.webp', before: true },
  'aef1b0d7-4f4d-481f-97bc-630606144229': { file: 'laws-14.webp', before: true },
  '69bb6d47-d7c4-42dd-abb7-1ff6af947502': { file: 'laws-15.webp', before: true },
  '6301c464-7fe0-4ae4-883c-357a4f4864fd': { file: 'laws-16.webp', before: true },
  '79d1ba3f-ee95-4c87-9d0d-a11678a74bcf': { file: 'laws-17.webp', before: true },
};

export const questionHintUrl = (file: string) => `${import.meta.env.BASE_URL}assets/pureplay/question-hints/${file}`;
