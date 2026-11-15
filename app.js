// Ứng dụng Bảng Tuần Hoàn 108 Nguyên Tố Hóa Học Trực Quan (Tối ưu UX/UI đa thiết bị: Điện thoại, Tablet, Laptop & Desktop + Mã QR)
(function () {
  "use strict";

  const ALL_ELEMENTS = window.ELEMENTS_DATA || [];

  // Bảng màu neon đặc trưng theo nhóm nguyên tố
  const CATEGORY_COLORS = {
    "alkali-metal": "#ff5c7c",
    "alkaline-earth": "#ff9e44",
    "transition-metal": "#38bdf8",
    "post-transition": "#34d399",
    "metalloid": "#2dd4bf",
    "nonmetal": "#a3e635",
    "halogen": "#facc15",
    "noble-gas": "#c084fc",
    "lanthanide": "#f472b6",
    "actinide": "#fb7185",
    "superheavy": "#94a3b8"
  };

  const CATEGORY_LIST = [
    { id: "all", label: "Tất cả nhóm", color: "#38bdf8" },
    { id: "alkali-metal", label: "Kim loại kiềm", color: CATEGORY_COLORS["alkali-metal"] },
    { id: "alkaline-earth", label: "Kim loại kiềm thổ", color: CATEGORY_COLORS["alkaline-earth"] },
    { id: "transition-metal", label: "Kim loại chuyển tiếp", color: CATEGORY_COLORS["transition-metal"] },
    { id: "post-transition", label: "Kim loại hậu chuyển tiếp", color: CATEGORY_COLORS["post-transition"] },
    { id: "metalloid", label: "Á kim", color: CATEGORY_COLORS["metalloid"] },
    { id: "nonmetal", label: "Phi kim", color: CATEGORY_COLORS["nonmetal"] },
    { id: "halogen", label: "Halogen", color: CATEGORY_COLORS["halogen"] },
    { id: "noble-gas", label: "Khí hiếm", color: CATEGORY_COLORS["noble-gas"] },
    { id: "lanthanide", label: "Họ Lantan (Đất hiếm)", color: CATEGORY_COLORS["lanthanide"] },
    { id: "actinide", label: "Họ Actini (Phóng xạ)", color: CATEGORY_COLORS["actinide"] }
  ];

  // Tự động chọn chế độ hiển thị bảng phù hợp với kích thước màn hình lần đầu truy cập
  const isSmallMobileInit = window.innerWidth <= 640;

  // State của ứng dụng
  const state = {
    maxElements: 118, // Mặc định hiển thị đầy đủ 118 nguyên tố hóa học (từ H -> Og)
    activeView: "table", // 'table' | 'gallery' | 'compare' | 'qrcodes'
    tableSubmode: isSmallMobileInit ? "cards" : "grid18", // 'grid18' | 'cards'
    searchQuery: "",
    selectedCategory: "all",
    selectedPhase: "all",
    temperatureK: 298, // 25°C
    useCustomTemp: false,
    showTilePhotos: true,
    spotlightNumber: 79, // Mặc định nổi bật Vàng (Au)
    modalNumber: null,
    gallerySort: "number-asc",
    compareIds: [1, 79, 108], // Hiđrô, Vàng, Hassi (108)
    qrPayloadMode: "url" // 'url' | 'info' | 'wiki'
  };

  // Bộ nhớ đệm mã QR SVG để tăng tốc độ hiển thị
  const qrCache = new Map();

  // Tạo chuỗi nội dung mã hóa vào QR của từng nguyên tố
  function buildQRPayload(el, mode = state.qrPayloadMode) {
    if (mode === "wiki") {
      return el.source_url || `https://vi.wikipedia.org/wiki/${encodeURIComponent(el.name_vi)}`;
    }
    if (mode === "info") {
      return [
        `#${el.number} ${el.name_vi} (${el.symbol} - ${el.name_en})`,
        `Nhom: ${el.category_vi}`,
        `Nguyen tu khoi: ${el.atomic_mass} u`,
        `Cau hinh e: ${el.electron_configuration_semantic || el.electron_configuration}`,
        `Trang thai (25C): ${el.phase_vi}`
      ].join("\n");
    }
    const baseUrl =
      window.location.origin && window.location.origin !== "null"
        ? `${window.location.origin}${window.location.pathname}`
        : "http://localhost:8108/";
    return `${baseUrl}?element=${el.number}&symbol=${el.symbol}`;
  }

  // Sinh mã QR dạng SVG sắc nét cho mỗi nguyên tố bằng thư viện qrcode-generator
  function getElementQRCodeSVG(el, mode = state.qrPayloadMode) {
    const cacheKey = `${el.number}_${mode}`;
    if (qrCache.has(cacheKey)) {
      return qrCache.get(cacheKey);
    }

    const payload = buildQRPayload(el, mode);
    if (typeof window.qrcode === "function") {
      try {
        const qr = window.qrcode(0, "M");
        const utf8Bytes = unescape(encodeURIComponent(payload));
        qr.addData(utf8Bytes, "Byte");
        qr.make();
        const svgTag = qr.createSvgTag({
          cellSize: 3,
          margin: 1,
          scalable: true
        });
        qrCache.set(cacheKey, svgTag);
        return svgTag;
      } catch (err) {
        console.warn("QR generation fallback for element", el.number, err);
      }
    }

    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#fff"/>
      <rect x="8" y="8" width="26" height="26" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="16" y="16" width="10" height="10" fill="#000"/>
      <rect x="66" y="8" width="26" height="26" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="74" y="16" width="10" height="10" fill="#000"/>
      <rect x="8" y="66" width="26" height="26" fill="none" stroke="#000" stroke-width="6"/>
      <rect x="16" y="74" width="10" height="10" fill="#000"/>
      <text x="64" y="72" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="22" fill="#000">${el.symbol}</text>
    </svg>`;
  }

  // Xuất và tải xuống Thẻ Mã QR của nguyên tố dưới dạng ảnh PNG chất lượng cao
  function downloadElementQRCard(el) {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 740;
    const ctx = canvas.getContext("2d");
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";

    ctx.fillStyle = "#070b17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = color;
    ctx.font = "bold 24px monospace";
    ctx.fillText(`SỐ HIỆU NGUYÊN TỬ #${el.number}`, 44, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(`${el.name_vi} (${el.symbol})`, 44, 122);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "22px sans-serif";
    ctx.fillText(`${el.name_en} • ${el.category_vi}`, 44, 158);

    const qrBoxSize = 390;
    const qrX = (canvas.width - qrBoxSize) / 2;
    const qrY = 190;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);

    const payload = buildQRPayload(el, state.qrPayloadMode);
    if (typeof window.qrcode === "function") {
      const qr = window.qrcode(0, "M");
      qr.addData(unescape(encodeURIComponent(payload)), "Byte");
      qr.make();
      const count = qr.getModuleCount();
      const padding = 24;
      const cellSize = (qrBoxSize - padding * 2) / count;

      ctx.fillStyle = "#070b17";
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(
              qrX + padding + c * cellSize,
              qrY + padding + r * cellSize,
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `Nguyên tử khối: ${el.atomic_mass} u  |  Cấu hình: ${el.electron_configuration_semantic || el.electron_configuration}`,
      canvas.width / 2,
      635
    );

    ctx.fillStyle = "#38bdf8";
    ctx.font = "17px sans-serif";
    ctx.fillText("Quét mã QR để tra cứu chi tiết nguyên tố hóa học", canvas.width / 2, 680);

    const link = document.createElement("a");
    link.download = `QR_${el.number}_${el.symbol}_${normalizeVi(el.name_vi).replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Tạo ảnh SVG trực quan chất lượng cao cho các nguyên tố siêu nặng / tổng hợp
  function createElementVisualDataURI(el) {
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const cpk = el.cpk_hex ? `#${el.cpk_hex}` : color;
    const shells = (el.shells || [2, 8, 18]).join(" • ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="bg_${el.number}" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.42"/>
          <stop offset="55%" stop-color="#0f172a" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#050811" stop-opacity="1"/>
        </radialGradient>
        <radialGradient id="core_${el.number}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="${cpk}"/>
          <stop offset="100%" stop-color="${color}"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg_${el.number})"/>
      <g stroke="${color}" stroke-opacity="0.28" fill="none" transform="translate(200,145)">
        <circle r="48" stroke-dasharray="4 3" stroke-width="1.5"/>
        <circle r="78" stroke-width="1.2"/>
        <circle r="108" stroke-dasharray="6 4" stroke-width="1.2"/>
        <ellipse rx="115" ry="38" transform="rotate(-28)" stroke-opacity="0.5" stroke-width="1.8"/>
        <ellipse rx="115" ry="38" transform="rotate(32)" stroke-opacity="0.5" stroke-width="1.8"/>
      </g>
      <circle cx="200" cy="145" r="34" fill="url(#core_${el.number})" opacity="0.9"/>
      <text x="24" y="42" fill="rgba(255,255,255,0.75)" font-family="monospace" font-size="20" font-weight="bold">Z = ${el.number}</text>
      <text x="376" y="42" fill="${color}" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">${el.category_vi}</text>
      <text x="200" y="158" fill="#070b17" font-family="sans-serif" font-size="34" font-weight="900" text-anchor="middle">${el.symbol}</text>
      <text x="200" y="248" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">${el.name_vi} (${el.name_en})</text>
      <text x="200" y="274" fill="#94a3b8" font-family="monospace" font-size="13" text-anchor="middle">Lớp vỏ e⁻: ${shells}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function getElementImageSrc(el) {
    if (el.image_url && el.image_url.trim() !== "") {
      return el.image_url;
    }
    return createElementVisualDataURI(el);
  }

  // Tính trạng thái vật chất (Rắn / Lỏng / Khí) theo nhiệt độ Kelvin đang chọn
  function getEffectivePhase(el) {
    if (!state.useCustomTemp) {
      return el.phase_en || "Solid";
    }
    const t = state.temperatureK;
    const melt = el.melt;
    const boil = el.boil;
    if (melt == null && boil == null) {
      return el.phase_en || "Solid";
    }
    if (boil != null && t >= boil) return "Gas";
    if (melt != null && t >= melt) return "Liquid";
    return "Solid";
  }

  function getPhaseLabelVi(phaseEn) {
    if (phaseEn === "Gas") return "Khí";
    if (phaseEn === "Liquid") return "Lỏng";
    return "Rắn";
  }

  function normalizeVi(str) {
    if (!str) return "";
    return str
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  function matchesFilters(el) {
    if (el.number > state.maxElements) return false;

    if (state.selectedCategory !== "all" && el.category_id !== state.selectedCategory) {
      return false;
    }

    const currentPhase = getEffectivePhase(el);
    if (state.selectedPhase !== "all" && currentPhase !== state.selectedPhase) {
      return false;
    }

    if (state.searchQuery.trim() !== "") {
      const q = normalizeVi(state.searchQuery.trim());
      const matchNum = el.number.toString() === q;
      const matchSym = el.symbol.toLowerCase().includes(q);
      const matchVi = normalizeVi(el.name_vi).includes(q);
      const matchEn = normalizeVi(el.name_en).includes(q);
      const matchCat = normalizeVi(el.category_vi).includes(q);
      return matchNum || matchSym || matchVi || matchEn || matchCat;
    }

    return true;
  }

  function getActiveScopeElements() {
    return ALL_ELEMENTS.filter((el) => el.number <= state.maxElements);
  }

  // Vẽ SVG mô hình nguyên tử Bohr động theo số electron thực tế trên từng lớp vỏ
  function renderBohrSVG(el, size = 160) {
    const shells = el.shells || [1];
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const center = size / 2;
    const maxRadius = size / 2 - 12;
    const minRadius = 18;
    const count = shells.length;
    const step = count > 1 ? (maxRadius - minRadius) / (count - 1) : 0;

    let ringsSvg = "";
    shells.forEach((elecCount, idx) => {
      const r = count === 1 ? (minRadius + maxRadius) / 2 : minRadius + idx * step;
      ringsSvg += `<circle cx="${center}" cy="${center}" r="${r.toFixed(1)}" fill="none" stroke="rgba(148,163,184,0.28)" stroke-width="1.1" />`;

      for (let i = 0; i < elecCount; i++) {
        const angle = (2 * Math.PI * i) / elecCount - Math.PI / 2;
        const ex = center + r * Math.cos(angle);
        const ey = center + r * Math.sin(angle);
        ringsSvg += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.4" fill="${color}" stroke="#070b17" stroke-width="0.7" />`;
      }
    });

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Mô hình nguyên tử Bohr của ${el.name_vi}">
        <g class="bohr-svg-spin" style="transform-origin: ${center}px ${center}px">
          ${ringsSvg}
        </g>
        <circle cx="${center}" cy="${center}" r="12" fill="${color}" opacity="0.92" />
        <text x="${center}" y="${center + 4}" text-anchor="middle" fill="#070b17" font-family="sans-serif" font-size="10.5" font-weight="900">${el.symbol}</text>
      </svg>
    `;
  }

  // Điều chỉnh vị trí Spotlight Card linh hoạt giữa Desktop/Laptop (nằm trong khoảng trống cột 3-12) và Mobile/Tablet/Chế độ Thẻ (nằm ở Dock phía trên)
  function syncSpotlightPlacement() {
    const spot = document.getElementById("tableSpotlight");
    const board = document.getElementById("periodicBoard");
    const dock = document.getElementById("mobileSpotlightDock");
    if (!spot || !board || !dock) return;

    const shouldDockTop = window.innerWidth <= 980 || state.tableSubmode === "cards";
    if (shouldDockTop) {
      if (spot.parentElement !== dock) {
        dock.appendChild(spot);
      }
      dock.style.display = "block";
    } else {
      if (spot.parentElement !== board) {
        board.insertBefore(spot, board.firstChild);
      }
      dock.style.display = "none";
    }
  }

  // Render Thanh Legend Nhóm Nguyên Tố
  function renderCategoryLegend() {
    const container = document.getElementById("categoryLegend");
    const scoped = getActiveScopeElements();

    container.innerHTML = CATEGORY_LIST.map((cat) => {
      const count =
        cat.id === "all"
          ? scoped.length
          : scoped.filter((e) => e.category_id === cat.id).length;
      const isActive = state.selectedCategory === cat.id ? "active" : "";
      return `
        <button type="button" class="cat-chip ${isActive}" data-cat="${cat.id}" style="--chip-color: ${cat.color}">
          <span class="cat-swatch"></span>
          <span>${cat.label}</span>
          <span class="cat-count">(${count})</span>
        </button>
      `;
    }).join("");

    container.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = btn.getAttribute("data-cat");
        state.selectedCategory = state.selectedCategory === chosen && chosen !== "all" ? "all" : chosen;
        renderAll();
      });
    });
  }

  // Render Spotlight Hero (Kèm Mã QR trực tiếp của nguyên tố)
  function renderSpotlight(el) {
    const spot = document.getElementById("tableSpotlight");
    if (!spot || !el) return;

    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const imgSrc = getElementImageSrc(el);
    const fallbackUri = createElementVisualDataURI(el);
    const effPhase = getEffectivePhase(el);
    const phaseVi = getPhaseLabelVi(effPhase);
    const qrSvg = getElementQRCodeSVG(el);

    spot.style.setProperty("--spot-color", color);
    spot.innerHTML = `
      <div class="spotlight-photo-box" id="spotlightPhotoClick" title="Nhấn để phóng to chi tiết ${el.name_vi}">
        <img src="${imgSrc}" alt="Hình ảnh nguyên tố ${el.name_vi}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
        <div class="spotlight-photo-tag">#${el.number} • ${el.category_vi}</div>
      </div>

      <div class="spotlight-info">
        <div class="spotlight-top-row">
          <span class="spotlight-symbol">${el.symbol}</span>
          <div class="spotlight-names">
            <h2>${el.name_vi}</h2>
            <span>(${el.name_en})</span>
          </div>
        </div>
        <p class="spotlight-desc">${el.summary_vi}</p>
        <div class="spotlight-metrics">
          <div class="spot-metric">
            <small>Nguyên tử khối</small>
            <strong>${el.atomic_mass} u</strong>
          </div>
          <div class="spot-metric">
            <small>Trạng thái (${state.temperatureK}K)</small>
            <strong>${phaseVi}</strong>
          </div>
          <div class="spot-metric">
            <small>Cấu hình e⁻</small>
            <strong>${el.electron_configuration_semantic || el.electron_configuration}</strong>
          </div>
          <div class="spot-metric">
            <small>Nóng chảy / Sôi</small>
            <strong>${el.melt ? el.melt + "K" : "—"} / ${el.boil ? el.boil + "K" : "—"}</strong>
          </div>
        </div>
      </div>

      <div class="spotlight-bohr-preview">
        <div class="spotlight-side-visuals">
          ${renderBohrSVG(el, 96)}
          <div class="spotlight-qr-mini" id="spotlightQRClick" title="Mã QR của ${el.name_vi} — Nhấn để phóng to hoặc tải về">
            ${qrSvg}
          </div>
        </div>
        <button type="button" class="spotlight-detail-btn" id="spotlightOpenModalBtn">
          Xem chi tiết &amp; Mã QR
        </button>
      </div>
    `;

    const openDetail = () => openElementModal(el.number);
    document.getElementById("spotlightPhotoClick")?.addEventListener("click", openDetail);
    document.getElementById("spotlightQRClick")?.addEventListener("click", openDetail);
    document.getElementById("spotlightOpenModalBtn")?.addEventListener("click", openDetail);
  }

  // Render Bảng Tuần Hoàn (18 Cột chuẩn & Lưới Thẻ Gọn cho Mobile)
  function renderPeriodicTable() {
    syncSpotlightPlacement();

    const scrollWrap = document.getElementById("periodicScrollContainer");
    const board = document.getElementById("periodicBoard");
    const compactGrid = document.getElementById("compactElementsGrid");
    const spotlightEl = document.getElementById("tableSpotlight");

    const isCardsSubmode = state.tableSubmode === "cards";
    if (scrollWrap) scrollWrap.hidden = isCardsSubmode;
    if (compactGrid) compactGrid.hidden = !isCardsSubmode;

    // Giữ lại spotlight node, xóa các ô cũ trên board 18 cột
    Array.from(board.children).forEach((child) => {
      if (child !== spotlightEl) child.remove();
    });

    // Thêm 2 ô chỉ dẫn Họ Lantan (57-71) và Họ Actini (89-103) tại cột 3, hàng 6 và 7
    const lanMarker = document.createElement("div");
    lanMarker.className = "series-marker";
    lanMarker.style.gridColumn = "3";
    lanMarker.style.gridRow = "6";
    lanMarker.innerHTML = `<strong>57–71</strong><span>Lantan</span>`;
    board.appendChild(lanMarker);

    const actMarker = document.createElement("div");
    actMarker.className = "series-marker";
    actMarker.style.gridColumn = "3";
    actMarker.style.gridRow = "7";
    actMarker.innerHTML = `<strong style="color:#fb7185">89–103</strong><span>Actini</span>`;
    board.appendChild(actMarker);

    const scopedElements = getActiveScopeElements();
    let matchedCount = 0;

    scopedElements.forEach((el) => {
      const isMatched = matchesFilters(el);
      if (isMatched) matchedCount++;

      const tile = document.createElement("article");
      const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
      const effPhase = getEffectivePhase(el);
      const imgSrc = getElementImageSrc(el);
      const fallbackUri = createElementVisualDataURI(el);

      tile.className = `el-tile ${!isMatched ? "dimmed" : ""} ${el.number === state.spotlightNumber ? "selected-tile" : ""}`;
      tile.style.gridColumn = String(el.xpos);
      tile.style.gridRow = String(el.ypos);
      tile.style.setProperty("--el-color", color);
      tile.setAttribute("data-number", String(el.number));
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", `${el.number}. ${el.name_vi} (${el.symbol})`);

      tile.innerHTML = `
        <img class="el-tile-bg-img" src="${imgSrc}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUri}';" />
        <div class="el-tile-top">
          <span>${el.number}</span>
          <span class="el-phase-indicator ${effPhase}" title="Trạng thái: ${getPhaseLabelVi(effPhase)}"></span>
        </div>
        <div class="el-tile-symbol">${el.symbol}</div>
        <div class="el-tile-bottom">
          <span class="el-tile-name">${el.name_vi}</span>
          <span class="el-tile-mass">${el.atomic_mass}</span>
        </div>
      `;

      tile.addEventListener("mouseenter", () => {
        if (window.matchMedia("(hover: hover)").matches) {
          state.spotlightNumber = el.number;
          board.querySelectorAll(".el-tile.selected-tile").forEach((n) => n.classList.remove("selected-tile"));
          tile.classList.add("selected-tile");
          renderSpotlight(el);
        }
      });

      tile.addEventListener("click", () => {
        state.spotlightNumber = el.number;
        renderSpotlight(el);
        openElementModal(el.number);
      });

      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openElementModal(el.number);
        }
      });

      board.appendChild(tile);
    });

    // Render Lưới Thẻ Gọn (Mobile Cards Submode)
    if (compactGrid && isCardsSubmode) {
      const filteredList = scopedElements.filter(matchesFilters);
      if (filteredList.length === 0) {
        compactGrid.innerHTML = `<div class="glass-panel" style="grid-column: 1/-1; padding: 24px; text-align: center; border-radius: 14px;">
          <p>Không tìm thấy nguyên tố phù hợp.</p>
        </div>`;
      } else {
        compactGrid.innerHTML = filteredList
          .map((el) => {
            const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
            return `
              <article class="compact-el-card" data-compact-num="${el.number}" style="--el-color: ${color}">
                <div class="compact-el-sym">
                  <small>#${el.number}</small>
                  <strong>${el.symbol}</strong>
                </div>
                <div class="compact-el-info">
                  <h4>${el.name_vi}</h4>
                  <p>${el.atomic_mass} u • ${el.phase_vi}</p>
                </div>
              </article>
            `;
          })
          .join("");

        compactGrid.querySelectorAll("[data-compact-num]").forEach((card) => {
          card.addEventListener("click", () => {
            const num = Number(card.getAttribute("data-compact-num"));
            state.spotlightNumber = num;
            const found = ALL_ELEMENTS.find((e) => e.number === num);
            if (found) renderSpotlight(found);
            openElementModal(num);
          });
        });
      }
    }

    document.getElementById("totalVisibleCount").textContent = String(matchedCount);

    const currentSpot =
      scopedElements.find((e) => e.number === state.spotlightNumber) || scopedElements[0];
    if (currentSpot) {
      renderSpotlight(currentSpot);
    }
  }

  // Render Bộ Sưu Tập Ảnh (Gallery View - Kèm nhãn Mã QR trên mỗi thẻ nguyên tố)
  function renderGalleryView() {
    const grid = document.getElementById("photoGalleryGrid");
    if (!grid) return;

    const list = getActiveScopeElements().filter(matchesFilters);

    list.sort((a, b) => {
      switch (state.gallerySort) {
        case "number-desc":
          return b.number - a.number;
        case "mass-asc":
          return (a.atomic_mass || 0) - (b.atomic_mass || 0);
        case "density-desc":
          return (b.density || -1) - (a.density || -1);
        case "melt-desc":
          return (b.melt || -1) - (a.melt || -1);
        case "name-vi":
          return a.name_vi.localeCompare(b.name_vi, "vi");
        default:
          return a.number - b.number;
      }
    });

    if (list.length === 0) {
      grid.innerHTML = `<div class="glass-panel" style="grid-column: 1/-1; padding: 36px; text-align: center; border-radius: 16px;">
        <h3>Không tìm thấy nguyên tố nào phù hợp với bộ lọc hiện tại</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Hãy thử xóa từ khóa tìm kiếm hoặc chọn lại nhóm Tất cả.</p>
      </div>`;
      return;
    }

    grid.innerHTML = list
      .map((el) => {
        const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
        const imgSrc = getElementImageSrc(el);
        const fallbackUri = createElementVisualDataURI(el);
        const effPhase = getEffectivePhase(el);
        const qrSvg = getElementQRCodeSVG(el);

        return `
          <article class="gallery-card" data-number="${el.number}" style="--el-color: ${color}">
            <div class="gallery-img-wrap">
              <img src="${imgSrc}" alt="Mẫu vật nguyên tố ${el.name_vi}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUri}';" />
              <span class="gallery-badge-num">#${el.number}</span>
              <div class="gallery-qr-badge" title="Mã QR của nguyên tố ${el.name_vi}">${qrSvg}</div>
              <div class="gallery-badge-symbol">${el.symbol}</div>
            </div>
            <div class="gallery-card-body">
              <div class="gallery-card-title">
                <h3>${el.name_vi}</h3>
                <span>${el.name_en}</span>
              </div>
              <span class="gallery-cat-tag">${el.category_vi}</span>
              <p class="gallery-card-desc">${el.summary_vi}</p>
              <div class="gallery-card-specs">
                <span>Khối lượng: ${el.atomic_mass} u</span>
                <span>Thể: ${getPhaseLabelVi(effPhase)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll(".gallery-card").forEach((card) => {
      card.addEventListener("click", () => {
        const num = Number(card.getAttribute("data-number"));
        openElementModal(num);
      });
    });
  }

  // Render Chế Độ So Sánh Trực Quan (Compare View)
  function populateCompareSelectors() {
    const scoped = getActiveScopeElements();
    const selects = [
      document.getElementById("compareSelect1"),
      document.getElementById("compareSelect2"),
      document.getElementById("compareSelect3")
    ];

    selects.forEach((sel, idx) => {
      if (!sel) return;
      const targetNum = Math.min(state.compareIds[idx] || 1, state.maxElements);
      state.compareIds[idx] = targetNum;

      sel.innerHTML = scoped
        .map(
          (el) =>
            `<option value="${el.number}" ${el.number === targetNum ? "selected" : ""}>#${el.number} — ${el.name_vi} (${el.symbol})</option>`
        )
        .join("");

      sel.onchange = () => {
        state.compareIds[idx] = Number(sel.value);
        renderCompareCards();
      };
    });
  }

  function renderCompareCards() {
    const container = document.getElementById("compareCardsGrid");
    if (!container) return;

    const chosen = state.compareIds.map((id) => ALL_ELEMENTS.find((e) => e.number === id)).filter(Boolean);
    const badge = document.getElementById("compareCountBadge");
    if (badge) badge.textContent = String(chosen.length);

    container.innerHTML = chosen
      .map((el) => {
        const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
        const imgSrc = getElementImageSrc(el);
        const fallbackUri = createElementVisualDataURI(el);
        const qrSvg = getElementQRCodeSVG(el);
        return `
          <article class="compare-card glass-panel" style="--el-color: ${color}">
            <div class="compare-card-top">
              <img src="${imgSrc}" alt="${el.name_vi}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
              <div style="flex:1; min-width:0;">
                <span class="gallery-cat-tag">${el.category_vi}</span>
                <h3 style="font-size: 1.25rem; margin-top: 4px;">#${el.number} ${el.name_vi} (${el.symbol})</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${el.name_en}</p>
              </div>
              <div class="spotlight-qr-mini" style="width:64px; height:64px; --spot-color:${color}" title="Mã QR của ${el.name_vi}">
                ${qrSvg}
              </div>
            </div>
            <div style="display:flex; justify-content:center; padding: 4px 0;">
              ${renderBohrSVG(el, 140)}
            </div>
            <div class="compare-prop-list">
              <div class="compare-prop-row"><span>Nguyên tử khối</span><strong>${el.atomic_mass} u</strong></div>
              <div class="compare-prop-row"><span>Cấu hình electron</span><strong>${el.electron_configuration_semantic || el.electron_configuration}</strong></div>
              <div class="compare-prop-row"><span>Chu kỳ / Nhóm</span><strong>Chu kỳ ${el.period} / Nhóm ${el.group || "Họ f"}</strong></div>
              <div class="compare-prop-row"><span>Trạng thái tiêu chuẩn</span><strong>${el.phase_vi}</strong></div>
              <div class="compare-prop-row"><span>Khối lượng riêng</span><strong>${el.density ? el.density + " g/cm³" : "Chưa xác định"}</strong></div>
              <div class="compare-prop-row"><span>Điểm nóng chảy</span><strong>${el.melt ? el.melt + " K (" + (el.melt - 273.15).toFixed(1) + " °C)" : "—"}</strong></div>
              <div class="compare-prop-row"><span>Điểm sôi</span><strong>${el.boil ? el.boil + " K (" + (el.boil - 273.15).toFixed(1) + " °C)" : "—"}</strong></div>
              <div class="compare-prop-row"><span>Độ âm điện Pauling</span><strong>${el.electronegativity || "—"}</strong></div>
              <div class="compare-prop-row"><span>Lớp vỏ electron</span><strong>${(el.shells || []).join(" - ")}</strong></div>
            </div>
            <div class="modal-info-box">
              <h4>Ứng dụng nổi bật</h4>
              <p>${el.applications_vi}</p>
            </div>
          </article>
        `;
      })
      .join("");
  }

  // Render VIEW 4: Bảng Mã QR Của Toàn Bộ Các Nguyên Tố Hóa Học
  function renderQRCodesView() {
    const grid = document.getElementById("qrCardsGrid");
    if (!grid) return;

    const list = getActiveScopeElements().filter(matchesFilters);

    if (list.length === 0) {
      grid.innerHTML = `<div class="glass-panel" style="grid-column: 1/-1; padding: 36px; text-align: center; border-radius: 16px;">
        <h3>Không tìm thấy mã QR nguyên tố nào phù hợp với bộ lọc</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Hãy thử xóa từ khóa tìm kiếm hoặc chọn lại nhóm Tất cả.</p>
      </div>`;
      return;
    }

    grid.innerHTML = list
      .map((el) => {
        const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
        const qrSvg = getElementQRCodeSVG(el, state.qrPayloadMode);

        return `
          <article class="qr-element-card" data-number="${el.number}" style="--el-color: ${color}">
            <div class="qr-card-header">
              <span class="qr-card-num">#${el.number}</span>
              <span class="gallery-cat-tag" style="font-size: 0.65rem;">${el.category_vi}</span>
              <span class="qr-card-sym">${el.symbol}</span>
            </div>

            <div class="qr-code-frame" data-open-modal="${el.number}" title="Quét mã QR hoặc nhấn để mở hồ sơ ${el.name_vi}">
              ${qrSvg}
            </div>

            <div class="qr-card-title">
              <h3>${el.name_vi}</h3>
              <span>${el.name_en}</span>
            </div>

            <div class="qr-card-meta">
              ${el.atomic_mass} u • ${el.electron_configuration_semantic || el.electron_configuration}
            </div>

            <div class="qr-card-actions">
              <button type="button" class="qr-card-btn" data-open-modal="${el.number}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Chi tiết</span>
              </button>
              <button type="button" class="qr-card-btn" data-download-qr="${el.number}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Tải PNG</span>
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll("[data-open-modal]").forEach((node) => {
      node.addEventListener("click", () => {
        const num = Number(node.getAttribute("data-open-modal"));
        openElementModal(num);
      });
    });

    grid.querySelectorAll("[data-download-qr]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const num = Number(btn.getAttribute("data-download-qr"));
        const el = ALL_ELEMENTS.find((item) => item.number === num);
        if (el) downloadElementQRCard(el);
      });
    });
  }

  // Mở Cửa Sổ Modal Chi Tiết Nguyên Tố (Tích hợp Mã QR & Nút Tải Thẻ QR PNG)
  function openElementModal(number) {
    const el = ALL_ELEMENTS.find((item) => item.number === number);
    if (!el) return;

    state.modalNumber = number;
    const modal = document.getElementById("elementModal");
    const body = document.getElementById("modalBodyContent");
    const catBadge = document.getElementById("modalCategoryBadge");
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";

    catBadge.textContent = el.category_vi;
    catBadge.style.borderColor = color;
    catBadge.style.color = color;

    const prevNum = number > 1 ? number - 1 : state.maxElements;
    const nextNum = number < state.maxElements ? number + 1 : 1;
    const prevEl = ALL_ELEMENTS.find((e) => e.number === prevNum);
    const nextEl = ALL_ELEMENTS.find((e) => e.number === nextNum);

    document.getElementById("prevElementLabel").textContent = `#${prevEl.number} ${prevEl.name_vi}`;
    document.getElementById("nextElementLabel").textContent = `#${nextEl.number} ${nextEl.name_vi}`;
    document.getElementById("prevElementBtn").onclick = () => openElementModal(prevNum);
    document.getElementById("nextElementBtn").onclick = () => openElementModal(nextNum);

    const imgSrc = getElementImageSrc(el);
    const fallbackUri = createElementVisualDataURI(el);
    const qrSvg = getElementQRCodeSVG(el);
    const meltC = el.melt != null ? `${(el.melt - 273.15).toFixed(1)} °C (${el.melt} K)` : "Chưa xác định";
    const boilC = el.boil != null ? `${(el.boil - 273.15).toFixed(1)} °C (${el.boil} K)` : "Chưa xác định";

    body.innerHTML = `
      <div class="modal-hero-grid" style="--el-color: ${color}">
        <div class="modal-photo-card">
          <img src="${imgSrc}" alt="Hình ảnh thực tế của nguyên tố ${el.name_vi}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
          <div class="modal-photo-caption">
            <strong>Hình ảnh mẫu vật:</strong> ${el.image_title || el.name_vi}
          </div>
        </div>

        <div class="modal-main-summary">
          <div class="modal-title-row">
            <div class="modal-big-symbol">${el.symbol}</div>
            <div>
              <span style="font-family: var(--font-mono); color: ${color}; font-size: 0.84rem; font-weight: 700;">SỐ HIỆU NGUYÊN TỬ #${el.number}</span>
              <h2 id="modalElementTitle" style="font-size: clamp(1.35rem, 2vw, 1.85rem); font-weight: 800; line-height: 1.15;">
                ${el.name_vi} <span style="font-weight: 400; color: var(--text-muted); font-size: 1.1rem;">(${el.name_en})</span>
              </h2>
            </div>
          </div>

          <div class="modal-info-box">
            <h4>Giới thiệu &amp; Đặc tính hóa lý</h4>
            <p>${el.summary_vi}</p>
          </div>

          <div class="modal-info-box">
            <h4>Ứng dụng trong đời sống &amp; công nghiệp</h4>
            <p>${el.applications_vi}</p>
          </div>
        </div>

        <div class="modal-side-stack">
          <div class="modal-bohr-card">
            <span style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 2px;">Mô hình Bohr động</span>
            ${renderBohrSVG(el, 126)}
            <div style="font-family: var(--font-mono); font-size: 0.72rem; color: ${color}; margin-top: 2px;">
              Lớp vỏ: [${(el.shells || []).join(", ")}]
            </div>
          </div>

          <div class="modal-qr-card">
            <span style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary);">Mã QR Nguyên Tố #${el.number} (${el.symbol})</span>
            <div class="modal-qr-box">
              ${qrSvg}
            </div>
            <button type="button" class="qr-download-btn" id="modalDownloadQRBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Tải Thẻ QR (.PNG)</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-specs-grid">
        <div class="spec-item"><small>Nguyên tử khối tiêu chuẩn</small><strong>${el.atomic_mass} u</strong></div>
        <div class="spec-item"><small>Cấu hình electron</small><strong>${el.electron_configuration_semantic || el.electron_configuration}</strong></div>
        <div class="spec-item"><small>Chu kỳ / Nhóm / Khối</small><strong>Chu kỳ ${el.period} • Nhóm ${el.group || "f"} • Khối ${el.block}-block</strong></div>
        <div class="spec-item"><small>Trạng thái vật chất (25°C)</small><strong>${el.phase_vi} (${el.phase_en})</strong></div>
        <div class="spec-item"><small>Khối lượng riêng</small><strong>${el.density != null ? el.density + " g/cm³" : "Dự đoán / Rất ngắn"}</strong></div>
        <div class="spec-item"><small>Nhiệt độ nóng chảy</small><strong>${meltC}</strong></div>
        <div class="spec-item"><small>Nhiệt độ sôi</small><strong>${boilC}</strong></div>
        <div class="spec-item"><small>Độ âm điện (Pauling)</small><strong>${el.electronegativity != null ? el.electronegativity : "Không xác định"}</strong></div>
        <div class="spec-item"><small>Ái lực electron</small><strong>${el.electron_affinity != null ? el.electron_affinity + " kJ/mol" : "—"}</strong></div>
        <div class="spec-item"><small>Nhà khoa học phát hiện</small><strong>${el.discovered_by}</strong></div>
      </div>
    `;

    document.getElementById("modalDownloadQRBtn")?.addEventListener("click", () => {
      downloadElementQRCard(el);
    });

    modal.hidden = false;
  }

  function closeElementModal() {
    const modal = document.getElementById("elementModal");
    if (modal) modal.hidden = true;
    state.modalNumber = null;
  }

  // Render đồng bộ tất cả thành phần theo state hiện tại
  function renderAll() {
    renderCategoryLegend();
    renderPeriodicTable();
    if (state.activeView === "gallery") {
      renderGalleryView();
    } else if (state.activeView === "compare") {
      populateCompareSelectors();
      renderCompareCards();
    } else if (state.activeView === "qrcodes") {
      renderQRCodesView();
    }
  }

  // Kiểm tra URL parameter (?element=79 hoặc ?symbol=Au) khi người dùng quét mã QR
  function checkUrlQRCodeDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const elParam = params.get("element");
    const symParam = params.get("symbol");
    let targetEl = null;

    if (elParam) {
      const num = Number(elParam);
      targetEl = ALL_ELEMENTS.find((e) => e.number === num);
    } else if (symParam) {
      targetEl = ALL_ELEMENTS.find((e) => e.symbol.toLowerCase() === symParam.toLowerCase());
    }

    if (targetEl) {
      if (targetEl.number > state.maxElements) {
        state.maxElements = 118;
        document.getElementById("btnLimit108")?.classList.remove("active");
        document.getElementById("btnLimit118")?.classList.add("active");
      }
      state.spotlightNumber = targetEl.number;
      renderAll();
      openElementModal(targetEl.number);
    }
  }

  // Khởi tạo các sự kiện tương tác đa thiết bị
  function initEvents() {
    // Chuyển đổi phạm vi 108 vs 118 nguyên tố
    const btn108 = document.getElementById("btnLimit108");
    const btn118 = document.getElementById("btnLimit118");
    const badgeText = document.getElementById("headerBadgeText");

    function setElementLimit(limit) {
      state.maxElements = limit;
      btn108.classList.toggle("active", limit === 108);
      btn118.classList.toggle("active", limit === 118);
      badgeText.textContent =
        limit === 108
          ? "Bách Khoa 108 Nguyên Tố Hóa Học"
          : "Bách Khoa Đầy Đủ 118 Nguyên Tố IUPAC";
      if (state.spotlightNumber > limit) {
        state.spotlightNumber = limit;
      }
      renderAll();
    }

    btn108?.addEventListener("click", () => setElementLimit(108));
    btn118?.addEventListener("click", () => setElementLimit(118));

    // Đồng bộ nút chuyển chế độ xem trên cả Header (Desktop/Laptop) và Thanh điều hướng đáy (Mobile/Tablet)
    const viewButtons = document.querySelectorAll(".view-btn");
    const secTable = document.getElementById("viewTableSection");
    const secGallery = document.getElementById("viewGallerySection");
    const secCompare = document.getElementById("viewCompareSection");
    const secQRCodes = document.getElementById("viewQRCodesSection");

    viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        state.activeView = view;
        viewButtons.forEach((b) => {
          const active = b.getAttribute("data-view") === view;
          b.classList.toggle("active", active);
          b.setAttribute("aria-selected", String(active));
        });

        secTable.hidden = view !== "table";
        secGallery.hidden = view !== "gallery";
        secCompare.hidden = view !== "compare";
        if (secQRCodes) secQRCodes.hidden = view !== "qrcodes";

        renderAll();
      });
    });

    // Chuyển kiểu hiển thị trong tab Bảng Tuần Hoàn: Sơ đồ 18 cột vs Lưới Thẻ Gọn (Mobile)
    const btnGrid18 = document.getElementById("btnSubmodeGrid18");
    const btnCards = document.getElementById("btnSubmodeCards");

    function updateSubmodeButtons() {
      btnGrid18?.classList.toggle("active", state.tableSubmode === "grid18");
      btnCards?.classList.toggle("active", state.tableSubmode === "cards");
    }
    updateSubmodeButtons();

    btnGrid18?.addEventListener("click", () => {
      state.tableSubmode = "grid18";
      updateSubmodeButtons();
      renderPeriodicTable();
    });

    btnCards?.addEventListener("click", () => {
      state.tableSubmode = "cards";
      updateSubmodeButtons();
      renderPeriodicTable();
    });

    // Nút đóng/mở ngăn bộ lọc & nhiệt độ trên điện thoại
    const mobFilterBtn = document.getElementById("mobileFilterToggleBtn");
    const expandableControls = document.getElementById("expandableControls");
    mobFilterBtn?.addEventListener("click", () => {
      const isOpen = expandableControls.classList.toggle("open");
      mobFilterBtn.classList.toggle("active", isOpen);
      mobFilterBtn.setAttribute("aria-expanded", String(isOpen));
    });

    // Tự động điều chỉnh vị trí Spotlight khi xoay màn hình hoặc thay đổi kích thước cửa sổ
    window.addEventListener("resize", () => {
      syncSpotlightPlacement();
    });

    // Tùy chọn loại nội dung mã hóa trong QR và nút In bảng QR
    const qrPayloadSelect = document.getElementById("qrPayloadMode");
    qrPayloadSelect?.addEventListener("change", () => {
      state.qrPayloadMode = qrPayloadSelect.value;
      renderAll();
    });

    document.getElementById("printQRSheetBtn")?.addEventListener("click", () => {
      window.print();
    });

    // Tìm kiếm tức thì
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");

    searchInput?.addEventListener("input", () => {
      state.searchQuery = searchInput.value;
      clearSearchBtn.hidden = state.searchQuery.trim() === "";
      renderAll();
    });

    clearSearchBtn?.addEventListener("click", () => {
      searchInput.value = "";
      state.searchQuery = "";
      clearSearchBtn.hidden = true;
      renderAll();
    });

    // Lọc theo trạng thái Rắn / Lỏng / Khí
    document.querySelectorAll(".phase-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".phase-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.selectedPhase = pill.getAttribute("data-phase") || "all";
        renderAll();
      });
    });

    // Thanh trượt nhiệt độ mô phỏng
    const tempSlider = document.getElementById("tempSlider");
    const tempKVal = document.getElementById("tempKelvinVal");
    const tempCVal = document.getElementById("tempCelsiusVal");
    const resetTempBtn = document.getElementById("resetTempBtn");

    tempSlider?.addEventListener("input", () => {
      const k = Number(tempSlider.value);
      state.temperatureK = k;
      state.useCustomTemp = k !== 298;
      const c = Math.round(k - 273.15);
      tempKVal.textContent = `${k} K`;
      tempCVal.textContent = `(${c} °C)`;
      renderAll();
    });

    resetTempBtn?.addEventListener("click", () => {
      tempSlider.value = "298";
      state.temperatureK = 298;
      state.useCustomTemp = false;
      tempKVal.textContent = "298 K";
      tempCVal.textContent = "(25 °C)";
      renderAll();
    });

    // Bật / tắt ảnh nền trực tiếp trên ô bảng tuần hoàn
    const togglePhotoBtn = document.getElementById("toggleTilePhotoBtn");
    togglePhotoBtn?.addEventListener("click", () => {
      state.showTilePhotos = !state.showTilePhotos;
      document.body.classList.toggle("hide-tile-photos", !state.showTilePhotos);
      togglePhotoBtn.classList.toggle("active", state.showTilePhotos);
    });

    // Khám phá ngẫu nhiên 1 nguyên tố
    document.getElementById("randomElementBtn")?.addEventListener("click", () => {
      const randNum = Math.floor(Math.random() * state.maxElements) + 1;
      state.spotlightNumber = randNum;
      renderAll();
      openElementModal(randNum);
    });

    // Sắp xếp bộ sưu tập ảnh
    const sortSelect = document.getElementById("gallerySortSelect");
    sortSelect?.addEventListener("change", () => {
      state.gallerySort = sortSelect.value;
      renderGalleryView();
    });

    // Đóng Modal & Phím tắt bàn phím
    document.getElementById("closeModalBtn")?.addEventListener("click", closeElementModal);
    document.getElementById("elementModal")?.addEventListener("click", (e) => {
      if (e.target.id === "elementModal") closeElementModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.modalNumber != null) {
          closeElementModal();
        } else if (state.searchQuery !== "") {
          searchInput.value = "";
          state.searchQuery = "";
          clearSearchBtn.hidden = true;
          renderAll();
        }
      } else if (state.modalNumber != null) {
        if (e.key === "ArrowRight") {
          const next = state.modalNumber < state.maxElements ? state.modalNumber + 1 : 1;
          openElementModal(next);
        } else if (e.key === "ArrowLeft") {
          const prev = state.modalNumber > 1 ? state.modalNumber - 1 : state.maxElements;
          openElementModal(prev);
        }
      }
    });
  }

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    populateCompareSelectors();
    renderAll();
    checkUrlQRCodeDeepLink();
  });
})();
