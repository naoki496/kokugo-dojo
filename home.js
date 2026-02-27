/* home.js (kokugo-dojo)
 * - FLASH/BLITZ menu toggle
 * - Card Hub pulse delayed
 * - MISSION BRIEF loader (mission-brief.txt)
 * - Detail modal (line syntax: "表示||詳細", NEW: prefix)
 * - PWA: SW register (absolute path) + Install prompt button
 */
(() => {
  "use strict";

  
  // ===== HIGACHA settings =====
  const HIGACHA_PROB_1 = 0.70; // 70% -> +1 HKP, else +2
  const HIGACHA_LAST_KEY = "hklobby.v1.higacha.lastDate";
// -------------------------
  // helpers
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const on = (node, ev, fn, opt) => node && node.addEventListener(ev, fn, opt);

  // ===== EXPERT button injection (kokugo-dojo) =====
function ensureExpertButtonStyle() {
  // 二重注入防止
  if (document.getElementById("expertBtnStyle")) return;

  const style = document.createElement("style");
  style.id = "expertBtnStyle";
  style.textContent = `
    /* EXPERTボタン：形状は触らず、見た目だけ差別化（青系グロー＋斜線） */
    a.btn-expert{
      /* サイズ/形状に関わるもの（padding, border-radius, font-size等）は触らない */
      color: rgba(225, 250, 255, 0.98) !important;
      border-color: rgba(0, 229, 255, 0.55) !important;

      /* “特別挑戦”の雰囲気：薄い斜線＋発光 */
      background-image:
        linear-gradient(180deg, rgba(0, 229, 255, 0.18), rgba(0, 0, 0, 0.10)),
        repeating-linear-gradient(
          135deg,
          rgba(0, 229, 255, 0.12) 0px,
          rgba(0, 229, 255, 0.12) 6px,
          rgba(0, 0, 0, 0.0) 6px,
          rgba(0, 0, 0, 0.0) 12px
        ) !important;

      box-shadow:
        0 0 0 1px rgba(0, 229, 255, 0.18) inset,
        0 0 18px rgba(0, 229, 255, 0.18) !important;

      text-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
      position: relative;
      overflow: hidden;
      isolation: isolate;
    }

    /* ホバー時だけ少し強く（形状変更なし） */
    a.btn-expert:hover{
      box-shadow:
        0 0 0 1px rgba(0, 229, 255, 0.22) inset,
        0 0 26px rgba(0, 229, 255, 0.26) !important;
      filter: brightness(1.03);
    }

    /* “脈動”は控えめに（チカチカ禁止） */
    @keyframes expertPulse{
      0%   { box-shadow: 0 0 0 1px rgba(0,229,255,.16) inset, 0 0 16px rgba(0,229,255,.14); }
      50%  { box-shadow: 0 0 0 1px rgba(0,229,255,.22) inset, 0 0 26px rgba(0,229,255,.22); }
      100% { box-shadow: 0 0 0 1px rgba(0,229,255,.16) inset, 0 0 16px rgba(0,229,255,.14); }
    }
    a.btn-expert{ animation: expertPulse 3.2s ease-in-out infinite; }

    /* 左上に小さく “EX” バッジ（レイアウトに影響しない absolute） */
    a.btn-expert::after{
      content: "EX";
      position: absolute;
      top: -6px;
      left: -6px;
      z-index: 1;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      padding: 6px 7px;
      border-radius: 999px;
      background: rgba(0, 229, 255, 0.22);
      border: 1px solid rgba(0, 229, 255, 0.40);
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.18);
      color: rgba(240, 255, 255, 0.98);
      pointer-events: none;
    }
  `;

  document.head.appendChild(style);
}

function injectExpertButtonForKobun330() {
  ensureExpertButtonStyle();

  // 「古文単語330マスター」を含むブロックを探す（HTML変更に強い）
  const roots = Array.from(document.querySelectorAll("section, article, div, li"))
    .filter((el) => (el.textContent || "").includes("古文単語330マスター"));

  if (!roots.length) return;

  for (const root of roots) {
    // STARTリンク（kobun-quiz本体）を探す
    const startLink =
      root.querySelector('a[href="https://naoki496.github.io/kobun-quiz/"]') ||
      root.querySelector('a[href^="https://naoki496.github.io/kobun-quiz/"]');

    if (!startLink) continue;

    // 二重追加防止
    if (root.querySelector('a[href*="kobun-quiz/expert.html"]')) return;

    // STARTをクローンして見た目・サイズを完全一致させる（形状維持）
    const expertLink = startLink.cloneNode(true);
    expertLink.textContent = "EXPERT";
    expertLink.setAttribute("href", "https://naoki496.github.io/kobun-quiz/expert.html");

    // 差別化はクラスで（padding等には触らない）
    expertLink.classList.add("btn-expert");

    // 左に置くため、2つを横並びにする
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "center";
    row.style.justifyContent = "flex-start";
    row.style.flexWrap = "wrap";

    const parent = startLink.parentElement;
    if (!parent) return;

    parent.insertBefore(row, startLink);
    row.appendChild(expertLink);
    row.appendChild(startLink);

    return;
  }
}
  
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hostnameOf(url) {
    try { return new URL(url).hostname; } catch { return ""; }
  }

  function extractUrls(line) {
    const s = String(line ?? "");
    const urlRe = /(https?:\/\/[^\s]+)/g;
    const urls = [];
    let m;
    while ((m = urlRe.exec(s)) !== null) urls.push(m[1]);
    const textOnly = s.replace(urlRe, "").replace(/\s{2,}/g, " ").trim();
    return { textOnly, urls };
  }

  // "表示||詳細" 形式
  function splitDetail(line) {
    const s = String(line ?? "");
    const parts = s.split("||");
    if (parts.length < 2) return { main: s.trim(), detail: null };
    const main = parts[0].trim();
    const detail = parts.slice(1).join("||").trim();
    return { main, detail: detail.length ? detail : null };
  }

  // -------------------------
  // UI: menus
  // -------------------------
  
  // -------------------------
  // HKP + Higacha (daily)
  // -------------------------
  const HKP_KEY = "hklobby.v1.hkp";
  
  function todayYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getHKP() {
    const n = Number(localStorage.getItem(HKP_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  function setHKP(n) {
    const v = Math.max(0, Math.trunc(Number(n) || 0));
    localStorage.setItem(HKP_KEY, String(v));
    return v;
  }

  function addHKP(delta) {
    return setHKP(getHKP() + (Number(delta) || 0));
  }

  function canHigachaToday() {
    const last = String(localStorage.getItem(HIGACHA_LAST_KEY) || "");
    return last !== todayYMD();
  }

  function markHigachaDoneToday() {
    localStorage.setItem(HIGACHA_LAST_KEY, todayYMD());
  }

  function initHKPPanel() {
    const vEl = $("hkpValue");
    const btn = $("btnHigacha");
    if (!vEl || !btn) return;

    
    const helpBtn = $("btnHkpHelp");
    const helpOverlay = $("hkpHelpOverlay");
    const helpClose = $("hkpHelpClose");
    const helpBody = $("hkpHelpBody");
    let helpLastFocus = null;

    const HKP_HELP_TEXT =
`★HKPとは？
Higashi Kokugo Pointの略称。
BLITZ QUESTの通常10問モードを学習時、
一定条件でHKPを入手できます。

また、TOPページの「HIGACHA」を回すことでも
1HKPを入手できます。
時々2HKP入手できることも…？
※HIGACHAは1日1回まで回せます

HKPを消費することで、今後実装予定の
「EXPERT MODE」への挑戦や、その他の機能を
使用できるようになる、かもしれません。`;

    function openHelpModal() {
      helpLastFocus = document.activeElement;
      if (!helpOverlay || !helpClose || !helpBody) return;
      helpBody.textContent = HKP_HELP_TEXT;
      helpOverlay.style.display = "flex";
      helpOverlay.setAttribute("aria-hidden", "false");
      helpClose.focus();
    }

    function closeHelpModal() {
      if (!helpOverlay) return;
      // avoid aria-hidden focus warning
      (helpBtn || helpLastFocus)?.focus?.();
      helpOverlay.style.display = "none";
      helpOverlay.setAttribute("aria-hidden", "true");
    }

    // ---- HKP help events ----
    if (helpBtn) helpBtn.addEventListener("click", openHelpModal);
    if (helpClose) helpClose.addEventListener("click", closeHelpModal);
    if (helpOverlay) helpOverlay.addEventListener("click", (e) => {
      if (e.target === helpOverlay) closeHelpModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && helpOverlay && helpOverlay.style.display !== "none") {
        closeHelpModal();
      }
    });

function render() {
      vEl.textContent = String(getHKP());
      const ok = canHigachaToday();
      btn.disabled = !ok;
      btn.setAttribute("aria-disabled", String(!ok));
    }

    const overlay = $("higachaOverlay");
    const closeBtn = $("higachaClose");
    const cancelBtn = $("higachaCancel");
    const drawBtn = $("higachaDraw");
    const msgEl = $("higachaMsg");

    let lastFocus = null;

    function openModal() {
      lastFocus = document.activeElement;
      if (!overlay || !closeBtn || !cancelBtn || !drawBtn || !msgEl) return;
      const ok = canHigachaToday();
      if (ok) {
        msgEl.innerHTML = `<div class="higacha-lead">本日のHIGACHAを実行します。</div><div class="higacha-note">結果により <b>+1</b> または <b>+2</b> HKP を獲得します。</div>`;
        drawBtn.disabled = false;
        drawBtn.style.opacity = "";
      } else {
        msgEl.innerHTML = `<div class="higacha-lead">本日のHIGACHAは使用済みです。</div><div class="higacha-note">また明日、試せます。</div>`;
        drawBtn.disabled = true;
        drawBtn.style.opacity = "0.45";
      }
      overlay.style.display = "flex";
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeModal() {
      if (!overlay) return;
      // move focus OUT of the modal before hiding / aria-hidden
      try {
        (lastFocus && typeof lastFocus.focus === "function") ? lastFocus.focus() : (btn && btn.focus());
      } catch {}
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      render();
    }

    on(btn, "click", openModal);
    on(closeBtn, "click", closeModal);
    on(cancelBtn, "click", closeModal);
    on(overlay, "click", (e) => { if (e.target === overlay) closeModal(); });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && overlay && overlay.style.display === "flex") closeModal();
    });

    on(drawBtn, "click", () => {
      if (!canHigachaToday()) { render(); return; }
      const gain = (Math.random() < 0.70) ? 1 : 2;
      addHKP(gain);
      markHigachaDoneToday();
      if (msgEl) msgEl.innerHTML = `<div class="higacha-result"><div class="higacha-result-title">RESULT</div><div class="higacha-result-gain">+${gain}<span class="higacha-result-unit">HKP</span></div><div class="higacha-result-total">TOTAL ${getHKP()} HKP</div></div>`;
      if (drawBtn) { drawBtn.disabled = true; drawBtn.style.opacity = "0.45"; }
      render();
    });

    render();
  }


  function initMenus() {
    // FLASH
    const btnFlash = $("btnFlash");
    const flashMenu = $("flashMenu");
    const btnBack = $("btnBack");

    on(btnFlash, "click", () => {
      if (flashMenu) flashMenu.style.display = "grid";
      if (btnFlash) btnFlash.style.display = "none";
    });

    on(btnBack, "click", () => {
      if (flashMenu) flashMenu.style.display = "none";
      if (btnFlash) btnFlash.style.display = "block";
    });

    // BLITZ
    const btnDojo = $("btnDojo");
    const dojoMenu = $("dojoMenu");
    const btnDojoBack = $("btnDojoBack");
    const btnCardHub = $("btnCardHub");

    function startCardHubPulseDelayed() {
      if (!btnCardHub) return;
      btnCardHub.classList.remove("is-pulsing");
      window.setTimeout(() => btnCardHub.classList.add("is-pulsing"), 520);
    }

    on(btnDojo, "click", () => {
      if (dojoMenu) dojoMenu.style.display = "grid";
      if (btnDojo) btnDojo.style.display = "none";
      startCardHubPulseDelayed();
    });

    on(btnDojoBack, "click", () => {
      if (dojoMenu) dojoMenu.style.display = "none";
      if (btnDojo) btnDojo.style.display = "block";
      if (btnCardHub) btnCardHub.classList.remove("is-pulsing");
    });
  }

  // -------------------------
  // Modal: detail
  // -------------------------
  function initDetailModal() {
    const overlay = $("detailOverlay");
    const btnClose = $("detailClose");
    const titleEl = $("detailTitle");
    const bodyEl = $("detailBody");
    const linksWrap = $("detailLinksWrap");
    const linksEl = $("detailLinks");

    // モーダルDOMが無い場合でも落とさない
    if (!overlay || !btnClose || !titleEl || !bodyEl || !linksWrap || !linksEl) {
      return { bindButtons: () => {} };
    }

    function open(titleText, detailText) {
      titleEl.textContent = titleText || "DETAIL";

      // "\n" 表記を改行として扱う
      const raw = String(detailText ?? "").replaceAll("\\n", "\n");

      // URL抽出（改行は保持）
      const urlRe = /(https?:\/\/[^\s]+)/g;
      const urls = raw.match(urlRe) ?? [];

      // 本文はURLだけ除去（改行保持）
      const bodyText = raw
        .replace(urlRe, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      bodyEl.textContent = bodyText.length ? bodyText : raw;

      // リンク領域（URL無なら領域ごと消す＝空欄が消える）
      linksEl.innerHTML = "";
      if (urls.length) {
        linksEl.innerHTML = urls.map((u, i) => {
          const host = hostnameOf(u);
          const label = (urls.length === 1) ? "LINK" : `LINK ${i + 1}`;
          const tip = host ? `${host} — ${u}` : u;
          return `<a class="brief-open" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(tip)}">${escapeHtml(label)}</a>`;
        }).join("");
        linksWrap.style.display = "block";
      } else {
        linksWrap.style.display = "none";
      }

      overlay.style.display = "flex";
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      btnClose.focus();
    }

    function close() {
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    on(btnClose, "click", close);
    on(overlay, "click", (e) => { if (e.target === overlay) close(); });
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && overlay.style.display === "flex") close();
    });

    function bindButtons(container) {
      if (!container) return;
      container.querySelectorAll(".brief-detail-btn").forEach((btn) => {
        on(btn, "click", () => {
          const detail = btn.getAttribute("data-detail") || "";
          open("DETAIL", detail);
        });
      });
    }

    return { bindButtons };
  }

  // -------------------------
  // Mission brief
  // -------------------------
  function initMissionBrief(modalApi) {
    const briefList = $("briefList");
    const briefTag = $("briefTag");
    const briefDate = $("briefDate");
    if (!briefList || !briefTag || !briefDate) return;

    function setDateBadge() {
      const d = new Date();
      briefDate.textContent =
        d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }

    function renderBriefLine(line) {
      const { main, detail } = splitDetail(line);
      const { textOnly, urls } = extractUrls(main);

      const displayText = (textOnly && textOnly.length) ? textOnly : "LINK";

      let linksHtml = "";
      if (urls.length > 0) {
        linksHtml = `<span class="brief-links">` + urls.map((u, i) => {
          const host = hostnameOf(u);
          const label = (urls.length === 1) ? "LINK" : `LINK ${i + 1}`;
          const tip = host ? `${host} — ${u}` : u;
          return `<a class="brief-open" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(tip)}">${escapeHtml(label)}</a>`;
        }).join("") + `</span>`;
      }

      const detailBtn = detail
        ? `<button class="brief-detail-btn" type="button" data-detail="${escapeHtml(detail)}">詳細</button>`
        : "";

      const liClass = (urls.length || detail) ? "has-link" : "";

      return `
        <li class="${liClass}">
          <span class="dot"></span>
          <span class="brief-text">${escapeHtml(displayText)}${linksHtml}${detailBtn}</span>
        </li>
      `;
    }

    async function loadMissionBrief() {
      setDateBadge();
      try {
        const url = "mission-brief.txt?t=" + Date.now();
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();

        let lines = text
          .split(/\r?\n/)
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .slice(0, 12);

        let hasNew = false;
        lines = lines.map(line => {
          if (/^NEW\s*:/i.test(line)) {
            hasNew = true;
            return line.replace(/^NEW\s*:\s*/i, "");
          }
          return line;
        });

        if (lines.length === 0) {
          briefList.innerHTML = renderBriefLine("（指令なし）");
          briefTag.textContent = "EMPTY";
          briefTag.classList.remove("is-new");
          return;
        }

        briefList.innerHTML = lines.map(renderBriefLine).join("");
        modalApi?.bindButtons?.(briefList);

        if (hasNew) {
          briefTag.textContent = "NEW";
          briefTag.classList.add("is-new");
        } else {
          briefTag.textContent = "LIVE";
          briefTag.classList.remove("is-new");
        }
      } catch {
        briefList.innerHTML = renderBriefLine("（通信エラー：後で再読込してください）");
        briefTag.textContent = "OFFLINE";
        briefTag.classList.remove("is-new");
        setDateBadge();
      }
    }

    loadMissionBrief();
  }

  // -------------------------
  // PWA: minimal SW register (absolute path for GitHub Pages subdir)
  // -------------------------
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/kokugo-dojo/sw.js").catch(() => {
        // fail silently (do not break UI)
      });
    });
  }

function initInstallPrompt() {
  const box = document.getElementById("installBox");
  const btn = document.getElementById("installBtn");
  if (!box || !btn) return;

  // 既にPWA起動なら出さない
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true; // iOS向け（基本falseになる）

  if (isStandalone) {
    box.style.display = "none";
    return;
  }

  let deferred = null;

  // Android Chrome が「今なら入れられる」と判断した時だけ発火
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();          // 自前ボタン運用
    deferred = e;
    box.style.display = "block"; // ✅ 出せる時だけ出す
  });

  btn.addEventListener("click", async () => {
    if (!deferred) return;
    box.style.display = "none";  // 押したら一旦隠す（UX）
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
  });

  // インストール完了したら消す
  window.addEventListener("appinstalled", () => {
    box.style.display = "none";
    deferred = null;
  });
}

  // -------------------------
  // boot
  // -------------------------
  document.addEventListener("DOMContentLoaded", () => {
    registerServiceWorker();
    initInstallPrompt()
    initMenus();
        initHKPPanel();

    injectExpertButtonForKobun330(); // 
    
    const modalApi = initDetailModal();
    initMissionBrief(modalApi);
  });
})();
