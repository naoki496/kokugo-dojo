/* home.js (kokugo-dojo)
 * - FLASH/BLITZ menu toggle
 * - Card Hub pulse delayed
 * - MISSION BRIEF loader (mission-brief.txt)
 * - Detail modal (line syntax: "表示||詳細", NEW: prefix)
 * - PWA: SW register (absolute path) + Install prompt button
 */
(() => {
  "use strict";

  // -------------------------
  // helpers
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const on = (node, ev, fn, opt) => node && node.addEventListener(ev, fn, opt);

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

  // -------------------------
  // PWA: install prompt button (Android向け：ショートカット化を回避)
  //  - index.html に #btnInstall がある前提
  // -------------------------
  let deferredInstallPrompt = null;

  function initInstallButton() {
    const btn = $("btnInstall");
    if (!btn) return;

    // インストール可能判定が来たらボタンを表示
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      btn.style.display = "inline-flex";
    });

    // クリックで prompt()
    on(btn, "click", async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      try {
        const choice = await deferredInstallPrompt.userChoice;
        console.log("[PWA] install choice:", choice?.outcome);
      } catch {}

      deferredInstallPrompt = null;
      btn.style.display = "none";
    });

    // インストール完了イベント
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      btn.style.display = "none";
      console.log("[PWA] appinstalled");
    });
  }

  // -------------------------
  // boot
  // -------------------------
  document.addEventListener("DOMContentLoaded", () => {
    registerServiceWorker();
    initInstallButton();

    initMenus();
    const modalApi = initDetailModal();
    initMissionBrief(modalApi);
  });
})();
