/* ================================================================
   QASIDA DATA
   ----------------------------------------------------------------
   To add a new qasida or dua, add an object to this array. Each entry:
     category    : 'qasida' or 'dua' — controls which index section it
                   appears under
     titleArabic : Arabic title
     titleEnglish: English title / transliterated title
     refrain     : (optional) true marks first verse as the refrain
     verses      : array of { ar, tr, en } — Arabic, transliteration,
                   English translation. Add { refrain:true } on a
                   verse to highlight it as the chorus/refrain.
   Tip: upload this file to Claude and say e.g. "add Qasida X with
   full Arabic, transliteration and translation" — Claude will
   extend this array without touching the rest of the app.
   ================================================================ */
