document.querySelectorAll('.main-button').forEach(function(button) {
    button.addEventListener('click', function() {
        document.getElementById('boeken').scrollIntoView({ behavior: 'smooth' });
        console.log('Button geklikt, scrolled naar boeken systeem   ');
    });
});

const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');

const alleTijdOpties = Array.from(timeSelect.options).map(optie => ({
  waarde: optie.value,
  tekst: optie.text
}));

// Buiten de change-listener zodat submit er ook bij kan
let bezetteTijden = [];

dateInput.addEventListener('change', async function () {
  const gekozenDatum = dateInput.value;
  if (!gekozenDatum) return;

  timeSelect.innerHTML = '';
  alleTijdOpties.forEach(optie => {
    const nieuweOptie = document.createElement('option');
    nieuweOptie.value = optie.waarde;
    nieuweOptie.text = optie.tekst;
    timeSelect.appendChild(nieuweOptie);
  });

  // Fix 4: foutafhandeling rond de beschikbaarheids-call
  try {
    // Fix 1: productie-webhook i.p.v. /webhook-test/
    // Pas het pad hieronder aan naar de EXACTE URL die n8n toont
    // wanneer de workflow op "Active" staat (productie-webhook).
    const antwoord = await fetch(
      'https://myn8n.illuvex.com/webhook/beschikbaarheidkyran?date=' + gekozenDatum
    );

    if (!antwoord.ok) throw new Error('Kon beschikbaarheid niet ophalen');

    const data = await antwoord.json();
    bezetteTijden = data.bookedTimes || [];

    for (const optie of timeSelect.options) {
      if (bezetteTijden.includes(optie.value)) {
        optie.disabled = true;
        optie.text = optie.value + ' (bezet)';
      }
    }
  } catch (err) {
    console.error('Fout bij ophalen beschikbaarheid:', err);
    bezetteTijden = [];
  }
});

const form = document.querySelector('.bookingform form');

form.addEventListener('submit', async function (event) {
  event.preventDefault();

  // Check 1: lege/ongeldige velden
  if (!form.checkValidity()) {
    form.reportValidity(); // laat de browser de standaard foutmeldingen tonen
    return;
  }

  // Check 2: tijdslot nog steeds beschikbaar?
  if (bezetteTijden.includes(timeSelect.value)) {
    toonPopup('Dit tijdslot is helaas dicht, kies een ander tijdstip.', 'fout');
    return;
  }

  const formData = new FormData(form);
  const params = new URLSearchParams(formData);
  const geboekteTijd = timeSelect.value;

  try {
    const response = await fetch(form.action + '?' + params.toString(), {
      method: 'GET'
    });

    if (!response.ok) throw new Error('Serverfout');

    // Fix 3: optimistic update, direct lokaal blokkeren
    bezetteTijden.push(geboekteTijd);
    for (const optie of timeSelect.options) {
      if (optie.value === geboekteTijd) {
        optie.disabled = true;
        optie.text = optie.value + ' (bezet)';
      }
    }

    toonPopup('Bedankt! Je ontvangt een bevestiging per e-mail.', 'succes');
    form.reset();

  } catch (fout) {
    toonPopup('Er ging iets mis, probeer het later opnieuw.', 'fout');
  }
});

function toonPopup(tekst, type) {
  const popup = document.getElementById('form-popup');
  popup.textContent = tekst;
  popup.className = 'popup ' + type;
  popup.style.display = 'block';
}