# The texts

Every text in the app lives here: one folder per section, one JSON file per piece,
and an `index.json` in each folder giving the reading order. `node build.js` stitches
them into the one self-contained `index.html` (the app itself never fetches them),
so after editing a file here run `node build.js`; `node build.js --check` says whether
the committed page is up to date. The layout mirrors the SacredTexts app's `content/`.

## Folders

| Folder | What it holds |
|---|---|
| `barzanji/` | Mawlid al-Barzanjī |
| `burdah/` | The 10 chapters of the Qaṣīda Burdah |
| `dalail/` | Dalāʾil al-Khayrāt (Istanbul version), one file per chapter |
| `dalail-mughlay/` | The Mughlay version: a map of "chapter:verse" alternates, one file per chapter (see CLAUDE.md) |
| `diya/` | The Shimmering Light (Diyāʾ al-Lāmiʿ) |
| `ilahis/` | Turkish ilahis |
| `litanies/` | The aḥzāb: Ghāyāt, Wiqāyah, and the daily portions of al-Ḥizb al-Aʿẓam and Ḥizb al-Istighfār |
| `qasidas/` | Duas and qasidas, including the numbered sections of the Mawlid ad-Daybaʿī |
| `sirah/` | The prose sections of the Mawlid ad-Daybaʿī |

## Order: each folder's `index.json`

```json
["title-page", "the-opening-dua", "the-names-of-allah"]
```

The array is the order the app uses, and **array position is part of the data**:
marks, audio, saved places and the Dalāʾil day cards find pieces by index.
**Do not reorder or remove entries** in `dalail/`, `litanies/`, `qasidas/` (a retired
piece stays, flagged `retired: true`) or `dalail-mughlay/`; add new pieces at the end.
The build refuses a folder whose `index.json` and `.json` files disagree.

## Piece format

One piece per file, the same shape the app has always used:

```json
{
  "titleArabic": "…",
  "titleEnglish": "1 · The Opening",
  "note": "…",
  "folios": [{ "from": 0, "to": 5 }],
  "verses": [{ "ar": "…", "tr": "…", "en": "…" }]
}
```

Optional fields (`video`, `videoStart`, `refrain`, `repeatRefrain`, `noRosette`, `latin`, …) are
described in `CLAUDE.md`. It is JSON: double quotes, no comments, no trailing commas.
The Arabic rules in `CLAUDE.md` apply unchanged — in particular **never retype Arabic
that is already in the corpus**.

`dalail-mughlay/` is different: each file is one chapter's object of `"chapter:verse"`
alternates, and the build merges them in `index.json` order.

## File names

A file is named after the piece's English title, as in SacredTexts: drop the leading
`N ·`, anything after an em dash and anything in parentheses; fold diacritics and drop
ʿ ʾ and apostrophes; lowercase, runs of other characters become `-`, at most 60
characters, cut at a word. When two pieces in a folder would collide, both use their
full title (`monday-part-1`, `monday-part-2`). Names carry no numbers; a name is only a
label, so a file keeps its name if the title changes later.

## Adding a piece

1. Copy a piece from the same folder, rename it by the rule above, replace the text.
2. Add its name at the end of the folder's `index.json`.
3. Run `node build.js`, and open the app to check it.

Comments that used to sit between the qasidas in the old JavaScript source are kept at the
top of `src/js/` in the section's file (e.g. `020-data-qasidas.js`).
