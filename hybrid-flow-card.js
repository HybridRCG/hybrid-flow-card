// hybrid-flow-card.js – Energy flow visualization (2 PV strings + auto‑sum)
// Place grid-icon.png and home-icon.png in /config/www/hybrid_flow/

const L = {
  ARC_CX: 260, ARC_CY: 78, ARC_LX: 35, ARC_RX: 485,
  ARC_RISE_Y: 100, ARC_NOON_X: 260, ARC_NOON_Y: 100, ARC_SET_Y: 100,
  ARC_SUN_GLOW_R: 28, ARC_SUN_INNER_R: 14, ARC_SUN_DOT_R: 7,
  ARC_MOON_GLOW_R: 12, ARC_MOON_DOT_R: 6,

  BATT_X: 53, BATT_Y: 145, BATT_W: 62, BATT_H: 118, BATT_R: 8,
  BATT_SHELL_X: 49, BATT_SHELL_Y: 135, BATT_SHELL_W: 70, BATT_SHELL_H: 132,
  BATT_SHELL_R: 10,
  BATT_CAP_X: 77, BATT_CAP_Y: 127, BATT_CAP_W: 14, BATT_CAP_H: 9, BATT_CAP_R: 3,
  BATT_SOC_X: 62, BATT_SOC_Y: 205, BATT_TIME_X: 3, BATT_TIME_Y: 278,
  BATT_PWR_X: 125, BATT_PWR_Y: 170,
  BATT_GRP_TX: -36.6, BATT_GRP_TY: 25.4, BATT_GRP_S: 0.8,

  INV_X: 260, INV_Y: 210, INV_R: 50, INV_STATUS_X: 260, INV_STATUS_Y: 278,
  INV_IMG_X: 205, INV_IMG_Y: 155, INV_IMG_W: 110, INV_IMG_H: 110,

  HOME_X: 462, HOME_Y: 210, HOME_R: 50, HOME_LOAD_X: 462, HOME_LOAD_Y: 278,
  HOME_IMG_X: 407, HOME_IMG_Y: 138, HOME_IMG_W: 110, HOME_IMG_H: 110,
  HOME_GLOW_X: 412, HOME_GLOW_Y: 143,

  GRID_X: 260, GRID_Y: 405, GRID_PWR_X: 325, GRID_PWR_Y: 395,
  GRID_IMP_X: 325, GRID_IMP_Y: 425,
  GRID_IMG_X: 205, GRID_IMG_Y: 350, GRID_IMG_W: 110, GRID_IMG_H: 110,
  BOLT_POINTS: '86,176 74,199 82,199 77,223 93,195 85,195 97,176',

  PV_LABEL_W: 120, PV_LABEL_H: 32, PV_LABEL_R: 13,
  PV_LABEL_DEF_X: 150, PV_LABEL_DEF_Y: 20,

  TRACK_BATT: 'M 59,175 H 132 V 205 H 205',
  TRACK_HOME: 'M 407,175 H 361 V 202 H 315',
  TRACK_GRID: 'M 260,265 V 327',
  FLOW_GRID_D: 'M 260,265 V 350',
  FLOW_BATT_D: 'M 59,175 H 132 V 205 H 205',
  FLOW_INV_LOAD_D: 'M 315,202 H 361 V 175 H 407',

  VIEW_W: 520, VIEW_H_FULL: 470, VIEW_H_CROP: 295,
  SKY_CX: 260, SKY_CY: 84, SKY_RX: 230, SKY_RY: 110,
  AURA_PATH: 'M 35,78 Q 260,-45 485,78 Z',
  DASH_LINE: 'M 8,78 L 512,78',
};

function socColor(p) { return p <= 25 ? '#f85149' : p <= 50 ? '#f39c4b' : p <= 75 ? '#58a6ff' : '#4CAF50'; }
function tempColor(t) { return t <= 25 ? '#3fb950' : t <= 45 ? '#f0883e' : '#f85149'; }
function remCapColor(p) { return p <= 15 ? '#e34d4c' : p <= 30 ? '#f39c4b' : p <= 55 ? '#f4d03f' : '#2ecc71'; }

function fmtTime(h) {
  if (!isFinite(h) || h <= 0) return '--';
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return hh + 'h ' + (mm < 10 ? '0' : '') + mm + 'm';
}

function sunData(hass, config) {
  const sunEnt = config.sun || 'sun.sun';
  const attrs = hass?.states[sunEnt]?.attributes;
  let rise = '06:00', set = '18:00';
  if (attrs) {
    const fmt = iso => { try { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return null; } };
    if (attrs.next_rising) rise = fmt(attrs.next_rising) || rise;
    if (attrs.next_setting) set = fmt(attrs.next_setting) || set;
  }
  const toMin = str => { const p = str.split(':').map(Number); return p[0] * 60 + p[1]; };
  const NOW = new Date(); const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  const RISE = toMin(rise), SET = toMin(set);
  let t = Math.max(0, Math.min(1, (nowMin - RISE) / (SET - RISE)));
  const night = nowMin < RISE || nowMin > SET;
  const bell = 1 - Math.pow(Math.abs(2 * t - 1), 1.5);
  const bx = Math.round((1 - t) * (1 - t) * 35 + 2 * (1 - t) * t * 260 + t * t * 485);
  const by = Math.round((1 - t) * (1 - t) * 78 + 2 * (1 - t) * t * (-45) + t * t * 78);
  let mx = 260, my = 72;
  if (night) {
    const nightLen = 1440 - (SET - RISE);
    let tMoon = nowMin > SET ? (nowMin - SET) / nightLen : (nowMin + 1440 - SET) / nightLen;
    tMoon = Math.max(0, Math.min(1, tMoon));
    mx = Math.round((1 - tMoon) * (1 - tMoon) * 485 + 2 * (1 - tMoon) * tMoon * 260 + tMoon * tMoon * 35);
    my = Math.round((1 - tMoon) * (1 - tMoon) * 78 + 2 * (1 - tMoon) * tMoon * 158 + tMoon * tMoon * 78);
  }
  return { rise, set, t, night, bell, bx, by, mx, my };
}

