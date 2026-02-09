/* home.js (HK LOBBY / kokugo-dojo index.html 用)
 * - FLASH/BLITZ の展開
 * - カード図鑑ボタンの 1拍遅れ脈動
 * - MISSION BRIEF: mission-brief.txt を読み込み表示（NEW判定、LINK抽出、詳細モーダル）
 *
 * 前提: index.html 内のID/クラスは提示版のまま
 */

(() => {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function extractUrls(line){
    const s = String(line ?? "");
    const urlRe = /(https?:\/\/[^\s]+)/g;
    const urls = [];
    let m;
    while((m = urlRe.exec(s)) !== null){
      urls.push(m[1]);
    }
    const textOnly = s.replace(urlRe, "").replace(/\s{2,}/g, " ").trim();
    return { textOnly, urls };
  }

  function hostnameOf(url){
    try{ return new URL(url).hostname; }catch{ return ""; }
  }

  // "表示||詳細" 形式をパース（詳細がなければ null）
  function splitDetail(line){
    const s = String(line ?? "");
    const parts = s.split("||");
    if(parts.length < 2) return { main: s.trim(), detail: null };
    const main = parts[0].trim();
    const detail = parts.slice(1).join("||").trim();
    return { main, detail: detail.length ? detail : null };
  }

  function setDateBadge(elBriefDate){
    const d = new Date();
    elBriefDate.textContent =
      d.getFullYear() + "-" +
      String(d.getMonth()+1).padStart(2,"0") + "-" +
      String(d.getDate()).padStart(2,"0");
  }

  // ===== モーダル制御 =====
  function setupDetailModal(){
    const detailOverlay   = $("detailOverlay");
    const detailClose     = $("detailClose");
    const detailTitle     = $("detailTitle");
    const detailBody      = $("detailBody");
    const detailLinks     = $("detailLinks");
    const detailLinksWrap = $("detailLinksWrap");

    if (!detailOverlay || !detailClose || !detailTitle || !detailBody || !detailLinks || !detailLinksWrap) {
      return { open: () => {}, close: () => {} };
    }

    function open(titleText, detailText){
      detailTitle.textContent = titleText || "DETAIL";

      // mission-brief.txt 内で "\n" と書いたものを改行として表示する
      const raw = String(detailText ?? "").replaceAll("\\n", "\n");

      // URL抽出
      const urlRe = /(https?:\/\/[^\s]+)/g;
      const urls = raw.match(urlRe) ?? [];

      // 本文：URL除去、改行維持（\sではなく空白・タブのみ整形）
      const bodyText = raw
        .replace(urlRe, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      detailBody.textContent = bodyText.length ? bodyText : raw;

      // 詳細内リンク（URLが無いなら領域ごと消す）
      detailLinks.innerHTML = "";
      if(urls.length){
        detailLinks.innerHTML = urls.map((u, i) => {
          const host = hostnameOf(u);
          const label = (urls.length === 1) ? "LINK" : `LINK ${i+1}`;
          const title = host ? `${host} — ${u}` : u;
          return `<a class="brief-open" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}">${escapeHtml(label)}</a>`;
        }).join("");
        detailLinksWrap.style.display = "block";
      }else{
        detailLinksWrap.style.display = "none";
      }

      detailOverlay.style.display = "flex";
      detailOverlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      detailClose.focus();
    }

    function close(){
      detailOverlay.style.display = "none";
      detailOverlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    detailClose.addEventListener("click", close);
    detailOverlay.addEventListener("click", (e) => {
      if(e.target === detailOverlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && detailOverlay.style.display === "flex") close();
    });

    return { open, close };
  }

  // ===== MISSION BRIEF 描画 =====
  function renderBriefLine(line){
    const { main, detail } = splitDetail(line);

    const { textOnly, urls } = extractUrls(main);
    const displayText = (textOnly && textOnly.length) ? textOnly : "LINK";

    let linksHtml = "";
    if(urls.length > 0){
      linksHtml = `<span class="brief-links">` + urls.map((u, i) => {
        const host = hostnameOf(u);
        const label = (urls.length === 1) ? "LINK" : `LINK ${i+1}`;
        const title = host ? `${host} — ${u}` : u;
        return `<a class="brief-open" href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}">${escapeHtml(label)}</a>`;
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

  async function loadMissionBrief(modal){
    const briefList = $("briefList");
    const briefTag  = $("briefTag");
    const briefDate = $("briefDate");

    if (!briefList || !briefTag || !briefDate) return;

    setDateBadge(briefDate);

    try{
      const url = "mission-brief.txt?t=" + Date.now();
      const res = await fetch(url, { cache: "no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();

      let lines = text
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 12);

      let hasNew = false;
      lines = lines.map(line => {
        if(/^NEW\s*:/i.test(line)){
          hasNew = true;
          return line.replace(/^NEW\s*:\s*/i, "");
        }
        return line;
      });

      if(lines.length === 0){
        briefList.innerHTML = renderBriefLine("（指令なし）");
        briefTag.textContent = "EMPTY";
        briefTag.classList.remove("is-new");
        return;
      }

      briefList.innerHTML = lines.map(renderBriefLine).join("");

      // 詳細ボタン
      briefList.querySelectorAll(".brief-detail-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const detail = btn.getAttribute("data-detail") || "";
          modal.open("DETAIL", detail);
        });
      });

      if(hasNew){
        briefTag.textContent = "NEW";
        briefTag.classList.add("is-new");
      }else{
        briefTag.textContent = "LIVE";
        briefTag.classList.remove("is-new");
      }

    }catch(_){
      briefList.innerHTML = renderBriefLine("（通信エラー：後で再読込してください）");
      briefTag.textContent = "OFFLINE";
      briefTag.classList.remove("is-new");
      setDateBadge(briefDate);
    }
  }

  // ===== メニュー展開（FLASH / BLITZ） =====
  function setupMenus(){
    const btnFlash  = $("btnFlash");
    const flashMenu = $("flashMenu");
    const btnBack   = $("btnBack");

    if (btnFlash && flashMenu && btnBack) {
      btnFlash.addEventListener("click", () => {
        flashMenu.style.display = "grid";
        btnFlash.style.display = "none";
      });

      btnBack.addEventListener("click", () => {
        flashMenu.style.display = "none";
        btnFlash.style.display = "block";
      });
    }

    const btnDojo     = $("btnDojo");
    const dojoMenu    = $("dojoMenu");
    const btnDojoBack = $("btnDojoBack");
    const btnCardHub  = $("btnCardHub");

    function startCardHubPulseDelayed(){
      if (!btnCardHub) return;
      btnCardHub.classList.remove("is-pulsing");
      window.setTimeout(() => {
        btnCardHub.classList.add("is-pulsing");
      }, 520);
    }

    if (btnDojo && dojoMenu && btnDojoBack) {
      btnDojo.addEventListener("click", () => {
        dojoMenu.style.display = "grid";
        btnDojo.style.display = "none";
        startCardHubPulseDelayed();
      });

      btnDojoBack.addEventListener("click", () => {
        dojoMenu.style.display = "none";
        btnDojo.style.display = "block";
        if (btnCardHub) btnCardHub.classList.remove("is-pulsing");
      });
    }
  }

  // ===== Boot =====
  document.addEventListener("DOMContentLoaded", () => {
    setupMenus();
    const modal = setupDetailModal();
    loadMissionBrief(modal);
  });

})();
