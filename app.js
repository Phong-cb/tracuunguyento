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
    selectedPeriod: "all", // 'all' | '1'..'7' | 'lanthanide' | 'actinide'
    selectedGroup: "all", // 'all' | '1'..'18' | 'f-block'
    selectedPhase: "all",
    temperatureK: 298, // 25°C
    useCustomTemp: false,
    showTilePhotos: true,
    spotlightNumber: 79, // Mặc định nổi bật Vàng (Au)
    modalNumber: null,
    gallerySort: "number-asc",
    compareIds: [1, 79, 108], // Hiđrô, Vàng, Hassi (108)
    qrPayloadMode: "url", // 'url' | 'info' | 'wiki'
    model3dNumber: 79, // Nguyên tố đang xem ở chế độ 3D
    model3dMode: "glb", // 'glb' (model-viewer + AR) | 'atom' (nguyên tử 3D tương tác)
    m3dAutoRotate: true
  };

  // Bộ nhớ đệm mã QR SVG để tăng tốc độ hiển thị
  const qrCache = new Map();

  // Danh sách ký hiệu nhóm La Mã theo 18 cột bảng tuần hoàn
  const ROMAN_GROUPS = [
    "IA", "IIA", "IIIB", "IVB", "VB", "VIB", "VIIB",
    "VIIIB", "VIIIB", "VIIIB", "IB", "IIB",
    "IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"
  ];

  // Lấy tên nhóm chuẩn hóa học cho nguyên tố (không dùng số thứ tự cột 1-18)
  function getElementGroupLabel(el) {
    if (!el) return "";
    if (el.category_id === "lanthanide" || (el.number >= 57 && el.number <= 71)) {
      return "Họ Lantan";
    }
    if (el.category_id === "actinide" || (el.number >= 89 && el.number <= 103)) {
      return "Họ Actini";
    }
    const roman = ROMAN_GROUPS[el.group - 1];
    return roman ? `Nhóm ${roman}` : (el.group ? `Nhóm ${el.group}` : "Khối f");
  }

  // Tạo chuỗi nội dung mã hóa vào QR của từng nguyên tố
  function buildQRPayload(el, mode = state.qrPayloadMode) {
    if (mode === "wiki") {
      return el.source_url || `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name_en)}`;
    }
    if (mode === "info") {
      return [
        `#${el.number} (${el.name_en}) [${el.symbol}]`,
        `Vị trí: Chu kỳ ${el.period} • ${getElementGroupLabel(el)} • Khối ${el.block}`,
        `Nhóm: ${el.category_vi}`,
        `Nguyên tử khối: ${el.atomic_mass} u`,
        `Cấu hình e: ${el.electron_configuration_semantic || el.electron_configuration}`,
        `Trạng thái (25°C): ${el.phase_vi}`
      ].join("\n");
    }
    let baseUrl =
      window.location.origin && window.location.origin !== "null"
        ? `${window.location.origin}${window.location.pathname}`
        : "http://192.168.1.16:8108/";

    // Khi duyệt web trên máy tính bằng localhost hoặc 127.0.0.1, tự động gán IP mạng LAN (192.168.1.16)
    // để điện thoại khác (iPhone/Safari, Android) quét mã QR trên màn hình PC mở được ngay lập tức
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      baseUrl = `${window.location.protocol}//192.168.1.16:${window.location.port || "8108"}${window.location.pathname}`;
    }
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
    ctx.fillText(`(${el.name_en})`, 44, 122);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "22px sans-serif";
    ctx.fillText(`${el.symbol} • ${el.category_vi}`, 44, 158);

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
    link.download = `QR_${el.number}_${el.symbol}_${el.name_en.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Bộ nhớ đệm ảnh Bảng Tuần Hoàn 118 QR chất lượng cao theo chế độ payload
  let qrPosterCache = { mode: null, dataUrl: null };

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Kết xuất ảnh Bảng Tuần Hoàn 118 Nguyên Tố Mã QR chuẩn in 1 trang (4961 × 3508 px - A3 300 DPI)
  // Mỗi ô chỉ chứa: Kí hiệu nguyên tố, Khối lượng nguyên tử và Mã QR kích thước lớn dễ quét
  function generate118QRPosterDataURL() {
    const mode = state.qrPayloadMode;
    if (qrPosterCache.mode === mode && qrPosterCache.dataUrl) {
      return qrPosterCache.dataUrl;
    }

    const W = 4961;
    const H = 3508;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Nền trắng tinh khiết tối ưu in ấn & độ tương phản mã QR
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const padX = 95;
    const topHeaderH = 200;
    const bottomY = 65;
    const cols = 18;
    const gapX = 12;
    const gapY = 12;
    const periodColW = 108;
    const groupRowH = 82;
    const fBlockExtraGap = 46;

    const cellW = Math.floor((W - padX * 2 - periodColW - gapX - (cols - 1) * gapX) / cols); // ~245px
    const usableH = H - topHeaderH - groupRowH - gapY - bottomY - fBlockExtraGap - 8 * gapY;
    const cellH = Math.floor(usableH / 9); // ~332px
    const totalGridW = periodColW + gapX + cols * cellW + (cols - 1) * gapX;
    const gridLeftX = Math.floor((W - totalGridW) / 2);
    const elementsStartX = gridLeftX + periodColW + gapX;
    const elementsStartY = topHeaderH + groupRowH + gapY;

    // 1. Tiêu đề chính & Dòng chữ STEM ở dưới
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 66px 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("BẢNG TUẦN HOÀN HÓA HỌC", W / 2, 82);

    ctx.fillStyle = "#0284c7";
    ctx.font = "700 30px 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Sản phẩm STEM của lớp 10A2 THPT CHU VĂN AN 2026-2027", W / 2, 128);

    // Chú thích màu nhóm căn giữa gọn đẹp phía dưới dòng STEM
    const legendItems = [
      { label: "Kim loại kiềm", color: CATEGORY_COLORS["alkali-metal"] },
      { label: "Kiềm thổ", color: CATEGORY_COLORS["alkaline-earth"] },
      { label: "Chuyển tiếp", color: CATEGORY_COLORS["transition-metal"] },
      { label: "Hậu C.tiếp", color: CATEGORY_COLORS["post-transition"] },
      { label: "Á kim", color: CATEGORY_COLORS["metalloid"] },
      { label: "Phi kim", color: CATEGORY_COLORS["nonmetal"] },
      { label: "Halogen", color: CATEGORY_COLORS["halogen"] },
      { label: "Khí hiếm", color: CATEGORY_COLORS["noble-gas"] },
      { label: "Lantan", color: CATEGORY_COLORS["lanthanide"] },
      { label: "Actini", color: CATEGORY_COLORS["actinide"] }
    ];
    ctx.font = "600 21px 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    let totalLegendW = 0;
    legendItems.forEach((item, idx) => {
      totalLegendW += 22 + ctx.measureText(item.label).width + (idx < legendItems.length - 1 ? 30 : 0);
    });
    let lx = Math.floor((W - totalLegendW) / 2);
    const ly = 172;
    legendItems.forEach((item) => {
      ctx.fillStyle = item.color;
      drawRoundedRectPath(ctx, lx, ly - 17, 16, 16, 4);
      ctx.fill();
      lx += 22;
      ctx.fillStyle = "#334155";
      ctx.fillText(item.label, lx, ly);
      lx += ctx.measureText(item.label).width + 30;
    });

    // Đường kẻ mảnh phân cách header
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gridLeftX, 188);
    ctx.lineTo(gridLeftX + totalGridW, 188);
    ctx.stroke();

    // Tính tọa độ Y cho từng ypos (1..7, 9, 10)
    function getRowY(ypos) {
      if (ypos <= 7) {
        return elementsStartY + (ypos - 1) * (cellH + gapY);
      }
      // ypos 9 và 10 (Họ Lantan & Họ Actini)
      return elementsStartY + 7 * (cellH + gapY) + fBlockExtraGap + (ypos - 9) * (cellH + gapY);
    }

    // 2. Ô góc trên-trái (CK \ Nhóm)
    ctx.save();
    drawRoundedRectPath(ctx, gridLeftX, topHeaderH, periodColW, groupRowH, 12);
    ctx.fillStyle = "#f1f5f9";
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.font = "800 20px 'JetBrains Mono', monospace";
    ctx.fillText("CK \\ Nhóm", gridLeftX + periodColW / 2, topHeaderH + groupRowH / 2 + 7);

    // 3. Hàng Nhóm (1..18 kèm ký hiệu La Mã IA..VIIIA)
    for (let g = 1; g <= 18; g++) {
      const gx = elementsStartX + (g - 1) * (cellW + gapX);
      const gy = topHeaderH;

      ctx.save();
      drawRoundedRectPath(ctx, gx, gy, cellW, groupRowH, 12);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.font = "800 28px 'JetBrains Mono', monospace";
      ctx.fillText(String(g), gx + cellW / 2, gy + 36);

      ctx.fillStyle = "#0284c7";
      ctx.font = "700 22px 'Be Vietnam Pro', Arial, sans-serif";
      ctx.fillText(ROMAN_GROUPS[g - 1], gx + cellW / 2, gy + 66);
    }

    // 4. Cột Chu kì (1..7 + La–Lu, Ac–Lr)
    const periodRows = [
      { ypos: 1, label: "1", sub: "Chu kì" },
      { ypos: 2, label: "2", sub: "Chu kì" },
      { ypos: 3, label: "3", sub: "Chu kì" },
      { ypos: 4, label: "4", sub: "Chu kì" },
      { ypos: 5, label: "5", sub: "Chu kì" },
      { ypos: 6, label: "6", sub: "Chu kì" },
      { ypos: 7, label: "7", sub: "Chu kì" },
      { ypos: 9, label: "La–Lu", sub: "CK 6", color: CATEGORY_COLORS["lanthanide"] },
      { ypos: 10, label: "Ac–Lr", sub: "CK 7", color: CATEGORY_COLORS["actinide"] }
    ];
    periodRows.forEach((pr) => {
      const py = getRowY(pr.ypos);
      ctx.save();
      drawRoundedRectPath(ctx, gridLeftX, py, periodColW, cellH, 12);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = pr.color || "#cbd5e1";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = "center";
      ctx.fillStyle = pr.color || "#0f172a";
      ctx.font = pr.label.length > 2
        ? "800 24px 'JetBrains Mono', monospace"
        : "800 38px 'JetBrains Mono', monospace";
      ctx.fillText(pr.label, gridLeftX + periodColW / 2, py + cellH / 2 + 4);

      ctx.fillStyle = "#64748b";
      ctx.font = "700 18px 'Be Vietnam Pro', Arial, sans-serif";
      ctx.fillText(pr.sub, gridLeftX + periodColW / 2, py + cellH / 2 + 34);
    });

    // Ô đánh dấu vị trí Lantan & Actini tại cột 3 hàng 6, 7
    [
      { row: 6, label: "57–71", sub: "Lantan", color: CATEGORY_COLORS["lanthanide"] },
      { row: 7, label: "89–103", sub: "Actini", color: CATEGORY_COLORS["actinide"] }
    ].forEach((slot) => {
      const sx = elementsStartX + 2 * (cellW + gapX);
      const sy = getRowY(slot.row);
      ctx.save();
      drawRoundedRectPath(ctx, sx, sy, cellW, cellH, 14);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = slot.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = slot.color;
      ctx.textAlign = "center";
      ctx.font = "800 32px 'JetBrains Mono', monospace";
      ctx.fillText(slot.label, sx + cellW / 2, sy + cellH / 2 - 8);
      ctx.font = "700 24px 'Be Vietnam Pro', Arial, sans-serif";
      ctx.fillText(`↓ ${slot.sub}`, sx + cellW / 2, sy + cellH / 2 + 34);
    });

    // Vẽ đầy đủ 118 nguyên tố (Kí hiệu + Khối lượng nguyên tử + Mã QR lớn)
    const elements118 = ALL_ELEMENTS.filter((el) => el.number <= 118);
    ctx.imageSmoothingEnabled = false;

    elements118.forEach((el) => {
      const x = elementsStartX + (el.xpos - 1) * (cellW + gapX);
      const y = getRowY(el.ypos);
      const color = CATEGORY_COLORS[el.category_id] || "#0284c7";

      // Khung ô nguyên tố
      ctx.save();
      drawRoundedRectPath(ctx, x, y, cellW, cellH, 14);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();

      // Dải màu nhấn mảnh ở đỉnh ô theo nhóm nguyên tố
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellW, 9);
      ctx.restore();

      // Viền ô sắc nét
      drawRoundedRectPath(ctx, x, y, cellW, cellH, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Hàng trên gọn (chiếm ~19% chiều cao): Kí hiệu (trái) & Khối lượng nguyên tử (phải)
      const headerBaseY = y + 52;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "800 40px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
      ctx.fillText(el.symbol, x + 13, headerBaseY, 92);

      const massStr =
        typeof el.atomic_mass === "number"
          ? Number.isInteger(el.atomic_mass)
            ? String(el.atomic_mass)
            : Number(el.atomic_mass.toPrecision(6)).toString()
          : String(el.atomic_mass);
      ctx.fillStyle = "#334155";
      ctx.textAlign = "right";
      ctx.font = massStr.length > 6
        ? "700 19px 'JetBrains Mono', Consolas, monospace"
        : "700 22px 'JetBrains Mono', Consolas, monospace";
      ctx.fillText(massStr, x + cellW - 12, headerBaseY - 4, cellW - 108);

      // Không gian Mã QR lớn (~77% chiều cao ô, canh giữa phía dưới)
      const qrBoxSize = Math.min(cellW - 16, cellH - 72); // ~234 × 234 px
      const qrBoxX = x + Math.floor((cellW - qrBoxSize) / 2);
      const qrBoxY = y + 64 + Math.floor((cellH - 64 - 10 - qrBoxSize) / 2);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      const payload = buildQRPayload(el, mode);
      if (typeof window.qrcode === "function") {
        try {
          const qr = window.qrcode(0, "M");
          qr.addData(unescape(encodeURIComponent(payload)), "Byte");
          qr.make();
          const count = qr.getModuleCount();
          const quietZone = 8;
          const drawArea = qrBoxSize - quietZone * 2;
          const modSize = Math.floor(drawArea / count);
          const actualQrPx = modSize * count;
          const ox = qrBoxX + Math.floor((qrBoxSize - actualQrPx) / 2);
          const oy = qrBoxY + Math.floor((qrBoxSize - actualQrPx) / 2);

          ctx.fillStyle = "#000000";
          for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
              if (qr.isDark(r, c)) {
                ctx.fillRect(ox + c * modSize, oy + r * modSize, modSize, modSize);
              }
            }
          }
        } catch (err) {
          console.warn("Poster QR error for", el.symbol, err);
        }
      }
    });

    // Chân trang gọn nhẹ
    ctx.fillStyle = "#64748b";
    ctx.font = "600 22px 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Nguyên Tố Vũ Trụ — Bảng Tuần Hoàn Hóa Học 118 Nguyên Tố IUPAC • Quét bằng Camera điện thoại để mở thông tin chi tiết & Mô hình 3D",
      W / 2,
      H - 28
    );

    const dataUrl = canvas.toDataURL("image/png");
    qrPosterCache = { mode, dataUrl };
    return dataUrl;
  }

  function download118QRPosterPNG() {
    const dataUrl = generate118QRPosterDataURL();
    const link = document.createElement("a");
    link.download = "Bang_Tuan_Hoan_118_Nguyen_To_QR_In_1_Trang.png";
    link.href = dataUrl;
    link.click();
  }

  function openQRPosterModal() {
    const modal = document.getElementById("qrPosterModal");
    const loading = document.getElementById("qrPosterLoading");
    const previewImg = document.getElementById("qrPosterPreviewImg");
    if (!modal || !previewImg) return;

    modal.hidden = false;
    if (loading) loading.hidden = false;
    previewImg.hidden = true;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const dataUrl = generate118QRPosterDataURL();
        previewImg.src = dataUrl;
        previewImg.hidden = false;
        if (loading) loading.hidden = true;
      }, 30);
    });
  }

  function closeQRPosterModal() {
    const modal = document.getElementById("qrPosterModal");
    if (modal) modal.hidden = true;
  }

  function print118QRPosterOnePage() {
    const printImg = document.getElementById("qrPosterPrintImg");
    if (!printImg) return;

    const dataUrl = generate118QRPosterDataURL();
    const triggerPrint = () => {
      document.body.classList.add("printing-qr-poster");
      setTimeout(() => {
        window.print();
      }, 80);
    };

    if (printImg.src !== dataUrl) {
      printImg.onload = triggerPrint;
      printImg.src = dataUrl;
    } else {
      triggerPrint();
    }
  }

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-qr-poster");
  });

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
      <text x="200" y="248" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">(${el.name_en})</text>
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

    // Lọc theo Chu kỳ
    if (state.selectedPeriod !== "all") {
      if (state.selectedPeriod === "lanthanide") {
        if (el.category_id !== "lanthanide" && !(el.number >= 57 && el.number <= 71)) return false;
      } else if (state.selectedPeriod === "actinide") {
        if (el.category_id !== "actinide" && !(el.number >= 89 && el.number <= 103)) return false;
      } else {
        if (String(el.period) !== String(state.selectedPeriod)) return false;
      }
    }

    // Lọc theo Nhóm
    if (state.selectedGroup !== "all") {
      if (state.selectedGroup === "f-block") {
        if (el.block !== "f" && el.category_id !== "lanthanide" && el.category_id !== "actinide") return false;
      } else {
        if (String(el.group) !== String(state.selectedGroup)) return false;
      }
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
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Mô hình nguyên tử Bohr của ${el.name_en}">
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
      <div class="spotlight-photo-box" id="spotlightPhotoClick" title="Nhấn để phóng to chi tiết ${el.name_en}">
        <img src="${imgSrc}" alt="Hình ảnh nguyên tố ${el.name_en}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
        <div class="spotlight-photo-tag">#${el.number} • ${el.category_vi}</div>
      </div>

      <div class="spotlight-info">
        <div class="spotlight-top-row">
          <span class="spotlight-symbol">${el.symbol}</span>
          <div class="spotlight-names">
            <h2>${el.name_en}</h2>
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
          <div class="spotlight-qr-mini" id="spotlightQRClick" title="Mã QR của ${el.name_en} — Nhấn để phóng to hoặc tải về">
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

  function syncPeriodGroupDropdowns() {
    const periodSel = document.getElementById("periodFilterSelect");
    const groupSel = document.getElementById("groupFilterSelect");
    const resetBtn = document.getElementById("resetPeriodGroupBtn");

    if (periodSel) periodSel.value = state.selectedPeriod;
    if (groupSel) groupSel.value = state.selectedGroup;

    if (resetBtn) {
      resetBtn.hidden = state.selectedPeriod === "all" && state.selectedGroup === "all";
    }
  }

  // Render Bảng Tuần Hoàn (18 Cột chuẩn & Lưới Thẻ Gọn cho Mobile)
  function renderPeriodicTable() {
    syncSpotlightPlacement();
    syncPeriodGroupDropdowns();

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

    // 1. Góc trên bên trái (Hàng 1, Cột 1): Nhãn Chu kỳ \ Nhóm
    const cornerCell = document.createElement("div");
    cornerCell.className = "grid-corner-cell";
    cornerCell.style.gridColumn = "1";
    cornerCell.style.gridRow = "1";
    cornerCell.title = "Hàng ngang: Chu kỳ (1–7) | Cột dọc: Nhóm (1–18)";
    cornerCell.innerHTML = `<span>CK\\Nhóm</span>`;
    board.appendChild(cornerCell);

    // 2. Hàng tiêu đề Nhóm (Hàng 1, Cột 2..19 cho Nhóm 1..18)
    for (let g = 1; g <= 18; g++) {
      const gBtn = document.createElement("button");
      gBtn.type = "button";
      const isAct = state.selectedGroup === String(g);
      gBtn.className = `group-header-cell ${isAct ? "active" : ""}`;
      gBtn.style.gridColumn = String(g + 1);
      gBtn.style.gridRow = "1";
      gBtn.setAttribute("data-group", String(g));
      gBtn.title = `Nhấn để lọc các nguyên tố thuộc Nhóm ${g} (${ROMAN_GROUPS[g - 1]})`;
      gBtn.innerHTML = `<strong>${g}</strong><small>${ROMAN_GROUPS[g - 1]}</small>`;

      gBtn.addEventListener("click", () => {
        state.selectedGroup = state.selectedGroup === String(g) ? "all" : String(g);
        syncPeriodGroupDropdowns();
        renderAll();
      });
      board.appendChild(gBtn);
    }

    // 3. Cột tiêu đề Chu kỳ (Cột 1, Hàng 2..8 cho Chu kỳ 1..7)
    for (let p = 1; p <= 7; p++) {
      const pBtn = document.createElement("button");
      pBtn.type = "button";
      const isAct = state.selectedPeriod === String(p);
      pBtn.className = `period-header-cell ${isAct ? "active" : ""}`;
      pBtn.style.gridColumn = "1";
      pBtn.style.gridRow = String(p + 1);
      pBtn.setAttribute("data-period", String(p));
      pBtn.title = `Nhấn để lọc các nguyên tố thuộc Chu kỳ ${p}`;
      pBtn.innerHTML = `<strong>${p}</strong><small>CK</small>`;

      pBtn.addEventListener("click", () => {
        state.selectedPeriod = state.selectedPeriod === String(p) ? "all" : String(p);
        syncPeriodGroupDropdowns();
        renderAll();
      });
      board.appendChild(pBtn);
    }

    // 4. Thanh phân cách dãy họ f (Hàng 9)
    const divider = document.createElement("div");
    divider.className = "grid-series-divider";
    divider.style.gridColumn = "1 / -1";
    divider.style.gridRow = "9";
    divider.innerHTML = `<span>Họ nguyên tố khối f (Lantan &amp; Actini)</span>`;
    board.appendChild(divider);

    // 5. Cột tiêu đề Chu kỳ 6* và 7* (Họ Lantan & Họ Actini)
    const lanHdr = document.createElement("button");
    lanHdr.type = "button";
    const isLanAct = state.selectedPeriod === "lanthanide";
    lanHdr.className = `period-header-cell series-hdr-lan ${isLanAct ? "active" : ""}`;
    lanHdr.style.gridColumn = "1";
    lanHdr.style.gridRow = "10";
    lanHdr.setAttribute("data-period", "lanthanide");
    lanHdr.title = "Nhấn để lọc Họ Lantan (Nguyên tố 57–71)";
    lanHdr.innerHTML = `<strong>6*</strong><small>La</small>`;
    lanHdr.addEventListener("click", () => {
      state.selectedPeriod = state.selectedPeriod === "lanthanide" ? "all" : "lanthanide";
      syncPeriodGroupDropdowns();
      renderAll();
    });
    board.appendChild(lanHdr);

    const actHdr = document.createElement("button");
    actHdr.type = "button";
    const isActAct = state.selectedPeriod === "actinide";
    actHdr.className = `period-header-cell series-hdr-act ${isActAct ? "active" : ""}`;
    actHdr.style.gridColumn = "1";
    actHdr.style.gridRow = "11";
    actHdr.setAttribute("data-period", "actinide");
    actHdr.title = "Nhấn để lọc Họ Actini (Nguyên tố 89–103)";
    actHdr.innerHTML = `<strong>7*</strong><small>Ac</small>`;
    actHdr.addEventListener("click", () => {
      state.selectedPeriod = state.selectedPeriod === "actinide" ? "all" : "actinide";
      syncPeriodGroupDropdowns();
      renderAll();
    });
    board.appendChild(actHdr);

    // 6. Thêm 2 ô chỉ dẫn Họ Lantan (57-71) và Họ Actini (89-103) tại Cột 4, Hàng 7 và 8
    const lanMarker = document.createElement("div");
    lanMarker.className = "series-marker";
    lanMarker.style.gridColumn = "4";
    lanMarker.style.gridRow = "7";
    lanMarker.style.cursor = "pointer";
    lanMarker.title = "Nhấn để xem Họ Lantan (57–71)";
    lanMarker.innerHTML = `<strong>57–71</strong><span>Lantan</span>`;
    lanMarker.addEventListener("click", () => {
      state.selectedPeriod = state.selectedPeriod === "lanthanide" ? "all" : "lanthanide";
      syncPeriodGroupDropdowns();
      renderAll();
    });
    board.appendChild(lanMarker);

    const actMarker = document.createElement("div");
    actMarker.className = "series-marker";
    actMarker.style.gridColumn = "4";
    actMarker.style.gridRow = "8";
    actMarker.style.cursor = "pointer";
    actMarker.title = "Nhấn để xem Họ Actini (89–103)";
    actMarker.innerHTML = `<strong style="color:#fb7185">89–103</strong><span>Actini</span>`;
    actMarker.addEventListener("click", () => {
      state.selectedPeriod = state.selectedPeriod === "actinide" ? "all" : "actinide";
      syncPeriodGroupDropdowns();
      renderAll();
    });
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
      tile.style.gridColumn = String(el.xpos + 1);
      tile.style.gridRow = String(el.ypos + 1);
      tile.style.setProperty("--el-color", color);
      tile.setAttribute("data-number", String(el.number));
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", `${el.number}. ${el.name_en} (${el.symbol}) - Chu kỳ ${el.period}, ${getElementGroupLabel(el)}, Khối ${el.block}`);

      tile.innerHTML = `
        <img class="el-tile-bg-img" src="${imgSrc}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUri}';" />
        <div class="el-tile-top">
          <span>${el.number}</span>
          <span class="el-phase-indicator ${effPhase}" title="Trạng thái: ${getPhaseLabelVi(effPhase)}"></span>
        </div>
        <div class="el-tile-symbol">${el.symbol}</div>
        <div class="el-tile-bottom">
          <span class="el-tile-name">${el.name_en}</span>
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
                  <h4>${el.name_en}</h4>
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
        case "name-en":
        case "name-vi":
          return a.name_en.localeCompare(b.name_en, "en");
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
              <img src="${imgSrc}" alt="Mẫu vật nguyên tố ${el.name_en}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUri}';" />
              <span class="gallery-badge-num">#${el.number}</span>
              <div class="gallery-qr-badge" title="Mã QR của nguyên tố ${el.name_en}">${qrSvg}</div>
              <div class="gallery-badge-symbol">${el.symbol}</div>
            </div>
            <div class="gallery-card-body">
              <div class="gallery-card-title">
                <h3>${el.name_en}</h3>
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
            `<option value="${el.number}" ${el.number === targetNum ? "selected" : ""}>#${el.number} — ${el.name_en} (${el.symbol})</option>`
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
              <img src="${imgSrc}" alt="${el.name_en}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
              <div style="flex:1; min-width:0;">
                <span class="gallery-cat-tag">${el.category_vi}</span>
                <h3 style="font-size: 1.25rem; margin-top: 4px;">#${el.number} ${el.name_en} (${el.symbol})</h3>
              </div>
              <div class="spotlight-qr-mini" style="width:64px; height:64px; --spot-color:${color}" title="Mã QR của ${el.name_en}">
                ${qrSvg}
              </div>
            </div>
            <div style="display:flex; justify-content:center; padding: 4px 0;">
              ${renderBohrSVG(el, 140)}
            </div>
            <div class="compare-prop-list">
              <div class="compare-prop-row"><span>Nguyên tử khối</span><strong>${el.atomic_mass} u</strong></div>
              <div class="compare-prop-row"><span>Cấu hình electron</span><strong>${el.electron_configuration_semantic || el.electron_configuration}</strong></div>
              <div class="compare-prop-row"><span>Chu kỳ / Nhóm / Khối</span><strong>Chu kỳ ${el.period} • ${getElementGroupLabel(el)} • Khối ${el.block}</strong></div>
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

            <div class="qr-code-frame" data-open-modal="${el.number}" title="Quét mã QR hoặc nhấn để mở hồ sơ ${el.name_en}">
              ${qrSvg}
            </div>

            <div class="qr-card-title">
              <h3>${el.name_en}</h3>
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

  // =====================================================================
  // MÔ HÌNH 3D: Trình dựng nguyên tử 3D tương tác (Canvas, không cần thư viện)
  // =====================================================================
  const Atom3D = (function () {
    let canvas = null;
    let ctx = null;
    let el = null;
    let nucleus = [];
    let shells = [];
    let nucleusR = 0.3;
    let rotX = -0.35;
    let rotY = 0.6;
    let zoom = 1;
    let t = 0;
    let rafId = null;
    let running = false;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastInteract = 0;
    let pinchDist = 0;
    const pointers = new Map();
    let dpr = 1;
    let W = 0;
    let H = 0;
    let lastTs = 0;

    function hexToRgb(hex) {
      const h = hex.replace("#", "");
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }

    function buildModel(element) {
      el = element;
      const Z = element.number;
      const A = Math.max(Z, Math.round(Number(element.atomic_mass) || Z * 2));
      const N = Math.max(0, A - Z);
      const total = Z + N;
      const shown = Math.min(total, 90);
      const pShown = Math.max(1, Math.round((Z / total) * shown));

      nucleusR = 0.1 + 0.05 * Math.cbrt(shown);
      const golden = Math.PI * (3 - Math.sqrt(5));
      const pr = (nucleusR / Math.cbrt(shown)) * 1.05;

      // Trộn proton & nơtron xen kẽ đều
      const types = [];
      for (let i = 0; i < shown; i++) types.push(i < pShown ? "p" : "n");
      let seed = Z * 9301 + 49297;
      const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }

      nucleus = [];
      for (let i = 0; i < shown; i++) {
        const r = shown === 1 ? 0 : nucleusR * Math.cbrt((i + 0.5) / shown);
        const y = 1 - (2 * (i + 0.5)) / shown;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const th = golden * i;
        nucleus.push({
          x: r * rad * Math.cos(th),
          y: r * y,
          z: r * rad * Math.sin(th),
          r: pr,
          type: types[i]
        });
      }

      const shellArr = element.shells && element.shells.length ? element.shells : [Z];
      const count = shellArr.length;
      const inner = nucleusR + 0.22;
      const outer = 1.0;
      shells = shellArr.map((n, k) => {
        const radius = count === 1 ? (inner + outer) / 2 : inner + ((outer - inner) * k) / (count - 1);
        return {
          n,
          radius,
          tilt: 0.35 + ((k * 0.62) % 1.25),
          azim: k * 1.13,
          speed: 1.1 / (1 + k * 0.45)
        };
      });
    }

    function rotatePoint(x, y, z) {
      // Xoay quanh trục Y rồi trục X
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      let x1 = x * cy + z * sy;
      let z1 = -x * sy + z * cy;
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      let y1 = y * cx - z1 * sx;
      let z2 = y * sx + z1 * cx;
      return [x1, y1, z2];
    }

    function project(x, y, z) {
      const [rx, ry, rz] = rotatePoint(x, y, z);
      const camD = 3.2;
      const persp = camD / (camD - rz);
      const scale = Math.min(W, H) * 0.42 * zoom;
      return { sx: W / 2 + rx * scale * persp, sy: H / 2 - ry * scale * persp, depth: rz, persp, scale };
    }

    function orbitPoint(s, angle) {
      // Điểm trên quỹ đạo tròn nghiêng trong không gian 3D
      let x = s.radius * Math.cos(angle);
      let y = 0;
      let z = s.radius * Math.sin(angle);
      // nghiêng quanh trục X
      const ct = Math.cos(s.tilt), st = Math.sin(s.tilt);
      const y2 = y * ct - z * st;
      const z2 = y * st + z * ct;
      // xoay phương vị quanh trục Y
      const ca = Math.cos(s.azim), sa = Math.sin(s.azim);
      return [x * ca + z2 * sa, y2, -x * sa + z2 * ca];
    }

    function drawSphere(sx, sy, r, base, alpha = 1) {
      const [cr, cg, cb] = base;
      const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, r * 0.1, sx, sy, r);
      g.addColorStop(0, `rgba(${Math.min(255, cr + 110)},${Math.min(255, cg + 110)},${Math.min(255, cb + 110)},${alpha})`);
      g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${alpha})`);
      g.addColorStop(1, `rgba(${Math.round(cr * 0.25)},${Math.round(cg * 0.25)},${Math.round(cb * 0.25)},${alpha})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(ts) {
      if (!running) return;
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;
      t += dt;

      if (state.m3dAutoRotate && !dragging && performance.now() - lastInteract > 1200) {
        rotY += dt * 0.35;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
      const elecRgb = hexToRgb(color);

      // Quầng sáng hạt nhân
      const c0 = project(0, 0, 0);
      const glowR = nucleusR * c0.scale * c0.persp * 2.4;
      const glow = ctx.createRadialGradient(c0.sx, c0.sy, 0, c0.sx, c0.sy, glowR);
      glow.addColorStop(0, "rgba(255,170,120,0.28)");
      glow.addColorStop(1, "rgba(255,120,80,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(c0.sx, c0.sy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Vẽ quỹ đạo
      shells.forEach((s) => {
        const seg = 96;
        for (let i = 0; i < seg; i++) {
          const a1 = (i / seg) * Math.PI * 2;
          const a2 = ((i + 1) / seg) * Math.PI * 2;
          const p1 = orbitPoint(s, a1);
          const p2 = orbitPoint(s, a2);
          const q1 = project(p1[0], p1[1], p1[2]);
          const q2 = project(p2[0], p2[1], p2[2]);
          const depthA = 0.15 + 0.3 * ((q1.depth + 1.1) / 2.2);
          ctx.strokeStyle = `rgba(${elecRgb[0]},${elecRgb[1]},${elecRgb[2]},${Math.max(0.06, depthA)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(q1.sx, q1.sy);
          ctx.lineTo(q2.sx, q2.sy);
          ctx.stroke();
        }
      });

      // Thu thập các vật thể để sắp xếp theo độ sâu
      const items = [];
      nucleus.forEach((p) => {
        const q = project(p.x, p.y, p.z);
        items.push({ kind: p.type, q, r: p.r * q.scale * q.persp });
      });
      shells.forEach((s, k) => {
        for (let i = 0; i < s.n; i++) {
          const angle = (i / s.n) * Math.PI * 2 + t * s.speed * (k % 2 === 0 ? 1 : -1);
          const pt = orbitPoint(s, angle);
          const q = project(pt[0], pt[1], pt[2]);
          items.push({ kind: "e", q, r: Math.max(2.2, 0.028 * q.scale * q.persp) });
        }
      });
      items.sort((a, b) => a.q.depth - b.q.depth);

      items.forEach((it) => {
        const fog = 0.55 + 0.45 * ((it.q.depth + 1.1) / 2.2);
        if (it.kind === "p") {
          drawSphere(it.q.sx, it.q.sy, it.r, [235, 72, 72], Math.min(1, fog + 0.2));
        } else if (it.kind === "n") {
          drawSphere(it.q.sx, it.q.sy, it.r, [96, 140, 210], Math.min(1, fog + 0.2));
        } else {
          const eg = ctx.createRadialGradient(it.q.sx, it.q.sy, 0, it.q.sx, it.q.sy, it.r * 3.2);
          eg.addColorStop(0, `rgba(${elecRgb[0]},${elecRgb[1]},${elecRgb[2]},${0.55 * fog})`);
          eg.addColorStop(1, `rgba(${elecRgb[0]},${elecRgb[1]},${elecRgb[2]},0)`);
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(it.q.sx, it.q.sy, it.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          drawSphere(it.q.sx, it.q.sy, it.r, elecRgb, fog);
        }
      });

      // Nhãn ký hiệu
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `800 ${Math.round(Math.min(W, H) * 0.05)}px 'Space Grotesk', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(`${el.symbol}`, 16, H - 46);
      ctx.fillStyle = "rgba(148,163,184,0.95)";
      ctx.font = `600 12px 'JetBrains Mono', monospace`;
      ctx.fillText(`Z=${el.number}  •  [${(el.shells || []).join(", ")}]`, 16, H - 24);

      rafId = requestAnimationFrame(frame);
    }

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }

    function attach(cv) {
      canvas = cv;
      ctx = canvas.getContext("2d");
      resize();
      new ResizeObserver(resize).observe(canvas);

      canvas.addEventListener("pointerdown", (e) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        lastInteract = performance.now();
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lastInteract = performance.now();
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDist > 0) zoom = Math.min(2.6, Math.max(0.5, zoom * (d / pinchDist)));
          pinchDist = d;
          return;
        }
        if (!dragging) return;
        rotY += (e.clientX - lastX) * 0.01;
        rotX += (e.clientY - lastY) * 0.01;
        rotX = Math.max(-1.5, Math.min(1.5, rotX));
        lastX = e.clientX;
        lastY = e.clientY;
      });
      const end = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchDist = 0;
        if (pointers.size === 0) dragging = false;
      };
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", end);
      canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          lastInteract = performance.now();
          zoom = Math.min(2.6, Math.max(0.5, zoom * (e.deltaY < 0 ? 1.08 : 0.926)));
        },
        { passive: false }
      );
    }

    return {
      attach,
      setElement(element) {
        buildModel(element);
      },
      start() {
        if (running || !canvas || !el) return;
        resize();
        running = true;
        lastTs = 0;
        rafId = requestAnimationFrame(frame);
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },
      reset() {
        rotX = -0.35;
        rotY = 0.6;
        zoom = 1;
      }
    };
  })();

  let atom3DAttached = false;

  function getModel3DElement() {
    return ALL_ELEMENTS.find((e) => e.number === state.model3dNumber) || ALL_ELEMENTS[0];
  }

  function isModelViewerReady() {
    return !!(window.customElements && window.customElements.get("model-viewer"));
  }

  // Cập nhật sân khấu 3D (GLB hoặc nguyên tử tương tác)
  function updateModel3DStage() {
    const el = getModel3DElement();
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const section = document.getElementById("viewModel3DSection");
    section?.style.setProperty("--m3d-color", color);

    const mv = document.getElementById("m3dModelViewer");
    const cv = document.getElementById("m3dAtomCanvas");
    const loading = document.getElementById("m3dLoading");
    const loadingText = document.getElementById("m3dLoadingText");
    const isActive = state.activeView === "model3d";

    document.getElementById("btnM3dGlb")?.classList.toggle("active", state.model3dMode === "glb");
    document.getElementById("btnM3dAtom")?.classList.toggle("active", state.model3dMode === "atom");
    document.getElementById("m3dAutoRotateBtn")?.classList.toggle("active", state.m3dAutoRotate);

    if (state.model3dMode === "glb") {
      cv.hidden = true;
      Atom3D.stop();
      mv.hidden = false;

      if (!isModelViewerReady()) {
        loading.hidden = false;
        loadingText.textContent = "Đang khởi tạo trình xem 3D...";
        window.customElements?.whenDefined("model-viewer").then(() => updateModel3DStage());
        return;
      }

      if (state.m3dAutoRotate) mv.setAttribute("auto-rotate", "");
      else mv.removeAttribute("auto-rotate");

      const src = el.model_3d_url || "";
      if (!src) {
        loading.hidden = false;
        loadingText.textContent = "Chưa có mô hình GLB — chuyển sang Nguyên tử tương tác";
        state.model3dMode = "atom";
        setTimeout(updateModel3DStage, 700);
        return;
      }
      if (mv.getAttribute("src") !== src) {
        loading.hidden = false;
        loadingText.textContent = `Đang tải mô hình 3D của ${el.name_en}...`;
        mv.setAttribute("alt", `Mô hình 3D của nguyên tố ${el.name_en} (${el.symbol})`);
        mv.setAttribute("src", src);
      }
    } else {
      mv.hidden = true;
      loading.hidden = true;
      cv.hidden = false;
      if (!atom3DAttached) {
        Atom3D.attach(cv);
        atom3DAttached = true;
      }
      Atom3D.setElement(el);
      if (isActive) Atom3D.start();
    }
  }

  function renderModel3DInfo() {
    const panel = document.getElementById("m3dInfoPanel");
    if (!panel) return;
    const el = getModel3DElement();
    const Z = el.number;
    const A = Math.max(Z, Math.round(Number(el.atomic_mass) || Z * 2));
    const N = Math.max(0, A - Z);
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const qrSvg = getElementQRCodeSVG(el);

    panel.innerHTML = `
      <div class="m3d-info-head">
        <div class="m3d-info-sym"><small>#${Z}</small><strong>${el.symbol}</strong></div>
        <div style="min-width:0">
          <span class="gallery-cat-tag" style="--el-color:${color}">${el.category_vi}</span>
          <h2>${el.name_en}</h2>
          <p>${el.atomic_mass} u</p>
        </div>
      </div>

      <div class="m3d-particles">
        <div class="m3d-particle"><span class="dot" style="background:#eb4848"></span><strong>${Z}</strong><small>Proton (p⁺)</small></div>
        <div class="m3d-particle"><span class="dot" style="background:#608cd2"></span><strong>${N}</strong><small>Nơtron (n⁰)</small></div>
        <div class="m3d-particle"><span class="dot" style="background:${color}"></span><strong>${Z}</strong><small>Electron (e⁻)</small></div>
      </div>

      <div class="modal-info-box">
        <h4>Phân bố electron theo lớp</h4>
        <div class="m3d-shell-bar">
          ${(el.shells || []).map((n, i) => `<span class="m3d-shell-chip">${"KLMNOPQ"[i] || i + 1}: ${n}e⁻</span>`).join("")}
        </div>
        <p style="font-family: var(--font-mono); font-size: 0.78rem; margin-top: 6px; color: var(--text-secondary);">${el.electron_configuration_semantic || el.electron_configuration}</p>
      </div>

      <div class="modal-info-box">
        <h4>Giới thiệu</h4>
        <p style="font-size: 0.84rem;">${el.summary_vi}</p>
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        <div class="spotlight-qr-mini" style="--spot-color:${color}; width:72px; height:72px;" title="Mã QR của ${el.name_en}">${qrSvg}</div>
        <p style="font-size:0.76rem; color: var(--text-muted);">Mô hình hiển thị cấu trúc nguyên tử Bohr: hạt nhân gồm proton (đỏ) và nơtron (xanh), các electron chuyển động trên ${
          (el.shells || []).length
        } lớp vỏ.</p>
      </div>

      <div class="m3d-info-actions">
        <button type="button" class="tool-btn" id="m3dOpenDetailBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>Chi tiết</span>
        </button>
        <button type="button" class="tool-btn highlight-btn" id="m3dRandomBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          <span>Ngẫu nhiên</span>
        </button>
      </div>
    `;

    document.getElementById("m3dOpenDetailBtn")?.addEventListener("click", () => openElementModal(el.number));
    document.getElementById("m3dRandomBtn")?.addEventListener("click", () => {
      selectModel3DElement(Math.floor(Math.random() * state.maxElements) + 1);
    });
  }

  function renderModel3DPicker() {
    const picker = document.getElementById("m3dPicker");
    if (!picker) return;
    const list = getActiveScopeElements().filter(matchesFilters);
    document.getElementById("m3dPickerCount").textContent = `${list.length} nguyên tố`;
    picker.innerHTML = list
      .map((el) => {
        const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
        const active = el.number === state.model3dNumber ? "active" : "";
        return `<button type="button" class="m3d-pick ${active}" data-m3d-num="${el.number}" style="--el-color:${color}" title="${el.name_en} (${el.symbol})">
          <small>${el.number}</small><strong>${el.symbol}</strong><span>${el.name_en}</span>
        </button>`;
      })
      .join("");
    picker.querySelectorAll("[data-m3d-num]").forEach((btn) => {
      btn.addEventListener("click", () => selectModel3DElement(Number(btn.getAttribute("data-m3d-num"))));
    });
  }

  // Thứ tự các mục chính để xác định hướng trượt (Trái <-> Phải)
  const VIEW_ORDER = ["table", "gallery", "compare", "qrcodes", "model3d"];
  let modalCloseTimer = null;

  function triggerViewSlide(sectionEl, direction = "right") {
    if (!sectionEl) return;
    sectionEl.classList.remove("view-slide-right", "view-slide-left");
    void sectionEl.offsetWidth;
    sectionEl.classList.add(direction === "left" ? "view-slide-left" : "view-slide-right");
  }

  function triggerSubviewSlide(targetEl, direction = "right") {
    if (!targetEl) return;
    targetEl.classList.remove("subview-slide-right", "subview-slide-left");
    void targetEl.offsetWidth;
    targetEl.classList.add(direction === "left" ? "subview-slide-left" : "subview-slide-right");
  }

  // Tìm ô nguyên tố tương ứng trên giao diện hiện tại để tính tâm phóng to / thu nhỏ
  function findElementTriggerCard(number) {
    if (state.activeView === "table") {
      if (state.tableSubmode === "cards") {
        return document.querySelector(`.compact-el-card[data-compact-num="${number}"]`);
      }
      return document.querySelector(`.el-tile[data-number="${number}"]`);
    }
    if (state.activeView === "gallery") {
      return document.querySelector(`.gallery-card[data-number="${number}"]`);
    }
    if (state.activeView === "qrcodes") {
      return document.querySelector(`.qr-element-card[data-number="${number}"]`);
    }
    return document.querySelector(`.el-tile[data-number="${number}"]`);
  }

  // Cập nhật tọa độ gốc (--zoom-origin-x, --zoom-origin-y) từ ô nguyên tố tới cửa sổ Modal
  function syncModalZoomOrigin(number, triggerOpenPulse = false) {
    const dialog = document.querySelector("#elementModal .modal-dialog");
    document.querySelectorAll(".active-modal-tile, .tile-zoom-open").forEach((el) => {
      el.classList.remove("active-modal-tile", "tile-zoom-open");
    });

    const card = findElementTriggerCard(number);
    if (card) {
      if (card.classList.contains("el-tile")) {
        card.classList.add("active-modal-tile");
      }
      if (triggerOpenPulse) {
        card.classList.remove("tile-zoom-return");
        void card.offsetWidth;
        card.classList.add("tile-zoom-open");
      }
      if (dialog) {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const tileCenterX = rect.left + rect.width / 2;
          const tileCenterY = rect.top + rect.height / 2;
          const viewportCenterX = window.innerWidth / 2;
          const viewportCenterY = window.innerHeight / 2;
          const dx = Math.round(tileCenterX - viewportCenterX);
          const dy = Math.round(tileCenterY - viewportCenterY);
          dialog.style.setProperty("--zoom-origin-x", `${dx}px`);
          dialog.style.setProperty("--zoom-origin-y", `${dy}px`);
          return;
        }
      }
    }

    if (dialog) {
      dialog.style.setProperty("--zoom-origin-x", "0px");
      dialog.style.setProperty("--zoom-origin-y", "28px");
    }
  }

  function selectModel3DElement(num) {
    const prevNum = state.model3dNumber;
    if (num < 1) num = state.maxElements;
    if (num > state.maxElements) num = 1;
    const slideDir = num >= prevNum ? "right" : "left";
    state.model3dNumber = num;
    updateModel3DStage();
    renderModel3DInfo();
    triggerSubviewSlide(document.getElementById("m3dInfoPanel"), slideDir);
    document.querySelectorAll("#m3dPicker .m3d-pick").forEach((b) => {
      b.classList.toggle("active", Number(b.getAttribute("data-m3d-num")) === num);
    });
    const activeBtn = document.querySelector(`#m3dPicker .m3d-pick[data-m3d-num="${num}"]`);
    activeBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  function renderModel3DView() {
    if (state.model3dNumber > state.maxElements) state.model3dNumber = state.maxElements;
    updateModel3DStage();
    renderModel3DInfo();
    renderModel3DPicker();
  }

  function openModel3DFor(num) {
    state.model3dNumber = num;
    closeElementModal();
    document.querySelector('.view-btn[data-view="model3d"]')?.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initModel3DEvents() {
    const mv = document.getElementById("m3dModelViewer");
    const loading = document.getElementById("m3dLoading");
    const loadingText = document.getElementById("m3dLoadingText");

    mv?.addEventListener("load", () => {
      loading.hidden = true;
    });
    mv?.addEventListener("error", () => {
      loadingText.textContent = "Không tải được mô hình GLB (kiểm tra kết nối mạng) — chuyển sang Nguyên tử tương tác";
      setTimeout(() => {
        state.model3dMode = "atom";
        updateModel3DStage();
      }, 1200);
    });

    document.getElementById("btnM3dGlb")?.addEventListener("click", () => {
      if (state.model3dMode !== "glb") {
        state.model3dMode = "glb";
        updateModel3DStage();
        triggerSubviewSlide(document.getElementById("m3dCanvasWrap"), "left");
      }
    });
    document.getElementById("btnM3dAtom")?.addEventListener("click", () => {
      if (state.model3dMode !== "atom") {
        state.model3dMode = "atom";
        updateModel3DStage();
        triggerSubviewSlide(document.getElementById("m3dCanvasWrap"), "right");
      }
    });

    document.getElementById("m3dAutoRotateBtn")?.addEventListener("click", () => {
      state.m3dAutoRotate = !state.m3dAutoRotate;
      updateModel3DStage();
    });

    document.getElementById("m3dResetBtn")?.addEventListener("click", () => {
      if (state.model3dMode === "glb" && mv) {
        mv.cameraOrbit = "0deg 75deg 105%";
        mv.fieldOfView = "auto";
        mv.jumpCameraToGoal?.();
      } else {
        Atom3D.reset();
      }
    });

    document.getElementById("m3dFullscreenBtn")?.addEventListener("click", () => {
      const wrap = document.getElementById("m3dCanvasWrap");
      if (document.fullscreenElement) document.exitFullscreen?.();
      else wrap?.requestFullscreen?.();
    });

    document.getElementById("m3dPrevBtn")?.addEventListener("click", () => selectModel3DElement(state.model3dNumber - 1));
    document.getElementById("m3dNextBtn")?.addEventListener("click", () => selectModel3DElement(state.model3dNumber + 1));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) Atom3D.stop();
      else if (state.activeView === "model3d" && state.model3dMode === "atom") Atom3D.start();
    });
  }

  // Mở Cửa Sổ Modal Chi Tiết Nguyên Tố (Hỗ trợ hiệu ứng phóng to từ ô nguyên tố & trượt chuyển nguyên tố)
  function openElementModal(number, slideDir = null) {
    const el = ALL_ELEMENTS.find((item) => item.number === number);
    if (!el) return;

    if (modalCloseTimer) {
      clearTimeout(modalCloseTimer);
      modalCloseTimer = null;
    }

    const modal = document.getElementById("elementModal");
    const dialog = modal?.querySelector(".modal-dialog");
    const body = document.getElementById("modalBodyContent");
    const catBadge = document.getElementById("modalCategoryBadge");
    const color = CATEGORY_COLORS[el.category_id] || "#38bdf8";
    const wasHidden = modal ? modal.hidden || modal.classList.contains("modal-closing") : true;

    state.modalNumber = number;
    state.spotlightNumber = number;

    // Đồng bộ ô được chọn trên bảng tuần hoàn
    document.querySelectorAll(".el-tile.selected-tile").forEach((n) => n.classList.remove("selected-tile"));
    const activeTile = document.querySelector(`.el-tile[data-number="${number}"]`);
    if (activeTile) activeTile.classList.add("selected-tile");

    // Tính toán tâm phóng to từ ô nguyên tố vừa nhấn
    syncModalZoomOrigin(number, true);

    catBadge.textContent = el.category_vi;
    catBadge.style.borderColor = color;
    catBadge.style.color = color;

    const prevNum = number > 1 ? number - 1 : state.maxElements;
    const nextNum = number < state.maxElements ? number + 1 : 1;
    const prevEl = ALL_ELEMENTS.find((e) => e.number === prevNum);
    const nextEl = ALL_ELEMENTS.find((e) => e.number === nextNum);

    document.getElementById("prevElementLabel").textContent = `#${prevEl.number} (${prevEl.name_en})`;
    document.getElementById("nextElementLabel").textContent = `#${nextEl.number} (${nextEl.name_en})`;
    document.getElementById("prevElementBtn").onclick = () => openElementModal(prevNum, "prev");
    document.getElementById("nextElementBtn").onclick = () => openElementModal(nextNum, "next");

    const imgSrc = getElementImageSrc(el);
    const fallbackUri = createElementVisualDataURI(el);
    const qrSvg = getElementQRCodeSVG(el);
    const meltC = el.melt != null ? `${(el.melt - 273.15).toFixed(1)} °C (${el.melt} K)` : "Chưa xác định";
    const boilC = el.boil != null ? `${(el.boil - 273.15).toFixed(1)} °C (${el.boil} K)` : "Chưa xác định";

    body.innerHTML = `
      <div class="modal-hero-grid" style="--el-color: ${color}">
        <div class="modal-photo-card">
          <img src="${imgSrc}" alt="Hình ảnh thực tế của nguyên tố ${el.name_en}" onerror="this.onerror=null;this.src='${fallbackUri}';" />
          <div class="modal-photo-caption">
            <strong>Hình ảnh mẫu vật:</strong> ${el.image_title || el.name_en}
          </div>
        </div>

        <div class="modal-main-summary">
          <div class="modal-title-row">
            <div class="modal-big-symbol">${el.symbol}</div>
            <div>
              <span style="font-family: var(--font-mono); color: ${color}; font-size: 0.84rem; font-weight: 700;">SỐ HIỆU NGUYÊN TỬ #${el.number}</span>
              <h2 id="modalElementTitle" style="font-size: clamp(1.4rem, 2.2vw, 2.1rem); font-weight: 800; line-height: 1.15; color: #ffffff;">
                <strong>(${el.name_en})</strong>
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
            <button type="button" class="modal-3d-btn" id="modalOpen3DBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span>Xem mô hình 3D</span>
            </button>
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
        <div class="spec-item"><small>Chu kỳ / Nhóm / Khối</small><strong>Chu kỳ ${el.period} • ${getElementGroupLabel(el)} • Khối ${el.block}</strong></div>
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
    document.getElementById("modalOpen3DBtn")?.addEventListener("click", () => {
      openModel3DFor(el.number);
    });

    modal.hidden = false;
    modal.classList.remove("modal-closing");

    if (wasHidden) {
      modal.classList.remove("modal-opening");
      void modal.offsetWidth;
      modal.classList.add("modal-opening");

      if (dialog) {
        dialog.classList.remove("modal-zoom-out", "modal-zoom-in");
        void dialog.offsetWidth;
        dialog.classList.add("modal-zoom-in");
      }
      body.classList.remove("modal-slide-next", "modal-slide-prev");
    } else if (slideDir) {
      body.classList.remove("modal-slide-next", "modal-slide-prev");
      void body.offsetWidth;
      body.classList.add(slideDir === "prev" ? "modal-slide-prev" : "modal-slide-next");
    }
  }

  function closeElementModal() {
    const modal = document.getElementById("elementModal");
    if (!modal || modal.hidden) return;

    const dialog = modal.querySelector(".modal-dialog");
    const closingNum = state.modalNumber;
    state.modalNumber = null;

    if (closingNum != null) {
      syncModalZoomOrigin(closingNum, false);
      const returnCard = findElementTriggerCard(closingNum);
      if (returnCard) {
        returnCard.classList.remove("tile-zoom-open", "active-modal-tile", "tile-zoom-return");
        void returnCard.offsetWidth;
        returnCard.classList.add("tile-zoom-return");
      }
    }

    modal.classList.remove("modal-opening");
    modal.classList.add("modal-closing");
    if (dialog) {
      dialog.classList.remove("modal-zoom-in");
      void dialog.offsetWidth;
      dialog.classList.add("modal-zoom-out");
    }

    if (modalCloseTimer) clearTimeout(modalCloseTimer);
    modalCloseTimer = setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove("modal-closing", "modal-opening");
      if (dialog) dialog.classList.remove("modal-zoom-out", "modal-zoom-in");
      document.querySelectorAll(".active-modal-tile, .tile-zoom-open").forEach((el) => {
        el.classList.remove("active-modal-tile", "tile-zoom-open");
      });
      modalCloseTimer = null;
    }, 280);
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
    } else if (state.activeView === "model3d") {
      renderModel3DView();
    }

    if (state.activeView !== "model3d") {
      Atom3D.stop();
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
    const mobBottomNav = document.getElementById("mobileBottomNav") || document.querySelector(".mobile-bottom-nav");
    const mobNavGlider = document.getElementById("mobNavGlider");
    const desktopNavGlider = document.getElementById("desktopNavGlider");
    const MOB_VIEW_ORDER = ["table", "gallery", "qrcodes", "model3d", "compare"];
    let gliderTimer = null;

    function syncNavGliders(animateStretch = false) {
      // 1. Thanh điều hướng ở dưới (Mobile / Tablet Bottom Nav)
      if (mobBottomNav) {
        const mobIdx = Math.max(0, MOB_VIEW_ORDER.indexOf(state.activeView));
        mobBottomNav.style.setProperty("--mob-idx", String(mobIdx));

        const activeMobBtn = mobBottomNav.querySelector(`.mob-nav-item[data-view="${state.activeView}"]`);
        if (activeMobBtn && mobNavGlider) {
          if (activeMobBtn.offsetWidth > 0) {
            mobNavGlider.style.setProperty("--mob-glider-x", `${activeMobBtn.offsetLeft}px`);
            mobNavGlider.style.setProperty("--mob-glider-w", `${activeMobBtn.offsetWidth}px`);
          } else {
            mobNavGlider.style.removeProperty("--mob-glider-x");
            mobNavGlider.style.removeProperty("--mob-glider-w");
          }

          if (animateStretch) {
            mobNavGlider.classList.add("glider-moving");
            if (gliderTimer) clearTimeout(gliderTimer);
            gliderTimer = setTimeout(() => {
              mobNavGlider.classList.remove("glider-moving");
            }, 340);
          }
        }
      }

      // 2. Thanh điều hướng ở trên (Desktop / Laptop Tabs)
      const activeDeskBtn = document.querySelector(`.desktop-view-tabs .view-btn[data-view="${state.activeView}"]`);
      if (activeDeskBtn && desktopNavGlider) {
        if (activeDeskBtn.offsetWidth > 0) {
          desktopNavGlider.style.setProperty("--desk-glider-x", `${activeDeskBtn.offsetLeft}px`);
          desktopNavGlider.style.setProperty("--desk-glider-w", `${activeDeskBtn.offsetWidth}px`);
        }
      }
    }

    function activateView(view, fromMobileBar = false) {
      if (!view || view === state.activeView) {
        syncNavGliders(false);
        return;
      }

      const orderArr = fromMobileBar ? MOB_VIEW_ORDER : VIEW_ORDER;
      const oldIdx = orderArr.indexOf(state.activeView);
      const newIdx = orderArr.indexOf(view);
      const slideDir = newIdx >= oldIdx ? "right" : "left";

      state.activeView = view;
      viewButtons.forEach((b) => {
        const active = b.getAttribute("data-view") === view;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });

      syncNavGliders(true);

      const secModel3D = document.getElementById("viewModel3DSection");
      const sectionMap = {
        table: secTable,
        gallery: secGallery,
        compare: secCompare,
        qrcodes: secQRCodes,
        model3d: secModel3D
      };

      secTable.hidden = view !== "table";
      secGallery.hidden = view !== "gallery";
      secCompare.hidden = view !== "compare";
      if (secQRCodes) secQRCodes.hidden = view !== "qrcodes";
      if (secModel3D) secModel3D.hidden = view !== "model3d";

      renderAll();
      triggerViewSlide(sectionMap[view], slideDir);
    }

    viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        const isMob = btn.classList.contains("mob-nav-item");
        activateView(view, isMob);
      });
    });

    // Hỗ trợ vuốt / kéo ngón tay trượt trực tiếp trên thanh điều hướng dưới
    if (mobBottomNav) {
      let isDraggingNav = false;
      const pickViewFromPoint = (clientX) => {
        const items = Array.from(mobBottomNav.querySelectorAll(".mob-nav-item"));
        for (const item of items) {
          const r = item.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right) {
            return item.getAttribute("data-view");
          }
        }
        return null;
      };

      mobBottomNav.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch") {
          isDraggingNav = true;
        }
      });

      mobBottomNav.addEventListener("pointermove", (e) => {
        if (!isDraggingNav) return;
        const targetView = pickViewFromPoint(e.clientX);
        if (targetView && targetView !== state.activeView) {
          activateView(targetView, true);
        }
      });

      window.addEventListener("pointerup", () => {
        isDraggingNav = false;
      });
    }

    requestAnimationFrame(() => syncNavGliders(false));

    // Chuyển kiểu hiển thị trong tab Bảng Tuần Hoàn: Sơ đồ 18 cột vs Lưới Thẻ Gọn (Mobile)
    const btnGrid18 = document.getElementById("btnSubmodeGrid18");
    const btnCards = document.getElementById("btnSubmodeCards");

    function updateSubmodeButtons() {
      btnGrid18?.classList.toggle("active", state.tableSubmode === "grid18");
      btnCards?.classList.toggle("active", state.tableSubmode === "cards");
    }
    updateSubmodeButtons();

    btnGrid18?.addEventListener("click", () => {
      if (state.tableSubmode !== "grid18") {
        state.tableSubmode = "grid18";
        updateSubmodeButtons();
        renderPeriodicTable();
        triggerSubviewSlide(document.getElementById("periodicBoard"), "left");
      }
    });

    btnCards?.addEventListener("click", () => {
      if (state.tableSubmode !== "cards") {
        state.tableSubmode = "cards";
        updateSubmodeButtons();
        renderPeriodicTable();
        triggerSubviewSlide(document.getElementById("compactCardsGrid"), "right");
      }
    });

    // Nút đóng/mở ngăn bộ lọc & nhiệt độ trên điện thoại
    const mobFilterBtn = document.getElementById("mobileFilterToggleBtn");
    const expandableControls = document.getElementById("expandableControls");
    mobFilterBtn?.addEventListener("click", () => {
      const isOpen = expandableControls.classList.toggle("open");
      mobFilterBtn.classList.toggle("active", isOpen);
      mobFilterBtn.setAttribute("aria-expanded", String(isOpen));
    });

    // Tự động điều chỉnh vị trí Spotlight và khung trượt điều hướng khi xoay màn hình hoặc thay đổi kích thước cửa sổ
    window.addEventListener("resize", () => {
      syncSpotlightPlacement();
      syncNavGliders(false);
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

    document.getElementById("openQRPosterBtn")?.addEventListener("click", openQRPosterModal);
    document.getElementById("downloadQRPosterBtn")?.addEventListener("click", download118QRPosterPNG);
    document.getElementById("closeQRPosterModalBtn")?.addEventListener("click", closeQRPosterModal);
    document.getElementById("posterPrint1PageBtn")?.addEventListener("click", print118QRPosterOnePage);
    document.getElementById("posterDownloadPngBtn")?.addEventListener("click", download118QRPosterPNG);
    document.getElementById("qrPosterModal")?.addEventListener("click", (e) => {
      if (e.target.id === "qrPosterModal") closeQRPosterModal();
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

    // Lọc theo Chu kỳ & Nhóm (Dropdown và nút bỏ lọc)
    const periodFilterSelect = document.getElementById("periodFilterSelect");
    const groupFilterSelect = document.getElementById("groupFilterSelect");
    const resetPeriodGroupBtn = document.getElementById("resetPeriodGroupBtn");

    periodFilterSelect?.addEventListener("change", () => {
      state.selectedPeriod = periodFilterSelect.value;
      syncPeriodGroupDropdowns();
      renderAll();
    });

    groupFilterSelect?.addEventListener("change", () => {
      state.selectedGroup = groupFilterSelect.value;
      syncPeriodGroupDropdowns();
      renderAll();
    });

    resetPeriodGroupBtn?.addEventListener("click", () => {
      state.selectedPeriod = "all";
      state.selectedGroup = "all";
      syncPeriodGroupDropdowns();
      renderAll();
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
        const posterModal = document.getElementById("qrPosterModal");
        if (posterModal && !posterModal.hidden) {
          closeQRPosterModal();
        } else if (state.modalNumber != null) {
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
          openElementModal(next, "next");
        } else if (e.key === "ArrowLeft") {
          const prev = state.modalNumber > 1 ? state.modalNumber - 1 : state.maxElements;
          openElementModal(prev, "prev");
        }
      }
    });
  }

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    initModel3DEvents();
    populateCompareSelectors();
    renderAll();
    checkUrlQRCodeDeepLink();
  });
})();