function battFill(soc) {
  const fillTop = 145, fillBot = 263, fillAreaH = 118;
  const fillH = Math.round((soc || 0) / 100 * fillAreaH);
  const fillY = fillBot - fillH;
  let color, filter, textColor;
  if (soc <= 20) { color = '#ff2200'; filter = 'url(#battGlowRed)'; textColor = '#000'; }
  else if (soc <= 40) { color = '#f4d03f'; filter = 'url(#battGlowOrange)'; textColor = '#000'; }
  else if (soc <= 75) { color = '#44ff00'; filter = 'url(#battGlowGreen)'; textColor = '#fff'; }
  else { color = '#00d4ff'; filter = 'url(#battGlowCyan)'; textColor = '#fff'; }
  return { y: fillY, height: fillH, color, filter: fillH > 4 ? filter : 'none', textColor };
}

function flowLevel(w, type) {
  const isSolar = type === 'solar';
  const tiers = isSolar
    ? [[200, 4.0, 1.8, 6], [600, 3.2, 2.2, 12], [1200, 2.7, 2.5, 20], [2500, 2.4, 2.8, 30], [4000, 1.8, 3.2, 42], [6000, 1.2, 3.5, 55]]
    : [[150, 4.0, 1.8, 4], [500, 3.2, 2.2, 8], [1000, 2.7, 2.5, 14], [2000, 2.4, 2.8, 22], [3000, 1.8, 3.2, 30], [4500, 1.5, 3.5, 40]];
  for (const [t, dur, size, count] of tiers) {
    if (w < t) return { dur, size, count };
  }
  return isSolar ? { dur: 0.9, size: 3.8, count: 65 } : { dur: 0.9, size: 3.8, count: 50 };
}

function buildPvWaveHTML(bx, by, pvTotal) {
  if (pvTotal <= 10) return '';
  const fl = flowLevel(pvTotal, 'solar');
  const pvStartY = by + 7;
  const pvPathD = 'M ' + bx.toFixed(1) + ',' + pvStartY.toFixed(1) +
                  ' C ' + bx.toFixed(1) + ',85 260,5 260,155';
  const color = 'rgba(255,232,60,.95)';
  const gc = 'rgba(255,190,20,.55)';
  const dashDur = (fl.dur * 0.8).toFixed(2);
  const dashLen = (8 + fl.size * 1.5).toFixed(1);
  const gapLen = (6 + fl.size * 1.2).toFixed(1);
  const dashTotal = (parseFloat(dashLen) + parseFloat(gapLen)).toFixed(1);
  let h = '';
  h += '<path class="pv-wave" d="' + pvPathD + '" fill="none" stroke="' + gc + '" stroke-width="6" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round" opacity="0.25" filter="url(#arcSunF2)" style="--cycle:' + dashTotal + ';animation-duration:' + dashDur + 's"/>';
  h += '<path class="pv-wave" d="' + pvPathD + '" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round" style="--cycle:' + dashTotal + ';animation-duration:' + dashDur + 's"/>';
  h += '<path class="pv-wave" d="' + pvPathD + '" fill="none" stroke="' + color + '" stroke-width="1.0" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round" opacity="0.85" style="--cycle:' + dashTotal + ';animation-duration:' + dashDur + 's"/>';
  const waveDefs = [
    { amp: 6, dur: fl.dur * 0.9, ox: 0, op: 0.9, sc: 'rgba(255,255,255,0.92)', dLen: '3.0', dGap: '40.0' },
    { amp: 10, dur: fl.dur * 1.1, ox: 3, op: 0.6, sc: color, dLen: '4.5', dGap: '50.0' }
  ];
  const wc = Math.min(2, Math.max(1, Math.round(fl.count / 5)));
  for (let wi = 0; wi < wc; wi++) {
    const wd = waveDefs[wi];
    const sineCount = Math.min(Math.round(fl.count * 0.5), 20);
    const sineDur = wd.dur.toFixed(2);
    const sineCycle = (parseFloat(wd.dLen) + parseFloat(wd.dGap)).toFixed(1);
    for (let si = 0; si < sineCount; si++) {
      const frac = si / sineCount;
      const phase = frac * Math.PI * 2;
      const sY = (wd.amp * Math.sin(phase + wi * 1.1)).toFixed(1);
      const sX = (wd.ox + wd.amp * 0.3 * Math.cos(phase * 0.5)).toFixed(1);
      const sDelay = (frac * wd.dur % wd.dur).toFixed(3);
      const sOp = (wd.op * (0.5 + 0.5 * Math.abs(Math.sin(phase))) * 0.6).toFixed(2);
      h += '<g transform="translate(' + sX + ',' + sY + ')"><path class="pv-wave" d="' + pvPathD + '" fill="none" stroke="' + wd.sc + '" stroke-width="1.2" stroke-dasharray="' + wd.dLen + ' ' + wd.dGap + '" stroke-linecap="round" opacity="' + sOp + '" style="--cycle:' + sineCycle + ';animation-duration:' + sineDur + 's;animation-delay:-' + sDelay + 's"/></g>';
    }
  }
  return h;
}

function formatWatts(w) {
  return w >= 1000 ? (w / 1000).toFixed(2) + ' kW' : w.toFixed(0) + ' W';
}

function flowDuration(w) {
  return Math.max(0.5, 3.0 - (Math.min(Math.abs(w), 8000) / 8000) * 2.5).toFixed(2) + 's';
}

function wxColor(t) {
  if (t < 15) return '#58a6ff';
  if (t < 20) return '#ffcc00';
  if (t < 25) return '#ff9966';
  return '#ff4500';
}

class HybridFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('hybrid-flow-card-editor');
  }

  static getStubConfig() {
    return {
      pv1_power: '',
      pv2_power: '',
      grid_active_power: '',
      consump: '',
      battery_soc: '',
      battery_power: '',
      full_width: false,
    };
  }

  constructor() {
    super();
    this._hass = null;
    this.config = {};
    this._prevPvTotal = -1;
    this._prevSunPos = { bx: -1, by: -1 };
    this._prevGridV = -1;
    this._clockTimer = null;
    this._els = {};
    this._rendered = false;
    this._longPressTimer = null;
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._scheduleClock();
  }

  disconnectedCallback() {
    if (this._clockTimer) {
      clearTimeout(this._clockTimer);
      this._clockTimer = null;
    }
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _scheduleClock() {
    this._updateClock();
    const now = new Date();
    const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    this._clockTimer = setTimeout(() => this._scheduleClock(), Math.max(1000, msToNextMin));
  }

  _updateClock() {
    const timeEl = this._el('dtTime');
    const dateEl = this._el('dtDate');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = hh + ':' + mm;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dateEl.textContent = days[now.getDay()] + ' ' + now.getDate() + ' ' + months[now.getMonth()];
  }

  _el(id) {
    if (!(id in this._els)) this._els[id] = this.shadowRoot.getElementById(id);
    return this._els[id];
  }

  _invalidateEls() {
    this._els = {};
  }

  setConfig(config) {
    this.config = {
      pv1_power: '',
      pv2_power: '',
      pv_total_power: '',
      grid_active_power: '',
      grid_power_alt: '',
      grid_import_energy: '',
      consump: '',
      battery_soc: '',
      battery_power: '',
      goodwe_battery_soc: '',
      outdoor_temp: '',
      remaining_time: '',
      grid_voltage: '',
      sun: 'sun.sun',
      home_icon: '/local/hybrid_flow/home-icon.png',
      grid_icon: '/local/hybrid_flow/grid-icon.png',
      inv_icon: '/local/hybrid_flow/sunsynk.png',
      full_width: false,
      ...config
    };
    if (!this._rendered) {
      this._buildStaticSVG();
      this._rendered = true;
      this._attachClickHandlers();
    }
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true,
      detail: { entityId }
    }));
  }

  _navigate(path) {
    history.pushState(null, '', path);
    window.dispatchEvent(new Event('location-changed'));
  }

  _attachClickHandlers() {
    const root = this.shadowRoot;
    if (!root) return;

    const headerBar = root.getElementById('headerBar');
    if (headerBar) {
      const dtTime = root.getElementById('dtTime');
      const dtDate = root.getElementById('dtDate');
      [dtTime, dtDate].forEach(el => {
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => this._navigate('/lovelace/home'));
      });
    }

    const invImg = root.getElementById('invIconImg');
    if (invImg) {
      invImg.style.cursor = 'pointer';
      invImg.addEventListener('click', () => this._navigate('/lovelace/inverter'));
    }

    const wxTempEl = root.getElementById('wxTemp');
    if (wxTempEl) {
      wxTempEl.style.cursor = 'pointer';
      wxTempEl.addEventListener('pointerdown', () => {
        this._longPressFired = false;
        this._longPressTimer = setTimeout(() => {
          this._longPressFired = true;
          this._fireMoreInfo(this.config.outdoor_temp);
        }, 500);
      });
      wxTempEl.addEventListener('pointerup', () => { clearTimeout(this._longPressTimer); });
      wxTempEl.addEventListener('pointercancel', () => { clearTimeout(this._longPressTimer); });
      wxTempEl.addEventListener('click', () => {
        if (!this._longPressFired) this._navigate('/lovelace/ecowitt');
      });
    }

    const clickMap = [
      ['arcPvLabelRect', 'pv_total_power'],
      ['arcPvLabelText', 'pv_total_power'],
      ['fcBattVal',      'battery_soc'],
      ['battGroup',      'battery_soc'],
      ['battRemTime',    'remaining_time'],
      ['battPwrFlow',    'battery_power'],
      ['invStatusFlow',  'battery_power'],
      ['homeIconImg',    'consump'],
      ['fcLoadVal',      'consump'],
      ['gridIconImg',    'grid_active_power'],
      ['fcGridVal',      'grid_active_power'],
      ['gridImportVal',  'grid_import_energy'],
    ];

    clickMap.forEach(([elId, cfgKey]) => {
      const el = root.getElementById(elId);
      if (!el) return;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => this._fireMoreInfo(this.config[cfgKey]));
    });
  }

  set hass(hass) {
    this._hass = hass;
    this._updateDynamic();
  }

  _val(eid) {
    if (!eid) return undefined;
    const s = this._hass ? this._hass.states[eid] : null;
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return undefined;
    const v = parseFloat(s.state);
    return isNaN(v) ? undefined : v;
  }

  _setFlow(id, show, watts, durStr, color) {
    const el = this._el(id);
    if (!el) return;
    el.setAttribute('opacity', show ? '1' : '0');
    el.style.display = show ? '' : 'none';
    if (show && durStr !== undefined) el.style.animationDuration = durStr;
    if (color !== undefined) el.setAttribute('stroke', color);
  }

  _buildStaticSVG() {
    this._invalidateEls();
    this.shadowRoot.innerHTML = `<style>
      :host { display: block; }
      @keyframes hfcPulseInv  { 0%,100%{ opacity:0.1; } 50%{ opacity:0.5; } }
      @keyframes hfcPulseHome { 0%,100%{ opacity:0.1; } 50%{ opacity:0.45; } }
      @keyframes flowDashFwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -24px; } }
      @keyframes flowDashRev { from { stroke-dashoffset: -24px; } to { stroke-dashoffset: 0; } }
      @keyframes pvWaveDash { from { stroke-dashoffset: calc(var(--cycle, 24) * 1px); } to { stroke-dashoffset: 0; } }
      @keyframes boltPulse { 0%,100%{ opacity: 0.5; } 50%{ opacity: 1; } }
      @keyframes sunGlowR { 0%,100%{ transform: scale(1); opacity: 0.55; } 50%{ transform: scale(1.21); opacity: 0.9; } }
      @keyframes sunInnerR { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.21); } }
      @keyframes sunCoreR { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.14); } }
      .flow-fwd { animation: flowDashFwd 0.8s linear infinite; }
      .flow-rev { animation: flowDashRev 0.8s linear infinite; }
      .pv-wave  { animation: pvWaveDash linear infinite; }
      .bolt-pulse { animation: boltPulse 5s ease-in-out infinite; }
      .sun-glow { animation: sunGlowR 2.2s ease-in-out infinite; }
      .sun-inner { animation: sunInnerR 2.2s ease-in-out infinite; }
      .sun-core { animation: sunCoreR 2.2s ease-in-out infinite; }
    </style>
    <div id="hfcCard" style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:6px 13px 13px 13px;box-shadow:0 4px 20px rgba(0,0,0,.4);width:100%;box-sizing:border-box;transition:box-shadow 1s ease;">
      <div style="width:100%;${this.config.full_width ? '' : 'max-width:520px;'}margin:0 auto;" role="group" aria-label="Hybrid energy flow">
        <div id="headerBar" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;">
          <span id="dtDate" role="button" tabindex="0" style="font-size:1.5rem;font-weight:800;color:#e6edf3;letter-spacing:0.5px;">--</span>
          <span id="dtTime" role="button" tabindex="0" style="font-size:1.5rem;font-weight:800;color:#e6edf3;letter-spacing:0.5px;">--:--</span>
          <span id="wxTemp" role="button" tabindex="0" style="font-size:1.5rem;font-weight:800;letter-spacing:0.5px;color:#e6edf3;">-- °C</span>
        </div>
        <svg id="flowSvg" viewBox="0 0 520 470" style="width:100%;display:block;" role="img" aria-label="Energy flow dashboard">
          <defs>
            <filter id="arcSunF" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7"/></filter>
            <filter id="arcSunF2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
            <filter id="moonF"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <radialGradient id="dynAuraG" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stop-color="rgba(30,100,200,.28)"/><stop offset="55%" stop-color="rgba(30,80,160,.10)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/>
            </radialGradient>
            <radialGradient id="sunCG" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="rgba(255,255,220,.98)"/><stop offset="40%" stop-color="rgb(255,125,10)"/><stop offset="100%" stop-color="rgba(255,130,10,.6)"/>
            </radialGradient>
            <linearGradient id="arcDayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,180,50,0)"/><stop offset="20%" stop-color="rgba(255,200,70,.5)"/><stop offset="50%" stop-color="rgba(255,228,110,.92)"/><stop offset="80%" stop-color="rgba(255,200,70,.5)"/><stop offset="100%" stop-color="rgba(255,180,50,0)"/>
            </linearGradient>
            <linearGradient id="arcNightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(140,170,255,0)"/><stop offset="30%" stop-color="rgba(155,185,255,.35)"/><stop offset="50%" stop-color="rgba(200,215,255,.7)"/><stop offset="70%" stop-color="rgba(155,185,255,.35)"/><stop offset="100%" stop-color="rgba(140,170,255,0)"/>
            </linearGradient>
            <linearGradient id="battCapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#2d2d2d"/><stop offset="18%" stop-color="#8f8f8f"/><stop offset="50%" stop-color="#ececec"/><stop offset="82%" stop-color="#7a7a7a"/><stop offset="100%" stop-color="#242424"/>
            </linearGradient>
            <linearGradient id="battShellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#050505"/><stop offset="18%" stop-color="#111"/><stop offset="50%" stop-color="#080808"/><stop offset="82%" stop-color="#111"/><stop offset="100%" stop-color="#030303"/>
            </linearGradient>
            <linearGradient id="battGlassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.03)"/><stop offset="15%" stop-color="rgba(255,255,255,0.22)"/><stop offset="33%" stop-color="rgba(255,255,255,0.05)"/><stop offset="50%" stop-color="rgba(255,255,255,0)"/><stop offset="67%" stop-color="rgba(255,255,255,0.05)"/><stop offset="85%" stop-color="rgba(255,255,255,0.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0.03)"/>
            </linearGradient>
            <linearGradient id="battFillHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.02)"/><stop offset="20%" stop-color="rgba(255,255,255,0.22)"/><stop offset="48%" stop-color="rgba(255,255,255,0.44)"/><stop offset="60%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
            </linearGradient>
            <clipPath id="battBodyClip"><rect x="${L.BATT_X}" y="${L.BATT_Y}" width="${L.BATT_W}" height="${L.BATT_H}" rx="${L.BATT_R}"/></clipPath>
            <filter id="battGlowRed"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowOrange"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowGreen"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowCyan"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowBolt"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
            <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
          </defs>
          <ellipse id="skyAura" cx="${L.SKY_CX}" cy="${L.SKY_CY}" rx="${L.SKY_RX}" ry="${L.SKY_RY}" fill="url(#dynAuraG)"/>
          <path d="${L.AURA_PATH}" fill="rgba(30,100,200,.05)"/>
          <line x1="8" y1="${L.ARC_CY}" x2="512" y2="${L.ARC_CY}" stroke="rgba(255,255,255,.12)" stroke-width="1" stroke-dasharray="3,8"/>
          <circle cx="${L.ARC_LX}" cy="${L.ARC_CY}" r="3.5" fill="rgba(255,200,80,.7)"/>
          <circle cx="${L.ARC_CX}" cy="${L.ARC_CY}" r="2.5" fill="rgba(255,255,255,.25)"/>
          <circle cx="${L.ARC_RX}" cy="${L.ARC_CY}" r="3.5" fill="rgba(255,110,55,.7)"/>
          <text id="arcRiseLabel" x="${L.ARC_LX}" y="${L.ARC_RISE_Y}" fill="#ffffff" font-size="14" font-weight="600" text-anchor="middle">06:00</text>
          <text x="${L.ARC_NOON_X}" y="${L.ARC_NOON_Y}" fill="#ffffff" font-size="14" font-weight="600" text-anchor="middle">12:00</text>
          <text id="arcSetLabel" x="${L.ARC_RX}" y="${L.ARC_SET_Y}" fill="#ffffff" font-size="14" font-weight="600" text-anchor="middle">18:00</text>
          <path d="M ${L.ARC_LX},${L.ARC_CY} Q ${L.ARC_CX},-45 ${L.ARC_RX},${L.ARC_CY}" fill="none" stroke="url(#arcDayGrad)" stroke-width="2.2"/>
          <path d="M ${L.ARC_RX},${L.ARC_CY} Q ${L.ARC_CX},158 ${L.ARC_LX},${L.ARC_CY}" fill="none" stroke="url(#arcNightGrad)" stroke-width="1.5" stroke-dasharray="4,5" opacity=".35"/>
          <g id="arcSunGroup" opacity="1">
            <circle id="arcSunGlow2" cx="${L.ARC_CX}" cy="35" r="${L.ARC_SUN_GLOW_R}" fill="rgba(255,200,60,.12)" filter="url(#arcSunF)" class="sun-glow" style="transform-origin:${L.ARC_CX}px 35px;"/>
            <circle id="arcSunGlow1" cx="${L.ARC_CX}" cy="35" r="${L.ARC_SUN_INNER_R}" fill="rgba(255,200,60,.5)" filter="url(#arcSunF2)" class="sun-inner" style="transform-origin:${L.ARC_CX}px 35px;"/>
            <circle id="arcSunDot" cx="${L.ARC_CX}" cy="35" r="${L.ARC_SUN_DOT_R}" fill="url(#sunCG)" stroke="rgba(255,255,200,.85)" stroke-width="1.2" class="sun-core" style="transform-origin:${L.ARC_CX}px 35px;"/>
          </g>
          <g id="moonGroup" opacity="0" filter="url(#moonF)">
            <circle id="moonGlow" cx="${L.ARC_CX}" cy="72" r="${L.ARC_MOON_GLOW_R}" fill="rgba(180,205,255,.18)"/>
            <circle id="moonDot" cx="${L.ARC_CX}" cy="72" r="${L.ARC_MOON_DOT_R}" fill="rgba(220,235,255,.92)" stroke="rgba(240,248,255,.9)" stroke-width="1.2"/>
          </g>
          <g id="pvFlowGroup"></g>
          <rect id="arcPvLabelRect" x="${L.PV_LABEL_DEF_X}" y="${L.PV_LABEL_DEF_Y}" width="${L.PV_LABEL_W}" height="${L.PV_LABEL_H}" rx="${L.PV_LABEL_R}" fill="rgba(20,18,10,0.92)" stroke="rgba(255,210,60,.9)" stroke-width="1.5" role="button" tabindex="0"/>
          <text id="arcPvLabelText" x="${L.PV_LABEL_DEF_X + L.PV_LABEL_W / 2}" y="${L.PV_LABEL_DEF_Y + 22}" text-anchor="middle" fill="rgba(255,235,110,.98)" font-size="16" font-weight="800" role="button" tabindex="0">0 W ⚡</text>

          <path id="battTrack" d="${L.TRACK_BATT}" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.18"/>
          <path id="homeTrack" d="${L.TRACK_HOME}" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.18"/>
          <path id="gridTrack" d="${L.TRACK_GRID}" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" opacity="0.18"/>

          <path id="flowGridIn" class="flow-rev" d="${L.FLOW_GRID_D}" fill="none" stroke="#FF2929" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"/>
          <path id="flowGridOut" class="flow-fwd" d="${L.FLOW_GRID_D}" fill="none" stroke="#FF2929" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"/>
          <path id="flowBattIn" class="flow-rev" d="${L.FLOW_BATT_D}" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"/>
          <path id="flowBattOut" class="flow-fwd" d="${L.FLOW_BATT_D}" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"/>
          <path id="flowInvLoad" class="flow-fwd" d="${L.FLOW_INV_LOAD_D}" fill="none" stroke="#29c4f6" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"/>

          <g id="battGroup" transform="translate(${L.BATT_GRP_TX}, ${L.BATT_GRP_TY}) scale(${L.BATT_GRP_S})" role="button" tabindex="0">
            <g id="battGlow">
              <rect x="${L.BATT_CAP_X}" y="${L.BATT_CAP_Y}" width="${L.BATT_CAP_W}" height="${L.BATT_CAP_H}" rx="${L.BATT_CAP_R}" fill="url(#battCapGrad)"/>
              <rect x="${L.BATT_CAP_X + 2}" y="${L.BATT_CAP_Y + 1}" width="${L.BATT_CAP_W - 4}" height="3" rx="1.5" fill="rgba(255,255,255,0.45)"/>
              <rect x="${L.BATT_SHELL_X}" y="${L.BATT_SHELL_Y}" width="${L.BATT_SHELL_W}" height="${L.BATT_SHELL_H}" rx="${L.BATT_SHELL_R}" fill="url(#battShellGrad)" stroke="none"/>
              <rect x="${L.BATT_SHELL_X + 2}" y="${L.BATT_SHELL_Y + 2}" width="${L.BATT_SHELL_W - 4}" height="7" rx="4" fill="url(#battCapGrad)"/>
              <rect x="${L.BATT_SHELL_X + 2}" y="${L.BATT_SHELL_Y + L.BATT_SHELL_H - 9}" width="${L.BATT_SHELL_W - 4}" height="9" rx="4" fill="url(#battCapGrad)"/>
              <rect x="${L.BATT_X}" y="${L.BATT_Y}" width="${L.BATT_W}" height="${L.BATT_H}" rx="${L.BATT_R}" fill="#0f1214"/>
              <rect id="battFillBar" x="${L.BATT_X}" y="${L.BATT_Y + L.BATT_H}" width="${L.BATT_W}" height="0" rx="0" fill="#3fb950" clip-path="url(#battBodyClip)"/>
              <rect id="battFillHL" x="${L.BATT_X}" y="${L.BATT_Y + L.BATT_H}" width="${L.BATT_W}" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClip)" style="pointer-events:none"/>
              <rect x="${L.BATT_SHELL_X}" y="${L.BATT_SHELL_Y}" width="${L.BATT_SHELL_W}" height="${L.BATT_SHELL_H}" rx="${L.BATT_SHELL_R}" fill="url(#battGlassBody)" style="pointer-events:none"/>
              <g id="battBoltGroup" opacity="0">
                <polygon class="bolt-pulse" points="${L.BOLT_POINTS}" fill="#1a4aff" stroke="rgba(100,150,255,.5)" stroke-width="0.8" filter="url(#battGlowBolt)"/>
              </g>
            </g>
            <text id="battPwrFlow" x="125" y="170" font-size="30" font-weight="900" fill="#cde" role="button" tabindex="0">-- W</text>
          </g>
          <text id="battRemTime" x="${L.BATT_TIME_X}" y="${L.BATT_TIME_Y}" text-anchor="start" font-size="24" font-weight="900" fill="#ffffff" role="button" tabindex="0">--</text>
          <text id="fcBattVal" x="${L.BATT_SOC_X}" y="${L.BATT_SOC_Y}" text-anchor="start" font-size="24" font-weight="900" fill="#ffffff" role="button" tabindex="0">--%</text>

          <image id="gridIconImg" href="${this.config.grid_icon}" x="${L.GRID_IMG_X}" y="${L.GRID_IMG_Y}" width="${L.GRID_IMG_W}" height="${L.GRID_IMG_H}" preserveAspectRatio="xMidYMid meet" style="filter: drop-shadow(0 0 8px #e05c00); opacity: 1;" role="button" tabindex="0"/>
          <text id="fcGridVal" x="${L.GRID_PWR_X}" y="${L.GRID_PWR_Y}" text-anchor="start" font-size="24" font-weight="900" fill="#e05c00" role="button" tabindex="0">-- W</text>
          <text id="gridImportVal" x="${L.GRID_IMP_X}" y="${L.GRID_IMP_Y}" text-anchor="start" font-size="24" font-weight="900" fill="#cde" role="button" tabindex="0">-- kWh</text>

          <rect id="invGlowRect" x="${L.INV_X - L.INV_R}" y="${L.INV_Y - L.INV_R}" width="${L.INV_R * 2}" height="${L.INV_R * 2}" rx="${L.INV_R}" fill="#f4a93b" filter="url(#glowOrange)" opacity="0.4" style="animation:hfcPulseInv 5s ease-in-out infinite;"/>
          <image id="invIconImg" href="${this.config.inv_icon}" x="${L.INV_IMG_X}" y="${L.INV_IMG_Y}" width="${L.INV_IMG_W}" height="${L.INV_IMG_H}" preserveAspectRatio="xMidYMid meet" style="opacity:1;" role="button" tabindex="0"/>
          <text id="invStatusFlow" x="${L.INV_STATUS_X}" y="${L.INV_STATUS_Y}" text-anchor="middle" font-size="24" font-weight="900" fill="#3ce878" letter-spacing="1" style="paint-order: stroke; stroke: rgba(0,0,0,0.85); stroke-width: 3.5px;" role="button" tabindex="0">--</text>

          <rect id="homeGlowRect" x="${L.HOME_GLOW_X}" y="${L.HOME_GLOW_Y}" width="${L.HOME_R * 2}" height="${L.HOME_R * 2}" rx="${L.HOME_R}" fill="#ffb228" filter="url(#glowYellow)" opacity="0.4" style="animation:hfcPulseHome 5s ease-in-out infinite;"/>
          <image id="homeIconImg" href="${this.config.home_icon}" x="${L.HOME_IMG_X}" y="${L.HOME_IMG_Y}" width="${L.HOME_IMG_W}" height="${L.HOME_IMG_H}" preserveAspectRatio="xMidYMid meet" style="opacity:1;" role="button" tabindex="0"/>
          <text id="fcLoadVal" x="${L.HOME_LOAD_X}" y="${L.HOME_LOAD_Y}" text-anchor="middle" font-size="24" font-weight="900" fill="#F7F6D3" style="paint-order: stroke; stroke: rgba(0,0,0,0.7); stroke-width: 3px;" role="button" tabindex="0">-- W</text>
        </svg>
      </div>
    </div>`;
    requestAnimationFrame(() => {
      ['invGlowRect', 'homeGlowRect'].forEach(id => {
        const el = this._el(id);
        if (!el) return;
        const anim = el.style.animation;
        el.style.animation = 'none';
        void el.getBoundingClientRect();
        el.style.animation = anim;
      });
    });
  }

  _updateDynamic() {
    if (!this._hass || !this.config) return;

    const pv1 = this._val(this.config.pv1_power) || 0;
    const pv2 = this._val(this.config.pv2_power) || 0;

    const totalPvSensor = this._val(this.config.pv_total_power);
    const pvTotal = (totalPvSensor !== undefined && totalPvSensor > 0) ? totalPvSensor : pv1 + pv2;

    const gridActive = this._val(this.config.grid_active_power) || this._val(this.config.grid_power_alt) || 0;
    const gridImport = this._val(this.config.grid_import_energy) || 0;
    const load = this._val(this.config.consump) || 0;
    const battSoc = this._val(this.config.battery_soc) ?? this._val(this.config.goodwe_battery_soc) ?? 0;
    const battPwr = this._val(this.config.battery_power) || 0;
    const absPwr = Math.abs(battPwr);
    const isCharging = battPwr < 0;

    const sun = sunData(this._hass, this.config);
    const auraEl = this._el('skyAura');
    if (auraEl) auraEl.setAttribute('cy', (94 - Math.round(sun.bell * 22)).toString());

    ['arcSunDot', 'arcSunGlow1', 'arcSunGlow2'].forEach(id => {
      const e = this._el(id);
      if (e) {
        e.setAttribute('cx', sun.bx);
        e.setAttribute('cy', sun.by);
        e.style.transformOrigin = sun.bx + 'px ' + sun.by + 'px';
      }
    });
    this._el('arcSunGroup')?.setAttribute('opacity', sun.night ? '0' : '1');

    if (sun.night) {
      ['moonGlow', 'moonDot'].forEach(id => {
        const e = this._el(id);
        if (e) { e.setAttribute('cx', sun.mx); e.setAttribute('cy', sun.my); }
      });
      this._el('moonGroup')?.setAttribute('opacity', '1');
    } else {
      this._el('moonGroup')?.setAttribute('opacity', '0');
    }

    const pvVisible = pvTotal > 0;
    const pvLabelRect = this._el('arcPvLabelRect');
    const pvLabelText = this._el('arcPvLabelText');
    if (pvLabelRect) pvLabelRect.style.display = pvVisible ? '' : 'none';
    if (pvLabelText) pvLabelText.style.display = pvVisible ? '' : 'none';
    if (pvVisible && pvLabelRect && pvLabelText) {
      const pvTxt = formatWatts(pvTotal) + ' ⚡';
      let lbx = sun.t < 0.5 ? sun.bx + 14 : sun.bx - L.PV_LABEL_W - 12;
      lbx = Math.max(4, Math.min(L.VIEW_W - L.PV_LABEL_W - 4, lbx));
      let lby = sun.by - 32; if (lby < 2) lby = 2;
      pvLabelRect.setAttribute('x', lbx);
      pvLabelRect.setAttribute('y', lby);
      pvLabelText.setAttribute('x', lbx + L.PV_LABEL_W / 2);
      pvLabelText.setAttribute('y', lby + 22);
      pvLabelText.textContent = pvTxt;
    }

    this._el('arcRiseLabel').textContent = sun.rise;
    this._el('arcSetLabel').textContent = sun.set;

    const wxTemp = this._el('wxTemp');
    if (wxTemp) {
      const t = this._val(this.config.outdoor_temp);
      if (t !== undefined) {
        wxTemp.textContent = t.toFixed(1) + ' °C';
        wxTemp.style.color = wxColor(t);
      } else {
        wxTemp.textContent = '-- °C';
        wxTemp.style.color = '#8b949e';
      }
    }

    if (pvTotal !== this._prevPvTotal || sun.bx !== this._prevSunPos.bx || sun.by !== this._prevSunPos.by) {
      this._prevPvTotal = pvTotal;
      this._prevSunPos = { bx: sun.bx, by: sun.by };
      const pvGroup = this._el('pvFlowGroup');
      if (pvGroup) {
        pvGroup.innerHTML = buildPvWaveHTML(sun.bx, sun.by, pvTotal);
      }
    }

    const showBattIn = battPwr < -10;
    const showBattOut = battPwr > 10;

    let battLineColor = '#8b949e';
    let battDur = flowDuration(absPwr);
    let battShowIn = false, battShowOut = false;
    if (absPwr >= 50) {
      battShowIn = showBattIn;
      battShowOut = showBattOut;
      if (isCharging) battLineColor = '#2b59ff';
      else if (absPwr < 1000) battLineColor = '#f39c4b';
      else if (absPwr < 2500) battLineColor = '#e67e22';
      else battLineColor = '#f85149';
    } else if (absPwr >= 10) {
      battShowIn = showBattIn;
      battShowOut = showBattOut;
      battLineColor = '#8b949e';
    }
    this._setFlow('flowBattIn', battShowIn, absPwr, battDur, battLineColor);
    this._setFlow('flowBattOut', battShowOut, absPwr, battDur, battLineColor);

    this._setFlow('flowGridIn', gridActive > 40, gridActive, flowDuration(gridActive), '#FF2929');
    this._setFlow('flowGridOut', gridActive < -40, Math.abs(gridActive), flowDuration(Math.abs(gridActive)), '#FF2929');

    const absGrid = Math.abs(gridActive);
    const absBatt = Math.abs(battPwr < -10 ? battPwr : 0);
    const domColor = (absGrid >= pvTotal && absGrid >= absBatt) ? '#f39c4b' : (absBatt >= pvTotal) ? '#f39c4b' : '#f4d03f';
    this._setFlow('flowInvLoad', load > 10, load, flowDuration(load), domColor);

    const gridInactive = Math.abs(gridActive) < 40;
    const gridImg = this._el('gridIconImg');
    if (gridImg) {
      gridImg.style.display = gridInactive ? 'none' : '';
      gridImg.style.opacity = '1';
    }
    const gridTrack = this._el('gridTrack');
    if (gridTrack) gridTrack.style.display = gridInactive ? 'none' : '';
    const fcGridVal = this._el('fcGridVal');
    if (fcGridVal) fcGridVal.style.display = gridInactive ? 'none' : '';
    const gridImportEl = this._el('gridImportVal');
    if (gridImportEl) gridImportEl.style.display = gridInactive ? 'none' : '';

    const flowSvg = this._el('flowSvg');
    if (flowSvg) flowSvg.setAttribute('viewBox', gridInactive ? `0 0 ${L.VIEW_W} ${L.VIEW_H_CROP}` : `0 0 ${L.VIEW_W} ${L.VIEW_H_FULL}`);

    const homeImg = this._el('homeIconImg');
    if (homeImg) homeImg.style.opacity = '1';
    const homeGlow = this._el('homeGlowRect');
    if (homeGlow) {
      const wasActive = homeGlow.dataset.active === '1';
      const isActive = load > 10;
      if (wasActive !== isActive) {
        homeGlow.dataset.active = isActive ? '1' : '0';
        homeGlow.style.animation = isActive ? 'hfcPulseHome 5s ease-in-out infinite' : 'none';
        homeGlow.style.opacity = isActive ? '' : '0';
      }
    }

    const fill = battFill(battSoc);
    const bf = this._el('battFillBar');
    if (bf) { bf.setAttribute('y', fill.y); bf.setAttribute('height', fill.height); bf.setAttribute('fill', fill.color); bf.setAttribute('filter', fill.filter); }
    const bh = this._el('battFillHL');
    if (bh) { bh.setAttribute('y', fill.y); bh.setAttribute('height', fill.height); }
    const fcBv = this._el('fcBattVal');
    if (fcBv) { fcBv.textContent = battSoc + '%'; fcBv.setAttribute('fill', '#ffffff'); }
    const battRemTime = this._el('battRemTime');
    if (battRemTime) {
      const remState = this._hass?.states[this.config.remaining_time]?.state;
      battRemTime.textContent = (remState && remState !== 'unavailable' && remState !== 'unknown') ? remState : '--';
    }
    const bolt = this._el('battBoltGroup');
    if (bolt) bolt.setAttribute('opacity', (isCharging && absPwr >= 10) ? '1' : '0');

    const invStatusEl = this._el('invStatusFlow');
    if (invStatusEl) {
      let txt, color;
      if (absPwr < 50) { txt = 'IDLE'; color = '#f4a93b'; }
      else if (isCharging) { txt = 'CHG'; color = '#3ce878'; }
      else { txt = 'DISCHG'; color = '#f85149'; }
      invStatusEl.textContent = txt;
      invStatusEl.setAttribute('fill', color);
      const invGlow = this._el('invGlowRect');
      if (invGlow) invGlow.setAttribute('fill', color);
    }

    const homeGlowEl = this._el('homeGlowRect');
    if (homeGlowEl) homeGlowEl.setAttribute('fill', domColor);

    const gvEl = this._el('fcGridVal');
    if (gvEl) {
      const absGridVal = Math.abs(gridActive);
      gvEl.textContent = formatWatts(absGridVal);
      gvEl.setAttribute('fill', '#e05c00');
    }
    const lv = this._el('fcLoadVal');
    if (lv) { lv.textContent = formatWatts(load); lv.setAttribute('fill', load > 10 ? domColor : '#8b949e'); }
    this._el('gridImportVal').textContent = gridImport.toFixed(2) + ' kWh';

    const battPwrEl = this._el('battPwrFlow');
    if (battPwrEl) {
      const sign = absPwr < 10 ? '' : battPwr < 0 ? '+' : '-';
      battPwrEl.textContent = sign + absPwr.toFixed(0) + ' W';
      let color = '#cde';
      if (battPwr < -10) color = '#ffe83c';
      else if (battPwr > 10) color = '#f85149';
      battPwrEl.setAttribute('fill', color);
    }

    const cardEl = this._el('hfcCard');
    if (cardEl) {
      const gridV = this._val(this.config.grid_voltage);
      const gridLow = gridV !== undefined && gridV < 200;
      if (gridLow !== this._prevGridV) {
        this._prevGridV = gridLow;
        cardEl.style.boxShadow = gridLow
          ? '0 0 0 2px #f85149, 0 0 18px 4px rgba(248,81,73,0.55), 0 4px 20px rgba(0,0,0,.4)'
          : '0 4px 20px rgba(0,0,0,.4)';
        cardEl.style.borderColor = gridLow ? '#f85149' : '#21262d';
      }
    }
  }
}

