/**
 * IA.cat — adjunts de les col·laboracions, de Gmail a Google Drive
 * ================================================================
 *
 * Per què existeix (19.10.2026): el connector de Gmail de Claude llegeix el text
 * dels correus però no en pot baixar els adjunts. Cada text rebut d'un
 * col·laborador (un .docx, un PDF) i cada retrat obligaven en Rafael a baixar-lo
 * i adjuntar-lo al xat a mà. Aquest script, que corre al compte de Google d'en
 * Rafael, copia sol aquests adjunts a una carpeta del seu Drive, on Claude sí que
 * els pot obrir (connector de Google Drive).
 *
 * Què fa, cada 10 minuts:
 *   1. Busca els fils de Gmail dels darrers 2 dies (30 en la instal·lació) amb
 *      adjunts que no siguin d'en Rafael.
 *   2. Només es queda els FILS DE COL·LABORACIÓ: aquells on en Rafael ha escrit
 *      algun missatge que esmenta «inteligencia-artificial.cat». La resta de
 *      correus (bancs, administració, família…) no els toca mai.
 *   3. Desa a la carpeta «IA.cat — adjunts de col·laboracions» els textos
 *      (.docx, .doc, .odt, PDF) i les fotos (JPEG, PNG, WebP, HEIC, .jfif…) dels
 *      missatges dels col·laboradors. Salta les imatges de menys de 15 KB (logos
 *      de signatura). Nom del fitxer: «AAAA-MM-DD — Remitent — nom original».
 *      La descripció porta el fil, el missatge i l'assumpte de Gmail.
 *   4. Les FOTOS les deixa visibles «per a qualsevol persona amb l'enllaç»
 *      (l'enllaç no surt enlloc i no és cercable): és el que permet que el
 *      workflow «Fotos dels col·laboradors» de GitHub les baixi sense cap clau.
 *      Als 21 dies els torna a fer privades. Els textos queden sempre privats.
 *
 * No envia res, no esborra res de Gmail i no fa servir cap clau d'API.
 *
 * Instal·lació (un sol cop): vegeu el doc del projecte «Adjunts de Gmail a
 * Drive — instal·lació de l'script». En resum: script.new → enganxar aquest
 * fitxer → desar → triar la funció «installa» → Executa → autoritzar.
 * Per aturar-lo: executar «desinstalla».
 */

const CARPETA = 'IA.cat — adjunts de col·laboracions';
const WEB = 'inteligencia-artificial.cat';
const DIES_CADA_PASSADA = 2;
const DIES_INSTALLACIO = 30;
const MIDA_MINIMA_FOTO = 15 * 1024;
const DIES_ENLLAC_PUBLIC = 21;
const MAX_FILS = 100;

const EXTENSIONS_TEXT = /\.(docx?|odt|pdf|rtf|txt)$/i;
const EXTENSIONS_FOTO = /\.(jpe?g|jfif|png|webp|heic|heif|tiff?|gif)$/i;

/** Instal·la el disparador de cada 10 minuts i fa la primera passada (30 dies). */
function installa() {
  desinstalla();
  ScriptApp.newTrigger('desaAdjunts').timeBased().everyMinutes(10).create();
  const n = recorre_(DIES_INSTALLACIO);
  Logger.log('Instal·lat. Primera passada: %s fitxer(s) nou(s) a «%s».', n, CARPETA);
}

/** Atura l'script (esborra el disparador). Els fitxers ja desats no es toquen. */
function desinstalla() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'desaAdjunts'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

/** Passada periòdica (la crida el disparador). */
function desaAdjunts() {
  const n = recorre_(DIES_CADA_PASSADA);
  if (n) Logger.log('%s fitxer(s) nou(s).', n);
  tancaEnllacosVells_();
}

function recorre_(dies) {
  const jo = Session.getEffectiveUser().getEmail().toLowerCase();
  const carpeta = carpeta_();
  const fils = GmailApp.search('has:attachment newer_than:' + dies + 'd -in:spam -in:trash', 0, MAX_FILS);
  let desats = 0;

  fils.forEach(function (fil) {
    const missatges = fil.getMessages();
    const esColaboracio = missatges.some(function (m) {
      return esMeu_(m, jo) && m.getPlainBody().indexOf(WEB) !== -1;
    });
    if (!esColaboracio) return;

    missatges.forEach(function (m) {
      if (esMeu_(m, jo)) return;
      const data = Utilities.formatDate(m.getDate(), 'Europe/Madrid', 'yyyy-MM-dd');
      const remitent = nomRemitent_(m.getFrom());
      m.getAttachments({ includeInlineImages: true }).forEach(function (adjunt) {
        const nomOriginal = adjunt.getName() || 'adjunt';
        const tipus = (adjunt.getContentType() || '').toLowerCase();
        const esFoto = tipus.indexOf('image/') === 0 || EXTENSIONS_FOTO.test(nomOriginal);
        const esText = !esFoto && (EXTENSIONS_TEXT.test(nomOriginal) || tipus === 'application/pdf'
          || tipus.indexOf('wordprocessingml') !== -1 || tipus === 'application/msword'
          || tipus.indexOf('opendocument.text') !== -1);
        if (!esFoto && !esText) return;
        if (esFoto && adjunt.getSize() < MIDA_MINIMA_FOTO) return;

        const nom = data + ' — ' + remitent + ' — ' + nomOriginal;
        if (carpeta.getFilesByName(nom).hasNext()) return;

        const fitxer = carpeta.createFile(adjunt.copyBlob().setName(nom));
        fitxer.setDescription(JSON.stringify({
          fil: fil.getId(),
          missatge: m.getId(),
          remitent: m.getFrom(),
          assumpte: m.getSubject(),
          data: m.getDate().toISOString(),
          tipus: esFoto ? 'foto' : 'text'
        }));
        if (esFoto) fitxer.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        desats++;
      });
    });
  });
  return desats;
}

/** Torna privades les fotos de fa més de DIES_ENLLAC_PUBLIC dies. */
function tancaEnllacosVells_() {
  const limit = new Date(Date.now() - DIES_ENLLAC_PUBLIC * 86400000);
  const fitxers = carpeta_().getFiles();
  while (fitxers.hasNext()) {
    const f = fitxers.next();
    if (f.getDateCreated() < limit && f.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK) {
      f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    }
  }
}

function carpeta_() {
  const it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}

function esMeu_(m, jo) {
  return m.getFrom().toLowerCase().indexOf(jo) !== -1;
}

function nomRemitent_(from) {
  const nom = from.replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
  return (nom || from).replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
}
