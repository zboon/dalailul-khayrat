/* ── The Dalāʾil in two versions ─────────────────────────────────────────
   DALAIL_CHAPTERS above is the ISTANBUL version: collated word by word
   against the Istanbul printing, which removed 520 سيدنا the app had carried
   (one commit per day; Mawalid v388, the Dalāʾil app v66). The owner then
   asked for the earlier text to be offered too, as the Mughlay Version
   (first called "With Sayyidinā"; the code keeps that name, and the stored
   value 'sayyidina'), and for it to be read without the Arabic commas.

   DALAIL_WITH_SAYYIDINA holds the 153 verses those splices changed, keyed
   "chapter:verse", with ar, tr and en together (the splices moved all three).
   Each is the pre-collation verse carrying every fix made since: Saturday
   v15's شِيثَ and the two إِبْرَاهِيمَ tatweels. The build asserted that each
   differs from the Istanbul verse by exactly the collation's own changes,
   that every ۞ and ‖ was where it had been (Monday's rosettes have since
   moved to the Mughlay printing's; see below), and 520 restored in all: Mon1 119,
   Tue 35, Wed 25, Thu 63, Fri 134, Sat 94, Sun 28, Mon2 22. The data keeps
   its commas; the Mughlay Version drops every Arabic comma (U+060C)
   from the Arabic of the whole Dalāʾil as it is applied — all 1,065 sit as
   "word، next", so removing one leaves a single space. tr and en keep theirs.

   The owner then had سَيِّدُنَا put before each of the 200 Names of the
   Prophet (chapter 5, v2–v201) in this version only — new text, not a
   restoration: no copy of the app ever carried it there, and the Istanbul
   Names pages were not to hand. tr "Sayyidunā …", en "Our master, …". The
   bytes are Saturday v21's, the only nominative سَيِّدُنَا in the Dalāʾil.

   The Mughlay Version then follows the Mughlay printing itself, day by
   day, on the owner's rule. Monday P1 (chapter 6): six سيدنا the printing
   lacks came out (the alternates for v43, v45 and v47 then equalled
   Istanbul and were dropped), and v15, v23, v35 and v42 carry the Mughlay
   reading where the two books differ. Its rosettes then moved to where
   the Mughlay printing marks them (far fewer inside the verses; none after
   v44), and its English is the book's own. The ‖ page breaks stay
   Istanbul's, so leaves line up; phrases don't, which is why saved places
   are kept per version (placeKey). See CLAUDE.md for the list.

   The swap is done IN PLACE on DALAIL_CHAPTERS rather than by keeping a
   second array, so every reader of the text — both readers, search, saved
   places, live sessions — follows the chosen version without being taught
   about it. DALAIL_ISTANBUL is a startup snapshot of every Dalāʾil verse so
   the swap can go back. The source array itself is never edited: it stays
   byte-identical between the two apps, as non-negotiable 6 requires. */
