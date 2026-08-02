import os
from PIL import Image, ImageDraw

def create_cyan_crosshair_document_icon(size):
    # Create image with dark void background (#070A0F) or transparent background
    img = Image.new("RGBA", (size, size), (7, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    
    padding = max(1, int(size * 0.12))
    w = size - 2 * padding
    h = size - 2 * padding

    # Corner fold size
    fold = max(2, int(w * 0.28))
    
    # Document box coordinates
    x0 = padding
    y0 = padding
    x1 = size - padding
    y1 = size - padding

    # Draw rounded dark inner container (#0F141C)
    draw.rounded_rectangle([x0-1, y0-1, x1+1, y1+1], radius=max(2, size // 8), fill=(15, 20, 28, 255))
    
    # Cyan line color (#00F0FF)
    cyan = (0, 240, 255, 255)
    line_w = max(1, int(size * 0.07))

    # Outer document path points: (x0, y0+fold) -> (x0+fold, y0) -> (x1, y0) -> (x1, y1) -> (x0, y1) -> loop
    points = [
        (x0, y0 + fold),
        (x0 + fold, y0),
        (x1, y0),
        (x1, y1),
        (x0, y1),
        (x0, y0 + fold)
    ]
    draw.line(points, fill=cyan, width=line_w)

    # Fold inner lines
    draw.line([(x0, y0 + fold), (x0 + fold, y0 + fold), (x0 + fold, y0)], fill=cyan, width=line_w)

    # Central Crosshair Target
    cx = (x0 + x1) // 2
    cy = (y0 + y1 + fold // 2) // 2
    r = max(2, int(w * 0.18))

    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=cyan, width=line_w)

    # Crosshair ticks
    tick_len = max(2, int(r * 0.6))
    draw.line([(cx, cy - r - tick_len), (cx, cy - r)], fill=cyan, width=line_w)
    draw.line([(cx, cy + r), (cx, cy + r + tick_len)], fill=cyan, width=line_w)
    draw.line([(cx - r - tick_len, cy), (cx - r, cy)], fill=cyan, width=line_w)
    draw.line([(cx + r, cy), (cx + r + tick_len, cy)], fill=cyan, width=line_w)

    return img

def main():
    out_dir = "/Users/jameswei/Desktop/google extensions/AI assint/public/icon"
    os.makedirs(out_dir, exist_ok=True)

    sizes = [16, 32, 48, 128]
    for sz in sizes:
        icon = create_cyan_crosshair_document_icon(sz)
        out_path = os.path.join(out_dir, f"{sz}.png")
        icon.save(out_path, "PNG")
        print(f"Generated icon: {out_path}")

    # Also save a main icon.png
    icon128 = create_cyan_crosshair_document_icon(128)
    icon128.save(os.path.join(out_dir, "icon.png"), "PNG")

if __name__ == "__main__":
    main()
