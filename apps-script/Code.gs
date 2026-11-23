/**
 * Google Apps Script Web-App für tischleinfahrdich.ch
 * Schreibt eingehende Anfragen in das Tabellenblatt "Anfragen" und sendet eine E-Mail.
 */

const SHEET_NAME = 'Anfragen';
const AVAIL_SHEET_NAME = 'Verfügbarkeit';
const NOTIFY_EMAIL = 'b.sutter@me.com';

/**
 * GET: liefert die verfügbaren Freitage aus dem Tab "Verfügbarkeit".
 * Spalte A: Datum, Spalte B: Bemerkung (optional, wird nicht angezeigt).
 * Antwort: { status: 'ok', daten: ['2027-05-07', ...] }
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AVAIL_SHEET_NAME);
    const daten = [];
    if (sheet && sheet.getLastRow() > 1) {
      const tz = Session.getScriptTimeZone();
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      values.forEach(function (row) {
        const v = row[0];
        if (v instanceof Date) {
          daten.push(Utilities.formatDate(v, tz, 'yyyy-MM-dd'));
        } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
          daten.push(v.trim());
        }
      });
    }
    daten.sort();
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', daten: Array.from(new Set(daten)) }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Zeitstempel',
        'Datum',
        'Abfahrt',
        'Fahrzeit verrechnet (Std.)',
        'Treffpunkt',
        'Ziel',
        'Fahrzeug',
        'Gutschein',
        'Empfänger',
        'Hinweise',
        'Unkostenbeitrag (CHF)',
        'Name',
        'E-Mail',
        'Telefon',
        'Bestätigung'
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.datumText || data.datumISO || '',
      data.abfahrt || '',
      data.dauerStunden || '',
      (data.abholort || '') + (data.wunschortAdresse ? ' – ' + data.wunschortAdresse : ''),
      data.zielName || '',
      data.fahrzeugName || '',
      data.alsGutschein ? 'Ja' : 'Nein',
      data.empfaengerName || '',
      data.hinweise || '',
      data.unkostenbeitragCHF || '',
      data.name || '',
      data.email || '',
      data.telefon || '',
      data.bestaetigung ? 'Ja' : 'Nein'
    ]);

    if (NOTIFY_EMAIL && NOTIFY_EMAIL.indexOf('@') > -1) {
      const subject = 'Neue Anfrage tischleinfahrdich.ch: ' + (data.datumText || '') + ' – ' + (data.zielName || '');
      const body = [
        'Neue Anfrage über tischleinfahrdich.ch:',
        '',
        'Datum: ' + (data.datumText || ''),
        'Abfahrt: ' + (data.abfahrt || '') + ' (Ankunft Restaurant ' + (data.ankunftRestaurant || '') + ')',
        'Verrechnete Fahrzeit: ' + (data.dauerStunden || '') + ' Stunde(n), hin und zurück',
        'Treffpunkt: ' + (data.abholort || '') + (data.wunschortAdresse ? ' – Adresse: ' + data.wunschortAdresse : ''),
        'Ziel: ' + (data.zielName || ''),
        'Fahrzeug: ' + (data.fahrzeugName || ''),
        'Als Gutschein: ' + (data.alsGutschein ? 'Ja' : 'Nein') + (data.empfaengerName ? ' (für ' + data.empfaengerName + ')' : ''),
        'Hinweise: ' + (data.hinweise || 'Keine'),
        'Unkostenbeitrag: ' + (data.unkostenbeitragText || ''),
        '',
        'Kontakt:',
        'Name: ' + (data.name || ''),
        'E-Mail: ' + (data.email || ''),
        'Telefon: ' + (data.telefon || '')
      ].join('\n');

      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: data.email || NOTIFY_EMAIL,
        subject: subject,
        body: body
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
