/**
 * Google Apps Script Web-App für tischleinfahrdich.ch
 * Schreibt eingehende Anfragen in das Tabellenblatt "Anfragen" und sendet eine E-Mail.
 */

const SHEET_NAME = 'Anfragen';
const NOTIFY_EMAIL = 'b.sutter@me.com';

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
        'Startzeit',
        'Dauer (Std.)',
        'Abholort',
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
      data.startzeit || '',
      data.dauerStunden || '',
      data.abholort || '',
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
        'Startzeit: ' + (data.startzeit || '') + ' (' + (data.rueckkehr || '') + ')',
        'Dauer: ' + (data.dauerStunden || '') + ' Stunde(n)',
        'Abholort: ' + (data.abholort || ''),
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
