(function () {
  'use strict';

  const CONFIG_URL = new URL('../data/config.json', document.currentScript.src).href;
  let appConfig = null;
  let lastPayload = null;
  let availableDates = [];

  const form = document.getElementById('anfrage-form');
  if (!form) return;

  const elDate = document.getElementById('tf-datum');
  const elWunschWrap = document.getElementById('tf-wunschort-wrap');
  const elWunsch = document.getElementById('tf-wunschort');
  const elPlanText = document.getElementById('tf-zeitplan-text');
  const elLocation = document.getElementById('tf-abholort');
  const elTarget = document.getElementById('tf-ziel');
  const elVehicle = document.getElementById('tf-fahrzeug');
  const elVoucher = document.getElementById('tf-gutschein');
  const elRecipientWrap = document.getElementById('tf-empfaenger-wrap');
  const elRecipient = document.getElementById('tf-empfaenger');
  const elNotes = document.getElementById('tf-hinweise');
  const elName = document.getElementById('tf-name');
  const elEmail = document.getElementById('tf-email');
  const elPhone = document.getElementById('tf-telefon');
  const elConsent = document.getElementById('tf-bestaetigung');

  const btnCalc = document.getElementById('tf-berechnen');
  const btnSubmit = document.getElementById('tf-absenden');
  const resultBox = document.getElementById('tf-ergebnis');
  const statusBox = document.getElementById('tf-status');

  // Lokales Datums-Parsing (nie new Date("YYYY-MM-DD"))
  function parseLocalDate(val) {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getNextFriday() {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = d.getDay();
    let diff = (5 - day + 7) % 7;
    if (diff === 0) diff = 7; // frühestens nächster Freitag
    d.setDate(d.getDate() + diff);
    return d;
  }

  function formatCHF(amount) {
    const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `CHF ${formatted}.–`;
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.add('is-visible');
    } else {
      el.textContent = '';
      el.classList.remove('is-visible');
    }
  }

  function clearResult() {
    resultBox.classList.remove('is-visible');
    statusBox.className = 'status-box';
    statusBox.innerHTML = '';
    lastPayload = null;
  }

  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // Zeitplan: Ankunft immer zur festen Zeit im Restaurant, Abfahrt rückwärts gerechnet
  function computePlan() {
    if (!appConfig) return null;
    const tp = appConfig.treffpunkte.find(t => t.id === elLocation.value);
    const ziel = appConfig.ziele.find(z => z.id === elTarget.value);
    if (!tp || !ziel || !ziel.fahrzeitMinuten) return null;
    const fahrt = ziel.fahrzeitMinuten[tp.region];
    const ankunft = toMin(appConfig.ankunftRestaurant);
    const abfahrt = ankunft - fahrt;
    const raster = appConfig.abrundungMinuten || 60;
    const verrechnetMin = Math.max(appConfig.mindestDauerStunden * 60, Math.ceil((2 * fahrt) / raster) * raster);
    return { tp, ziel, fahrt, abfahrt: fmtTime(abfahrt), ankunft: appConfig.ankunftRestaurant, stunden: verrechnetMin / 60 };
  }

  function updatePlan() {
    const p = computePlan();
    elWunschWrap.classList.toggle('hidden', !(p && p.tp.wunschort));
    if (!p) { elPlanText.textContent = 'Treffpunkt und Ziel wählen.'; return; }
    const ort = p.tp.wunschort ? `ab ${p.tp.region === 'bern' ? 'Bern' : 'Thun'} (Abholzeit am Wunschort bestätigen wir persönlich)` : `ab ${p.tp.label}`;
    elPlanText.textContent = `Abfahrt ${p.abfahrt} Uhr ${ort}, ca. ${p.fahrt} Min. Fahrt. Ankunft ${p.ankunft} Uhr bei ${p.ziel.name}. ${appConfig.essenText} Verrechnet werden ${p.stunden} Std. Fahrzeit (hin und zurück) = ${formatCHF(p.stunden * appConfig.ansatzProStunde)}`;
  }

  function populateSelects(cfg) {
    elLocation.innerHTML = '';
    cfg.treffpunkte.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label;
      elLocation.appendChild(opt);
    });

    elTarget.innerHTML = '';
    cfg.ziele.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = z.label;
      elTarget.appendChild(opt);
    });

    elVehicle.innerHTML = '';
    cfg.fahrzeuge.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      const platz = f.plaetze === 1 ? '1 Gast' : `bis zu ${f.plaetze} Gäste`;
      opt.textContent = `${f.name} (${platz}, nach Verfügbarkeit)`;
      elVehicle.appendChild(opt);
    });

    // URL-Parameter ?ziel= und ?gutschein=1 auswerten
    const params = new URLSearchParams(window.location.search);
    const zielParam = params.get('ziel');
    if (zielParam && cfg.ziele.some(z => z.id === zielParam)) {
      elTarget.value = zielParam;
    }
    if (params.get('gutschein') === '1') {
      elVoucher.checked = true;
      elRecipientWrap.classList.remove('hidden');
    }
  }

  function validateTripFields() {
    let ok = true;
    const dateObj = parseLocalDate(elDate.value);
    const nextFri = getNextFriday();

    if (!dateObj) {
      showError('err-datum', 'Bitte wählen Sie einen Freitag.');
      ok = false;
    } else if (dateObj.getDay() !== appConfig.erlaubterWochentag) {
      showError('err-datum', 'Aktuell ist nur der Freitag buchbar – bitte wählen Sie einen Freitag.');
      ok = false;
    } else if (dateObj < nextFri) {
      showError('err-datum', 'Bitte wählen Sie frühestens den nächsten Freitag.');
      ok = false;
    } else if (!availableDates.includes(elDate.value)) {
      showError('err-datum', 'Dieser Freitag ist nicht verfügbar. Bitte wählen Sie einen Termin aus der Liste.');
      ok = false;
    } else {
      showError('err-datum', '');
    }

    const plan = computePlan();
    if (plan && plan.tp.wunschort && !elWunsch.value.trim()) {
      showError('err-wunschort', 'Bitte geben Sie die Adresse für die Abholung an.');
      ok = false;
    } else {
      showError('err-wunschort', '');
    }

    const selectedTarget = appConfig.ziele.find(z => z.id === elTarget.value);
    if (selectedTarget && Array.isArray(selectedTarget.ruhetage) && selectedTarget.ruhetage.includes(5)) {
      showError('err-ziel', `Hinweis: ${selectedTarget.name} hat am Freitag Ruhetag.`);
      ok = false;
    } else {
      showError('err-ziel', '');
    }

    return ok;
  }

  function validateContactFields() {
    let ok = true;
    if (!elName.value.trim()) {
      showError('err-name', 'Bitte geben Sie Ihren Vor- und Nachnamen an.');
      ok = false;
    } else {
      showError('err-name', '');
    }

    if (!elEmail.value.trim() || !elEmail.checkValidity()) {
      showError('err-email', 'Bitte geben Sie eine gültige E-Mail-Adresse an.');
      ok = false;
    } else {
      showError('err-email', '');
    }

    if (!elPhone.value.trim()) {
      showError('err-telefon', 'Bitte geben Sie Ihre Telefonnummer an.');
      ok = false;
    } else {
      showError('err-telefon', '');
    }

    if (!elConsent.checked) {
      showError('err-bestaetigung', 'Bitte bestätigen Sie den Hinweis zum Unkostenbeitrag.');
      ok = false;
    } else {
      showError('err-bestaetigung', '');
    }

    return ok;
  }

  function buildPayload() {
    const dateObj = parseLocalDate(elDate.value);
    const formattedDate = dateObj.toLocaleDateString('de-CH', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const plan = computePlan();
    const hours = plan ? plan.stunden : appConfig.mindestDauerStunden;
    const total = hours * appConfig.ansatzProStunde;
    const zielObj = appConfig.ziele.find(z => z.id === elTarget.value);
    const fzObj = appConfig.fahrzeuge.find(f => f.id === elVehicle.value);

    return {
      datumISO: elDate.value,
      datumText: formattedDate,
      abfahrt: plan ? plan.abfahrt : '',
      ankunftRestaurant: appConfig.ankunftRestaurant,
      fahrzeitEinwegMinuten: plan ? plan.fahrt : null,
      dauerStunden: hours,
      abholort: plan ? plan.tp.label : elLocation.value,
      wunschortAdresse: plan && plan.tp.wunschort ? elWunsch.value.trim() : '',
      zielId: zielObj ? zielObj.id : elTarget.value,
      zielName: zielObj ? zielObj.label : elTarget.value,
      fahrzeugId: fzObj ? fzObj.id : elVehicle.value,
      fahrzeugName: fzObj ? fzObj.name : elVehicle.value,
      alsGutschein: elVoucher.checked,
      empfaengerName: elVoucher.checked ? elRecipient.value.trim() : '',
      hinweise: elNotes.value.trim(),
      unkostenbeitragCHF: total,
      unkostenbeitragText: formatCHF(total),
      name: elName.value.trim(),
      email: elEmail.value.trim(),
      telefon: elPhone.value.trim(),
      bestaetigung: elConsent.checked
    };
  }

  function calculateAndDisplay() {
    if (!appConfig) return false;
    if (!validateTripFields()) {
      clearResult();
      return false;
    }
    const data = buildPayload();
    lastPayload = data;

    document.getElementById('res-datum').textContent = data.datumText;
    document.getElementById('res-zeit').textContent = `${data.abfahrt} Uhr, Ankunft ${data.ankunftRestaurant} Uhr`;
    document.getElementById('res-dauer').textContent = data.dauerStunden === 1 ? '1 Stunde (hin und zurück)' : `${data.dauerStunden} Stunden (hin und zurück)`;
    document.getElementById('res-abholort').textContent = data.abholort;
    document.getElementById('res-ziel').textContent = data.zielName;
    document.getElementById('res-fahrzeug').textContent = data.fahrzeugName;
    document.getElementById('res-gutschein').textContent = data.alsGutschein
      ? (data.empfaengerName ? `Ja (PDF per E-Mail, für ${data.empfaengerName})` : 'Ja (PDF per E-Mail)')
      : 'Nein';
    document.getElementById('res-beitrag').textContent = data.unkostenbeitragText;

    resultBox.classList.add('is-visible');
    return true;
  }

  function buildPlainTextSummary(d) {
    return [
      'Anfrage für eine kuratierte Ausfahrt (tischleinfahrdich.ch)',
      '------------------------------------------------------------',
      `Datum: ${d.datumText}`,
      `Abfahrt: ${d.abfahrt} Uhr (Ankunft im Restaurant ${d.ankunftRestaurant} Uhr)`,
      `Verrechnete Fahrzeit: ${d.dauerStunden} Stunde(n), hin und zurück`,
      `Treffpunkt: ${d.abholort}${d.wunschortAdresse ? ' – Adresse: ' + d.wunschortAdresse : ''}`,
      `Ziel: ${d.zielName}`,
      `Gewünschtes Fahrzeug: ${d.fahrzeugName} (nach Verfügbarkeit)`,
      `Als Gutschein (PDF per E-Mail): ${d.alsGutschein ? 'Ja' : 'Nein'}${d.empfaengerName ? ' – für ' + d.empfaengerName : ''}`,
      `Ernährungswünsche / Allergien / Mobilität: ${d.hinweise || 'Keine Angaben'}`,
      `Unkostenbeitrag: ${d.unkostenbeitragText}`,
      '',
      'Kontaktdaten:',
      `Name: ${d.name}`,
      `E-Mail: ${d.email}`,
      `Telefon: ${d.telefon}`,
      '',
      'Hinweis zum Unkostenbeitrag bestätigt: Ja'
    ].join('\n');
  }

  function renderFallback(d) {
    const summary = buildPlainTextSummary(d);
    const subject = encodeURIComponent(`Anfrage Ausfahrt: ${d.datumText} – ${d.zielName}`);
    const body = encodeURIComponent(summary);
    const mailto = `mailto:${appConfig.empfaengerEmail}?subject=${subject}&body=${body}`;

    statusBox.className = 'status-box status-box--fallback is-visible';
    statusBox.innerHTML = `
      <p style="margin:0 0 8px"><strong>Direkter Versand aktuell nicht verfügbar.</strong></p>
      <p style="margin:0">Sie können Ihre Anfrage direkt per E-Mail senden oder den Text in die Zwischenablage kopieren. Ihre Eingaben bleiben im Formular erhalten.</p>
      <div class="fallback-actions">
        <a class="btn btn--primary" href="${mailto}">Per E-Mail öffnen</a>
        <button type="button" class="btn btn--outline-dark" id="tf-kopieren">Anfrage kopieren</button>
      </div>
    `;

    const copyBtn = document.getElementById('tf-kopieren');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(summary).then(() => {
            copyBtn.textContent = 'Kopiert';
          });
        }
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!appConfig) return;

    const tripOk = calculateAndDisplay();
    const contactOk = validateContactFields();
    if (!tripOk || !contactOk) return;

    const payload = buildPayload();
    const endpoint = appConfig.anfrageEndpoint;

    if (!endpoint) {
      renderFallback(payload);
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Wird gesendet …';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // kein CORS-Preflight, Apps Script liest e.postData.contents
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const resJson = await response.json();
      if (resJson && resJson.status === 'ok') {
        statusBox.className = 'status-box status-box--success is-visible';
        statusBox.innerHTML = '<p style="margin:0"><strong>Vielen Dank für Ihre Anfrage.</strong> Wir prüfen die Verfügbarkeit und melden uns persönlich bei Ihnen.</p>';
        form.reset();
        updatePlan();
        elRecipientWrap.classList.add('hidden');
        resultBox.classList.remove('is-visible');
      } else {
        throw new Error('Ungültige Antwort');
      }
    } catch (err) {
      renderFallback(payload);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Anfrage absenden';
    }
  }

  // Event-Listener: Ergebnis bei jeder Änderung zurücksetzen
  [elDate, elLocation, elWunsch, elTarget, elVehicle, elVoucher, elRecipient, elNotes].forEach(el => {
    el.addEventListener('input', () => {
      clearResult();
      updatePlan();
    });
    el.addEventListener('change', () => {
      clearResult();
      updatePlan();
      if (el === elDate || el === elTarget) validateTripFields();
    });
  });

  elVoucher.addEventListener('change', function () {
    elRecipientWrap.classList.toggle('hidden', !elVoucher.checked);
  });

  btnCalc.addEventListener('click', calculateAndDisplay);
  form.addEventListener('submit', handleSubmit);

  // Verfügbare Freitage: zuerst live aus dem Google Sheet (Tab «Verfügbarkeit»
  // über die Apps-Script-Web-App, GET), sonst aus config.json.
  async function loadAvailability(cfg) {
    let daten = null;
    if (cfg.anfrageEndpoint) {
      try {
        const r = await fetch(cfg.anfrageEndpoint, { method: 'GET' });
        const j = await r.json();
        if (j && j.status === 'ok' && Array.isArray(j.daten)) daten = j.daten;
      } catch (e) { /* Fallback auf config.json */ }
    }
    if (!daten) daten = Array.isArray(cfg.verfuegbareDaten) ? cfg.verfuegbareDaten : [];
    const nextFri = getNextFriday();
    availableDates = daten
      .filter(d => { const o = parseLocalDate(d); return o && o.getDay() === cfg.erlaubterWochentag && o >= nextFri; })
      .sort();
    elDate.innerHTML = '';
    if (!availableDates.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Zurzeit keine freien Termine – bitte später wieder vorbeischauen';
      elDate.appendChild(opt);
      return;
    }
    availableDates.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = parseLocalDate(d).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      elDate.appendChild(opt);
    });
  }

  // Initialisierung
  fetch(CONFIG_URL)
    .then(r => {
      if (!r.ok) throw new Error('config.json konnte nicht geladen werden.');
      return r.json();
    })
    .then(cfg => {
      appConfig = cfg;
      populateSelects(cfg);
      updatePlan();
      return loadAvailability(cfg);
    })
    .catch(() => {
      statusBox.className = 'status-box status-box--fallback is-visible';
      statusBox.textContent = 'Die Konfigurationsdaten konnten nicht geladen werden. Bitte laden Sie die Seite neu.';
    });
})();