if (!customElements.get('hybrid-flow-card')) {
  customElements.define('hybrid-flow-card', HybridFlowCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'hybrid-flow-card',
  name: 'Hybrid Flow Card',
  description: 'Solar / Battery / Grid energy flow visualization with sun arc, battery fill, and animated power lines.',
  preview: false,
});

class HybridFlowCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }
  setConfig(config) { this._config = { ...config }; this._render(); }
  get config() { return this._config; }

  _render() {
    this.innerHTML = `
      <div class="card-config">
        <div style="margin:4px 0 12px">
          <span style="font-size:13px;font-weight:500;color:var(--primary-text-color)">Configure your sensors</span>
          <span style="font-size:11px;color:var(--secondary-text-color);display:block;margin-top:2px">Entity IDs from your HA instance</span>
        </div>
        ${this._field('pv1_power', 'PV String 1')}
        ${this._field('pv2_power', 'PV String 2')}
        ${this._field('pv_total_power', 'PV Total (optional)')}
        ${this._field('grid_active_power', 'Grid Active Power')}
        ${this._field('grid_import_energy', 'Grid Import Energy')}
        ${this._field('grid_voltage', 'Grid Voltage (optional)')}
        ${this._field('battery_soc', 'Battery SOC')}
        ${this._field('battery_power', 'Battery Power')}
        ${this._field('remaining_time', 'Remaining Time (optional)')}
        ${this._field('consump', 'House Consumption')}
        ${this._field('outdoor_temp', 'Outdoor Temperature (optional)')}
        ${this._field('sun', 'Sun Entity')}
        ${this._cb('full_width', 'Full Width')}
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--divider-color,#333)">
          <details>
            <summary style="font-size:12px;color:var(--secondary-text-color);cursor:pointer">Advanced icon paths</summary>
            <div style="margin-top:8px">
              ${this._field('home_icon', 'Home Icon')}
              ${this._field('grid_icon', 'Grid Icon')}
              ${this._field('inv_icon', 'Inverter Icon')}
            </div>
          </details>
        </div>
      </div>`;
    this._bindEvents();
  }

  _field(key, label) {
    const val = this._config[key] || '';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <label style="font-size:12px;font-weight:500;color:var(--secondary-text-color)" for="hfc-${key}">${label}</label>
      </div>
      <input id="hfc-${key}" type="text" value="${val.replace(/"/g, '&quot;')}" placeholder="sensor.entity_id" style="width:100%;padding:8px 10px;font-size:13px;font-family:inherit;background:var(--card-background-color,#0d1117);color:var(--primary-text-color,#e6edf3);border:1px solid var(--divider-color,#333);border-radius:6px;outline:none;box-sizing:border-box">
    </div>`;
  }

  _cb(key, label) {
    const checked = this._config[key] ? 'checked' : '';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:4px 0">
      <input id="hfc-${key}" type="checkbox" ${checked} style="width:18px;height:18px;accent-color:var(--accent-color,#58a6ff);cursor:pointer">
      <label for="hfc-${key}" style="font-size:12px;font-weight:500;color:var(--secondary-text-color);cursor:pointer">${label}</label>
    </div>`;
  }

  _bindEvents() {
    const inputs = this.querySelectorAll('input[type="text"]');
    inputs.forEach(inp => {
      inp.addEventListener('input', () => {
        const key = inp.id.replace('hfc-', '');
        const val = inp.value;
        if (val === '') {
          const { [key]: _, ...rest } = this._config;
          this._config = rest;
        } else {
          this._config = { ...this._config, [key]: val };
        }
        this._notify();
      });
    });
    const cbs = this.querySelectorAll('input[type="checkbox"]');
    cbs.forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.id.replace('hfc-', '');
        this._config = { ...this._config, [key]: cb.checked };
        this._notify();
      });
    });
  }

  _notify() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true, composed: true,
    }));
  }
}

customElements.define('hybrid-flow-card-editor', HybridFlowCardEditor);
