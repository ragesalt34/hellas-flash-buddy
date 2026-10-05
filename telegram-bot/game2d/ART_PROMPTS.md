# Картинки для Hellas Sennaar — что сгенерировать

Генерируй в **ChatGPT** (лучше всего держит стиль и умеет прозрачный фон) или в **Gemini**.
Промпты на английском — так модели понимают точнее. Копируй блок целиком.

**Куда класть:** `C:\Users\user\Desktop\hellas-flash-buddy\telegram-bot\game2d\art_in\`
**Имя файла** — ровно как в заголовке (например `bg_pier.png`). Формат PNG (JPG тоже можно, я сконвертирую).

Советы:
- Делай всё **в одном чате ChatGPT**: сначала первый фон, дальше пиши «same style as before» — стиль будет единым.
- Если картинка не нравится — «regenerate» или «make it ...» с правкой. Мне нужны 1 удачный вариант на файл.
- На картинках **не должно быть букв и надписей** (нейросети пишут греческий с ошибками — текст наложит игра).
- Кадрирование и размер не важны — подгоню сам.

---

## Общий стиль (вставляется в начало каждого промпта)

```
STYLE: flat 2D adventure-game illustration in the manner of "Chants of Sennaar": clean flat colour shapes,
thin dark maroon ink outlines, soft warm pastel palette (warm white walls, peach and pale pink shadows,
teal-turquoise sea, Aegean blue accents, terracotta), light diagonal hatching inside shadows, gentle
sunlight from the upper left, calm and elegant, no photo-realism, no gradients except the sky.
NO text, NO letters, NO numbers, NO logos, NO signatures anywhere in the image.
```

---

## 1. Фоны (горизонтальные, 16:9)

### `bg_pier.png` — причал
```
[STYLE]
Wide 16:9 background of a small Greek Cycladic island harbour seen from the stone quay, side view.
Composition (important):
- Horizon at about 45% of the image height.
- Upper left: a hill covered with white cubic houses with blue doors and windows, a small white chapel
  with a blue dome, a few dark cypress trees.
- Left-centre, on the water: a moored white-and-navy passenger ferry with one funnel.
- Centre-right, on the water near the quay: a small traditional wooden fishing boat (caique) with a short mast.
- Far right on the horizon: a white lighthouse with red bands on a small rocky islet.
- Sky: warm morning sky, a few soft clouds.
- Bottom 30% of the image: an EMPTY flat stone-slab quay (light beige slabs), nothing standing on it,
  so characters can walk there. A couple of iron bollards along the water edge are fine.
No people, no signs, no text.
```

### `bg_warehouse.png` — склад
```
[STYLE]
Wide 16:9 interior of an old harbour warehouse, front view of the back wall.
Composition (important):
- Coursed stone back wall, timber ceiling beams, two arched openings (far left and far right) showing the sea.
- Left third: wooden shelves with clay amphorae and grain sacks.
- Centre-right: THREE identical wooden conveyor chutes side by side, evenly spaced, each running from the
  floor back into a dark opening in the wall. Above each chute: EMPTY wall space (a sign will be added there).
- Warm light beams with dust coming through the openings, two hanging oil lamps.
- Bottom 30%: EMPTY wooden plank floor, nothing on it.
No people, no signs, no text.
```

### `bg_customs.png` — таможня
```
[STYLE]
Wide 16:9 sunny courtyard of a Greek port customs house, front view.
Composition (important):
- Whitewashed wall with an arcade of round arches between columns, a blue Greek-key (meander) frieze along
  the top, blue wooden shutters, pink bougainvillea climbing the wall, potted lemon trees.
- Left-centre: an empty white wall area at head height (a poster will be added there).
- Right side: an open doorway / passage leading out (the exit).
- Bottom 30%: EMPTY floor of cream and terracotta tiles, nothing standing on it.
No people, no kiosk, no barrier, no signs, no text.
```

---

## 2. Персонажи (каждый — «лист» с тремя позами)

Для всех персонажей добавь в конец:
```
Character sheet: the SAME character drawn THREE times side by side, full body, front view, same size,
feet on the same baseline: (1) standing calmly, arms down; (2) pointing to the side with the right arm
fully extended; (3) right hand placed on the chest. Plain flat white background (or transparent),
no shadows on the ground, no text.
```

### `char_traveler.png` — герой (ты)
```
[STYLE]
A young traveller in a long hooded magenta-purple robe with a darker sash, the face hidden behind a simple
pale mask with two thin eye slits, small travel satchel at the hip.
[CHARACTER SHEET]
```

### `char_sailor.png` — матрос (ο ναύτης)
```
[STYLE]
A Greek sailor in a long navy-blue tunic with white trim, a white knitted cap with a small red pompom,
the face hidden behind a simple pale mask with two thin eye slits.
[CHARACTER SHEET]
```

### `char_worker.png` — грузчик на складе
```
[STYLE]
A harbour dock worker in a long olive-green tunic with a leather apron and rolled sleeves, a cloth cap,
the face hidden behind a simple pale mask with two thin eye slits.
[CHARACTER SHEET]
```

### `char_guard.png` — стражник таможни (ο φύλακας)
```
[STYLE]
A customs guard in a long dark navy uniform coat with brass buttons, a peaked officer cap with a small
gold badge, the face hidden behind a simple pale mask with two thin eye slits.
[CHARACTER SHEET]
```

---

## 3. Предметы (прозрачный фон)

### `prop_crate.png` — ящик
```
[STYLE]
A single wooden cargo crate, front view, with a blank rectangular paper label in the upper middle
(label must be EMPTY), isolated on a transparent background, no shadow, no text.
```

### `prop_desk.png` — стойка таможенника
```
[STYLE]
A wooden customs counter / desk seen from the front, waist-high, with a small brass tray on top,
carved panels on the front, isolated on a transparent background, no text.
```

---

Готово? Кидай файлы в `art_in` и напиши мне — я встрою, подгоню расположение кликабельных объектов
под картинки и покажу скриншоты. Можно присылать по частям (например, сначала `bg_pier.png` и `char_traveler.png`).
