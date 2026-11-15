# -*- coding: utf-8 -*-
"""
Công cụ xuất tự động 118 thẻ mã QR nguyên tố hóa học dạng PNG chất lượng cao
Hỗ trợ cả môi trường Local (Mạng LAN Wi-Fi) và Public Online (GitHub Pages / Vercel / Netlify)

Cách dùng:
  1. Khi đưa lên GitHub Pages:
     python export_qr.py --github USERNAME/REPO
     Ví dụ: python export_qr.py --github minhbao/tracuunguyento
     -> Link mã QR sẽ là: https://minhbao.github.io/tracuunguyento/?element=Z&symbol=Sym

  2. Hoặc nhập trực tiếp URL trang web của bạn:
     python export_qr.py --url https://minhbao.github.io/tracuunguyento/

  3. Khi chạy thử nội bộ trong nhà (mặc định lấy IP LAN Wi-Fi):
     python export_qr.py --lan
"""

import os
import sys
import json
import socket
import argparse
from PIL import Image, ImageDraw, ImageFont

# Import qrcodegen đi kèm dự án
try:
    from qrcodegen import QrCode
except ImportError:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    from qrcodegen import QrCode

def get_lan_ip():
    """Tự động phát hiện IP mạng LAN nội bộ của máy tính"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.16"

def parse_arguments():
    parser = argparse.ArgumentParser(description="Xuất mã QR 118 nguyên tố hóa học")
    parser.add_argument(
        "--github",
        type=str,
        help="Định dạng: USERNAME/REPO (Ví dụ: baongu/tracuunguyento)"
    )
    parser.add_argument(
        "--url",
        type=str,
        help="URL gốc của trang web đã publish (Ví dụ: https://username.github.io/repo/)"
    )
    parser.add_argument(
        "--lan",
        action="store_true",
        help="Sử dụng IP LAN nội bộ để test thử trên điện thoại cùng Wi-Fi"
    )
    parser.add_argument(
        "--ip",
        type=str,
        default=None,
        help="Chỉ định IP thủ công (Mặc định tự động nhận diện)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8108,
        help="Cổng port khi chạy server nội bộ (Mặc định: 8108)"
    )
    return parser.parse_args()

def main():
    args = parse_arguments()
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Xác định Base URL
    if args.github:
        repo_slug = args.github.strip().strip("/")
        parts = repo_slug.split("/")
        if len(parts) == 2:
            base_url = f"https://{parts[0]}.github.io/{parts[1]}/"
        else:
            base_url = f"https://{parts[0]}.github.io/"
        source_mode = f"GitHub Pages ({base_url})"
    elif args.url:
        base_url = args.url.strip()
        if not base_url.endswith("/"):
            base_url += "/"
        source_mode = f"Custom URL ({base_url})"
    else:
        ip = args.ip or get_lan_ip()
        base_url = f"http://{ip}:{args.port}/"
        source_mode = f"Mạng LAN Wi-Fi ({base_url})"

    print("=" * 60)
    print(f"BẮT ĐẦU XUẤT 118 MÃ QR NGUYÊN TỐ HÓA HỌC")
    print(f"• Chế độ: {source_mode}")
    print(f"• Đường dẫn mẫu: {base_url}?element=79&symbol=Au")
    print("=" * 60)

    # Đọc dữ liệu nguyên tố
    data_path = os.path.join(base_dir, "elements_data.js")
    with open(data_path, "r", encoding="utf-8") as f:
        content = f.read()

    json_str = content.split("window.ELEMENTS_DATA =", 1)[1].strip()
    if json_str.endswith(";"):
        json_str = json_str[:-1]

    elements = json.loads(json_str)

    out_dir = os.path.join(base_dir, "qr_elements")
    os.makedirs(out_dir, exist_ok=True)

    # Bảng màu theo nhóm nguyên tố
    CATEGORY_HEX = {
        "alkali-metal": "#ff5c7c",
        "alkaline-earth": "#ff9e44",
        "transition-metal": "#0284c7",
        "post-transition": "#059669",
        "metalloid": "#0d9488",
        "nonmetal": "#65a30d",
        "halogen": "#d97706",
        "noble-gas": "#9333ea",
        "lanthanide": "#db2777",
        "actinide": "#e11d48",
        "superheavy": "#475569"
    }

    # Load fonts
    try:
        font_bold = ImageFont.truetype("arialbd.ttf", 26)
        font_title = ImageFont.truetype("arialbd.ttf", 32)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except Exception:
        font_bold = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_small = ImageFont.load_default()

    count_saved = 0
    for el in elements:
        num = el["number"]
        if num > 118:
            continue
        sym = el["symbol"]
        cat_id = el.get("category_id", "transition-metal")
        theme_color = CATEGORY_HEX.get(cat_id, "#0284c7")

        # URL trực tiếp chuẩn RFC 3986
        qr_url = f"{base_url}?element={num}&symbol={sym}"

        qr = QrCode.encode_text(qr_url, QrCode.Ecc.MEDIUM)
        qr_size = qr.get_size()

        scale = 14
        border = 3
        qr_px = (qr_size + border * 2) * scale

        card_width = qr_px + 40
        header_height = 110
        footer_height = 92
        card_height = header_height + qr_px + footer_height

        img = Image.new("RGB", (card_width, card_height), "#ffffff")
        draw = ImageDraw.Draw(img)

        # 1. Header
        draw.rectangle([0, 0, card_width, 8], fill=theme_color)

        header_sym_text = f"#{num}  {sym}"
        draw.text((24, 22), header_sym_text, fill=theme_color, font=font_title)

        name_text = f"{el['name_vi']} ({el['name_en']})"
        draw.text((24, 62), name_text, fill="#0f172a", font=font_bold)

        cat_text = el['category_vi']
        bbox_cat = draw.textbbox((0, 0), cat_text, font=font_sub)
        cat_w = bbox_cat[2] - bbox_cat[0]
        draw.text((card_width - cat_w - 24, 28), cat_text, fill="#475569", font=font_sub)

        draw.line([(20, 100), (card_width - 20, 100)], fill="#e2e8f0", width=2)

        # 2. QR Code
        qr_start_x = (card_width - qr_px) // 2
        qr_start_y = header_height

        draw.rectangle(
            [qr_start_x, qr_start_y, qr_start_x + qr_px, qr_start_y + qr_px],
            fill="#f8fafc",
            outline="#cbd5e1",
            width=1
        )

        for y in range(qr_size):
            for x in range(qr_size):
                if qr.get_module(x, y):
                    x0 = qr_start_x + (x + border) * scale
                    y0 = qr_start_y + (y + border) * scale
                    draw.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill="#020617")

        # 3. Footer
        footer_y = header_height + qr_px + 14

        scan_hint = "Quét bằng Camera điện thoại để mở hồ sơ tương tác 3D"
        bbox_hint = draw.textbbox((0, 0), scan_hint, font=font_bold)
        hint_w = bbox_hint[2] - bbox_hint[0]
        draw.text(((card_width - hint_w) // 2, footer_y), scan_hint, fill="#0f172a", font=font_bold)

        # Cắt ngắn hiển thị nếu URL quá dài
        display_url = qr_url if len(qr_url) <= 52 else qr_url[:50] + "..."
        bbox_url = draw.textbbox((0, 0), display_url, font=font_small)
        url_w = bbox_url[2] - bbox_url[0]
        draw.text(((card_width - url_w) // 2, footer_y + 38), display_url, fill="#64748b", font=font_small)

        out_path = os.path.join(out_dir, f"{sym}.png")
        saved = False
        for attempt in range(5):
            try:
                img.save(out_path, "PNG")
                saved = True
                break
            except Exception:
                import time
                time.sleep(0.1)

        if saved:
            count_saved += 1

    print(f"-> HOÀN TẤT: Đã xuất thành công {count_saved}/118 file PNG vào thư mục:\n   {out_dir}")

if __name__ == "__main__":
    main()
