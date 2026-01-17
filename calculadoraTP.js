/* Tropas x Pontos - Calculadora (overlay) para Tribal Wars
   - Não automatiza nada: só calcula e mostra UI
   - Referência (ideia): https://forum.tribalwars.com.br/index.php?threads/tropas-como-saber-a-quantidade-certa-de-tropas.128962/
*/
(function () {
  'use strict';

  function parseBRInt(v) {
    if (v === null || v === undefined) return 0;
    let s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/\s+/g, '');
    s = s.replace(/[^\d]/g, '');
    return s ? parseInt(s, 10) : 0;
  }
  function fmt(n) {
    try { return (n ?? 0).toLocaleString('pt-BR'); }
    catch { return String(n ?? 0); }
  }
  function ceilDiv(a, b) { return Math.ceil(a / b); }

  // TW normalmente já tem jQuery. Se não tiver, tenta carregar.
  function withJQ(cb) {
    if (window.jQuery) return cb(window.jQuery);
    var s = document.createElement('script');
    s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
    s.onload = function () { cb(window.jQuery); };
    document.head.appendChild(s);
  }

  withJQ(function ($) {
    // remove se já existir
    $('#twTroopsCalcOverlay, #twTroopsCalcStyle').remove();

    // CSS
    const css = `
#twTroopsCalcOverlay{
  position:fixed; z-index:999999;
  top:90px; left:40px; width:420px;
  background:#161b22; border:1px solid #263040; border-radius:10px;
  box-shadow:0 12px 30px rgba(0,0,0,.35);
  color:#e9eef5; font-family:Arial,sans-serif;
}
#twTroopsCalcHeader{
  cursor:move; user-select:none;
  background:#202225; border-bottom:1px solid #263040;
  padding:10px 12px; border-top-left-radius:10px; border-top-right-radius:10px;
  display:flex; justify-content:space-between; align-items:center;
}
#twTroopsCalcHeader b{ font-size:13px; }
#twTroopsCalcClose{
  background:#fb7185; color:#111; border:none; border-radius:8px;
  padding:6px 10px; cursor:pointer; font-weight:700;
}
#twTroopsCalcBody{ padding:12px; }
.twTCRow{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
.twTCRow3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px; }
.twTCLabel{ font-size:11px; color:#9fb0c5; margin-bottom:6px; display:block; }
.twTCInput,.twTCSelect{
  width:100%; box-sizing:border-box; padding:8px 10px;
  border-radius:8px; border:1px solid #2a3648;
  background:#0f1216; color:#e9eef5;
}
.twTCBtn{
  cursor:pointer; padding:9px 10px; border-radius:10px;
  border:1px solid #2a3648; background:#0f1216; color:#e9eef5; font-weight:700;
}
.twTCBtn:hover{ border-color:#6aa0ff; }
.twTCSmall{ font-size:11px; color:#9fb0c5; line-height:1.35; }
.twTCKPI{ font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
.twTCNote{
  margin-top:10px; background:#0f1216; border:1px dashed #2a3648;
  padding:10px; border-radius:10px;
}
.twTCOK{ color:#6ee7b7; font-weight:800; }
.twTCBad{ color:#fb7185; font-weight:800; }
a.twTCLink{ color:#9cc2ff; text-decoration:none; }
a.twTCLink:hover{ text-decoration:underline; }
`;
    $('head').append(`<style id="twTroopsCalcStyle">${css}</style>`);

    // HTML
    const html = `
<div id="twTroopsCalcOverlay">
  <div id="twTroopsCalcHeader">
    <b>Calculadora Tropas x Pontos</b>
    <button id="twTroopsCalcClose" title="Fechar">X</button>
  </div>
  <div id="twTroopsCalcBody">
    <div class="twTCRow">
      <div>
        <label class="twTCLabel">Pontos (p)</label>
        <input id="twTC_p" class="twTCInput" placeholder="Ex.: 43079">
      </div>
      <div>
        <label class="twTCLabel">Regra do mínimo (M)</label>
        <select id="twTC_rule" class="twTCSelect">
          <option value="1">M = p (t ≥ p)</option>
          <option value="2" selected>M = 2p (t ≥ 2p)</option>
        </select>
      </div>
    </div>

    <div class="twTCRow">
      <div>
        <label class="twTCLabel"><input id="twTC_archers" type="checkbox"> Mundo tem arqueiros</label>
        <div class="twTCSmall">Se não tiver, Aq e Ac são ignorados.</div>
      </div>
      <div>
        <label class="twTCLabel">Paladino (Pl)</label>
        <input id="twTC_Pl" class="twTCInput" placeholder="0 ou 1">
      </div>
    </div>

    <div class="twTCRow3">
      <div><label class="twTCLabel">Lanceiro (Lc)</label><input id="twTC_Lc" class="twTCInput" placeholder="0"></div>
      <div><label class="twTCLabel">Espada (Ep)</label><input id="twTC_Ep" class="twTCInput" placeholder="0"></div>
      <div><label class="twTCLabel">Bárbaros (Bb)</label><input id="twTC_Bb" class="twTCInput" placeholder="0"></div>
    </div>

    <div class="twTCRow3">
      <div><label class="twTCLabel">CL (Cl)</label><input id="twTC_Cl" class="twTCInput" placeholder="0"></div>
      <div><label class="twTCLabel">CP (Cp)</label><input id="twTC_Cp" class="twTCInput" placeholder="0"></div>
      <div><label class="twTCLabel">Aríete (Ar)</label><input id="twTC_Ar" class="twTCInput" placeholder="0"></div>
    </div>

    <div class="twTCRow3">
      <div><label class="twTCLabel">Catapulta (Ct)</label><input id="twTC_Ct" class="twTCInput" placeholder="0"></div>
      <div id="twTC_AqWrap" style="display:none;"><label class="twTCLabel">Arqueiro (Aq)</label><input id="twTC_Aq" class="twTCInput" placeholder="0"></div>
      <div id="twTC_AcWrap" style="display:none;"><label class="twTCLabel">Arq. a cavalo (Ac)</label><input id="twTC_Ac" class="twTCInput" placeholder="0"></div>
    </div>

    <div class="twTCRow">
      <button id="twTC_calc" class="twTCBtn">Calcular</button>
      <button id="twTC_fillExample" class="twTCBtn">Preencher exemplo</button>
    </div>

    <div class="twTCNote">
      <div class="twTCSmall">Resultado</div>
      <div class="twTCKPI" id="twTC_out">Preencha os dados e clique em Calcular.</div>
      <div class="twTCSmall" style="margin-top:8px;">
        Referência:
        <a class="twTCLink" target="_blank" rel="noreferrer"
           href="https://forum.tribalwars.com.br/index.php?threads/tropas-como-saber-a-quantidade-certa-de-tropas.128962/">
           tópico no fórum
        </a>.
      </div>
    </div>

    <div class="twTCSmall" style="margin-top:10px;">
      Obs.: Espiões não entram nessa conta (critério de “perfil militar”, não de utilidade tática).
    </div>
  </div>
</div>`;
    $('body').append(html);

    // Drag
    (function enableDrag() {
      const box = document.getElementById('twTroopsCalcOverlay');
      const head = document.getElementById('twTroopsCalcHeader');
      let startX=0, startY=0, startLeft=0, startTop=0, dragging=false;

      head.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = box.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        box.style.left = (startLeft + (e.clientX - startX)) + 'px';
        box.style.top  = (startTop  + (e.clientY - startY)) + 'px';
      });
      window.addEventListener('mouseup', () => dragging=false);
    })();

    function readData() {
      const arch = $('#twTC_archers').is(':checked');
      return {
        p: parseBRInt($('#twTC_p').val()),
        rule: parseInt($('#twTC_rule').val(), 10),
        arch,
        Lc: parseBRInt($('#twTC_Lc').val()),
        Ep: parseBRInt($('#twTC_Ep').val()),
        Bb: parseBRInt($('#twTC_Bb').val()),
        Cl: parseBRInt($('#twTC_Cl').val()),
        Cp: parseBRInt($('#twTC_Cp').val()),
        Ar: parseBRInt($('#twTC_Ar').val()),
        Ct: parseBRInt($('#twTC_Ct').val()),
        Pl: parseBRInt($('#twTC_Pl').val()),
        Aq: arch ? parseBRInt($('#twTC_Aq').val()) : 0,
        Ac: arch ? parseBRInt($('#twTC_Ac').val()) : 0
      };
    }

    function calcT(d) {
      return d.Lc + d.Ep + d.Bb + (d.arch ? d.Aq : 0)
        + (d.Cl * 4) + (d.arch ? (d.Ac * 5) : 0)
        + (d.Cp * 6) + (d.Ar * 5) + (d.Ct * 8) + (d.Pl * 10);
    }

    function render() {
      const d = readData();
      if (!d.p || d.p <= 0) {
        $('#twTC_out').html(`<span class="twTCBad">Preencha seus pontos (p)</span> para calcular.`);
        return;
      }
      const t = calcT(d);
      const M = d.rule * d.p;
      const diff = t - M;
      const ratio = t / d.p;

      let line1 = `t = <b>${fmt(t)}</b> | M = <b>${fmt(M)}</b> | t/p = <b>${ratio.toFixed(2)}</b>`;
      let line2 = diff >= 0
        ? `<span class="twTCOK">OK</span> — acima do mínimo por <span class="twTCOK">${fmt(diff)}</span>.`
        : `<span class="twTCBad">FALTANDO</span> — faltam <span class="twTCBad">${fmt(Math.abs(diff))}</span> equivalentes.`;

      let line3 = '';
      if (diff < 0) {
        const falta = Math.abs(diff);
        const sug = [
          `≈ ${fmt(ceilDiv(falta, 4))} CL`,
          `≈ ${fmt(ceilDiv(falta, 6))} CP`,
          `≈ ${fmt(ceilDiv(falta, 5))} Aríetes`,
          `≈ ${fmt(ceilDiv(falta, 8))} Catapultas`
        ];
        if (d.arch) sug.push(`≈ ${fmt(ceilDiv(falta, 5))} Ac`);
        line3 = `<div style="margin-top:8px">Para cobrir a falta: <span class="twTCKPI">${sug.join(' | ')}</span></div>`;
      }

      const formula = d.arch
        ? `t = Lc + Ep + Bb + Aq + (Cl*4) + (Ac*5) + (Cp*6) + (Ar*5) + (Ct*8) + (Pl*10)`
        : `t = Lc + Ep + Bb + (Cl*4) + (Cp*6) + (Ar*5) + (Ct*8) + (Pl*10)`;

      $('#twTC_out').html(`
        <div>${line1}</div>
        <div style="margin-top:6px">${line2}</div>
        ${line3}
        <div class="twTCSmall" style="margin-top:10px">Fórmula: <span class="twTCKPI">${formula}</span></div>
      `);
    }

    function syncArcherFields() {
      const arch = $('#twTC_archers').is(':checked');
      $('#twTC_AqWrap').toggle(arch);
      $('#twTC_AcWrap').toggle(arch);
      render();
    }

    // events
    $('#twTroopsCalcClose').on('click', () => $('#twTroopsCalcOverlay, #twTroopsCalcStyle').remove());
    $('#twTC_calc').on('click', render);
    $('#twTC_archers').on('change', syncArcherFields);

    $('#twTroopsCalcOverlay input, #twTroopsCalcOverlay select').on('input', function () {
      if (parseBRInt($('#twTC_p').val()) > 0) render();
    });

    $('#twTC_fillExample').on('click', function () {
      $('#twTC_p').val('43.079');
      $('#twTC_rule').val('2');
      $('#twTC_archers').prop('checked', false);
      $('#twTC_Lc').val('9942');
      $('#twTC_Ep').val('7127');
      $('#twTC_Bb').val('7616');
      $('#twTC_Cl').val('4587');
      $('#twTC_Cp').val('608');
      $('#twTC_Ar').val('556');
      $('#twTC_Ct').val('182');
      $('#twTC_Pl').val('3');
      syncArcherFields();
      render();
    });

    syncArcherFields();
  });
})();
