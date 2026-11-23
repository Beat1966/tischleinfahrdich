(function () {
  'use strict';

  const CONFIG_URL = '/data/config.json';
  let appConfig = null;
  let lastPayload = null;

  const form = document.getElementById('anfrage-form');
  if (!form) return;

  const elDate = document.getElementById('tf-datum');
  const elTime = document.getElementById('tf-startzeit');
  const elDuration = document.getElementById('tf-dauer');
  const elReturnHint = document.getElementById('tf-rueckkehr-hinweis');
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

  function updateReturnTime() {
    const start = elTime.value;
    const hours = parseInt(elDuration.value, 10);
    if (!start || isNaN(hours) || hours < 1) {
      elReturnHint.textContent = '';
      return;
    }
    const [hh, mm] = start.split(':').map(Number);
    const totalMinutes = hh * 60 + mm + hours * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    elReturnHint.textContent = `Rückkehr ca. ${endStr} Uhr`;
  }

  function populateTimeOptions(cfg) {
    const previous = elTime.value;
    elTime.innerHTML = '';
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const ziel = (cfg.ziele || []).find(z => z.id === elTarget.value);
    let endMin = toMin(cfg.zeitfenster.ende);
    if (ziel && ziel.spaetesterStart) endMin = Math.min(endMin, toMin(ziel.spaetesterStart));
    const step = cfg.zeitfenster.rasterMinuten || 30;
    const values = [];
    for (let m = toMin(cfg.zeitfenster.start); m <= endMin; m += step) {
      const val = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      values.push(val);
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = `${val} Uhr`;
      elTime.appendChild(opt);
    }
    if (values.includes(previous)) elTime.value = previous;
    else if (values.includes(cfg.zeitfenster.standard)) elTime.value = cfg.zeitfenster.standard;
    else elTime.value = values[values.length - 1];

    let hint = document.getElementById('tf-startzeit-hinweis');
    if (!hint) {
      hint = document.createElement('span');
      hint.id = 'tf-startzeit-hinweis';
      hint.className = 'field-hint';
      elTime.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = (ziel && ziel.spaetesterStart)
      ? `Für ${ziel.name} ist der Start bis spätestens ${ziel.spaetesterStart} Uhr möglich, damit Sie vor Küchenschluss ankommen.`
      : '';
  }

  function populateSelects(cfg) {
    elLocation.innerHTML = '';
    cfg.abholorte.forEach(ort => {
      const opt = document.createElement('option');
      opt.value = ort;
      opt.textContent = ort;
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
    } else {
      showError('err-datum', '');
    }

    const duration = parseInt(elDuration.value, 10);
    if (isNaN(duration) || duration < appConfig.mindestDauerStunden || !Number.isInteger(Number(elDuration.value))) {
      showError('err-dauer', `Bitte geben Sie ganze Stunden an (mindestens ${appConfig.mindestDauerStunden} Stunde).`);
      ok = false;
    } else {
      showError('err-dauer', '');
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
    const hours = parseInt(elDuration.value, 10);
    const total = hours * appConfig.ansatzProStunde;
    const zielObj = appConfig.ziele.find(z => z.id === elTarget.value);
    const fzObj = appConfig.fahrzeuge.find(f => f.id === elVehicle.value);

    return {
      datumISO: elDate.value,
      datumText: formattedDate,
      startzeit: elTime.value,
      rueckkehr: elReturnHint.textContent,
      dauerStunden: hours,
      abholort: elLocation.value,
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
    document.getElementById('res-zeit').textContent = `${data.startzeit} Uhr (${data.rueckkehr})`;
    document.getElementById('res-dauer').textContent = data.dauerStunden === 1 ? '1 Stunde' : `${data.dauerStunden} Stunden`;
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
      `Startzeit: ${d.startzeit} Uhr (${d.rueckkehr})`,
      `Dauer: ${d.dauerStunden} Stunde(n)`,
      `Abholort: ${d.abholort}`,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const resJson = await response.json();
      if (resJson && resJson.status === 'ok') {
        statusBox.className = 'status-box status-box--success is-visible';
        statusBox.innerHTML = '<p style="margin:0"><strong>Vielen Dank für Ihre Anfrage.</strong> Wir prüfen die Verfügbarkeit und melden uns persönlich bei Ihnen.</p>';
        form.reset();
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
  [elDate, elTime, elDuration, elLocation, elTarget, elVehicle, elVoucher, elRecipient, elNotes].forEach(el => {
    el.addEventListener('input', () => {
      clearResult();
      updateReturnTime();
    });
    el.addEventListener('change', () => {
      clearResult();
      updateReturnTime();
      if (el === elDate) validateTripFields();
      if (el === elTarget) { populateTimeOptions(appConfig); updateReturnTime(); validateTripFields(); }
    });
  });

  elVoucher.addEventListener('change', function () {
    elRecipientWrap.classList.toggle('hidden', !elVoucher.checked);
  });

  btnCalc.addEventListener('click', calculateAndDisplay);
  form.addEventListener('submit', handleSubmit);

  // Initialisierung
  fetch(CONFIG_URL)
    .then(r => {
      if (!r.ok) throw new Error('config.json konnte nicht geladen werden.');
      return r.json();
    })
    .then(cfg => {
      appConfig = cfg;
      const nextFri = getNextFriday();
      const nextFriStr = formatISODate(nextFri);
      elDate.min = nextFriStr;
      elDate.step = '7';
      elDate.value = nextFriStr;

      elDuration.min = String(cfg.mindestDauerStunden);
      if (cfg.maxDauerStunden) {
        elDuration.max = String(cfg.maxDauerStunden);
      } else {
        elDuration.removeAttribute('max');
      }

      populateSelects(cfg);
      populateTimeOptions(cfg);
      updateReturnTime();
    })
    .catch(() => {
      statusBox.className = 'status-box status-box--fallback is-visible';
      statusBox.textContent = 'Die Konfigurationsdaten konnten nicht geladen werden. Bitte laden Sie die Seite neu.';
    });
})();
