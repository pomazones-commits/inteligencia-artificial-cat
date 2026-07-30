/* «Estudis» — estudi VIGENT.
   Fitxer MANUAL: cap automatització no el toca ni el regenera mai.
   Contracte públic: window.IA_ESTUDI (objecte) o null si no n'hi ha cap.
   Els estudis anteriors viuen a estudis-arxiu.js (window.IA_ESTUDIS_ARXIU).
   Camps: date (DD.MM.AAAA), category, read, author, role, title, excerpt,
   quote, photo, photoAlt, abstract (llista de paràgrafs), keywords (llista),
   notes (llista), body (paràgrafs separats per \n\n; «## » = títol de secció,
   «• » = pics) i references (llista; *cursiva* amb asteriscos).

   30.07.2026 — Amb null, la banda #estudis no surt a la portada i estudi.html
   mostra «Ara mateix no hi ha cap estudi publicat». La secció queda muntada i
   llesta; per estrenar-la, tornar a posar-hi l'objecte de l'estudi. */
window.IA_ESTUDI = null;
