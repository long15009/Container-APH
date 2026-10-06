// Vật liệu có in chữ (kích thước) lên các mặt khối hàng.
// Mỗi mặt có texture riêng vẽ đúng tỉ lệ mặt đó để chữ không bị kéo méo khi khối đơn vị được scale.
import * as THREE from 'three';

const TEXTURE_MAX_SIDE = 384; // px — đủ nét khi zoom gần, nhẹ bộ nhớ
const MIN_FONT_PX = 11; // mặt quá hẹp so với chữ thì chỉ tô màu, không in chữ

function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

function drawFaceTexture(color, label, faceWidth, faceHeight) {
  const scale = TEXTURE_MAX_SIDE / Math.max(faceWidth, faceHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(faceWidth * scale));
  canvas.height = Math.max(16, Math.round(faceHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const font = (size) => `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.font = font(100);
  const widthAt100 = ctx.measureText(label).width;
  const fontSize = Math.floor(Math.min(canvas.height * 0.3, (canvas.width * 0.88 * 100) / widthAt100));
  if (fontSize >= MIN_FONT_PX) {
    ctx.font = font(fontSize);
    ctx.fillStyle = textColorFor(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/**
 * Bộ nhớ đệm vật liệu cho 1 lần dựng cảnh: các khối cùng màu, cùng chữ, cùng kích thước dùng chung vật liệu.
 * @param createPlainMaterial (color) => material không chữ (dùng cho mặt đáy)
 */
export function createLabelMaterialCache(createPlainMaterial) {
  const faceMaterials = new Map();

  function faceMaterial(color, label, faceWidth, faceHeight) {
    const key = `${color}|${label}|${faceWidth.toFixed(2)}x${faceHeight.toFixed(2)}`;
    if (!faceMaterials.has(key)) {
      faceMaterials.set(
        key,
        new THREE.MeshStandardMaterial({
          map: drawFaceTexture(color, label, faceWidth, faceHeight),
          roughness: 0.7,
          metalness: 0.05,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        }),
      );
    }
    return faceMaterials.get(key);
  }

  /**
   * 6 vật liệu theo thứ tự mặt của BoxGeometry: +x, −x, +y (trên), −y (đáy), +z, −z.
   * Kích thước khối l (trục x) × h (trục y) × w (trục z).
   */
  return function materialsFor(color, label, l, h, w) {
    const sideX = faceMaterial(color, label, w, h);
    const top = faceMaterial(color, label, l, w);
    const sideZ = faceMaterial(color, label, l, h);
    return [sideX, sideX, top, createPlainMaterial(color), sideZ, sideZ];
  };
}
