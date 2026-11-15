export interface FaceCaptureResult {
  descriptor: number[];
  previewDataUrl: string;
}

/**
 * Extracts a lighting-normalized facial region luminance + edge-gradient descriptor
 * from a live camera frame or uploaded portrait image for SQLite Face Lock matching.
 */
export function extractFaceDescriptorFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): FaceCaptureResult {
  let srcW = 0;
  let srcH = 0;

  if (source instanceof HTMLVideoElement) {
    srcW = source.videoWidth;
    srcH = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    srcW = source.naturalWidth || source.width;
    srcH = source.naturalHeight || source.height;
  } else {
    srcW = source.width;
    srcH = source.height;
  }

  if (srcW < 40 || srcH < 40) {
    throw new Error('Camera frame not ready yet. Please wait a moment and try again.');
  }

  // Center portrait crop covering the facial guide region
  const cropSide = Math.min(srcW * 0.65, srcH * 0.78);
  const cropW = cropSide;
  const cropH = cropSide;
  const sx = Math.max(0, (srcW - cropW) / 2);
  const sy = Math.max(0, (srcH - cropH) / 2);

  // Preview thumbnail for user confirmation
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 160;
  previewCanvas.height = 160;
  const pCtx = previewCanvas.getContext('2d');
  if (!pCtx) {
    throw new Error('Browser 2D canvas unavailable for face capture.');
  }
  pCtx.drawImage(source, sx, sy, cropW, cropH, 0, 0, 160, 160);
  const previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.8);

  // 20x20 grayscale luminance + Sobel edge-energy grid
  const GRID = 20;
  const workCanvas = document.createElement('canvas');
  workCanvas.width = GRID;
  workCanvas.height = GRID;
  const ctx = workCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser 2D canvas unavailable for face capture.');
  }
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, GRID, GRID);
  const imgData = ctx.getImageData(0, 0, GRID, GRID).data;

  const gray: number[] = new Array(GRID * GRID);
  let sum = 0;
  for (let i = 0; i < GRID * GRID; i += 1) {
    const idx = i * 4;
    const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
    gray[i] = lum;
    sum += lum;
  }

  const mean = sum / gray.length;
  let variance = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const diff = gray[i] - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / gray.length);
  if (std < 7.5) {
    throw new Error(
      'Face image is too dark, blurry, or covered. Ensure clear front lighting and try again.'
    );
  }

  // Z-score normalized luminance vector (400 features)
  const features: number[] = [];
  for (let i = 0; i < gray.length; i += 1) {
    features.push((gray[i] - mean) / std);
  }

  // 4x4 spatial block horizontal/vertical/diagonal edge energies (64 features)
  const BLOCKS = 4;
  const blockSize = GRID / BLOCKS;
  for (let by = 0; by < BLOCKS; by += 1) {
    for (let bx = 0; bx < BLOCKS; bx += 1) {
      let gxPos = 0;
      let gxNeg = 0;
      let gyPos = 0;
      let gyNeg = 0;
      for (let dy = 0; dy < blockSize; dy += 1) {
        for (let dx = 0; dx < blockSize; dx += 1) {
          const y = by * blockSize + dy;
          const x = bx * blockSize + dx;
          const xL = Math.max(0, x - 1);
          const xR = Math.min(GRID - 1, x + 1);
          const yU = Math.max(0, y - 1);
          const yD = Math.min(GRID - 1, y + 1);
          const gx = (gray[y * GRID + xR] - gray[y * GRID + xL]) / std;
          const gy = (gray[yD * GRID + x] - gray[yU * GRID + x]) / std;
          if (gx >= 0) gxPos += gx;
          else gxNeg += -gx;
          if (gy >= 0) gyPos += gy;
          else gyNeg += -gy;
        }
      }
      features.push(gxPos, gxNeg, gyPos, gyNeg);
    }
  }

  let normSq = 0;
  for (const f of features) normSq += f * f;
  const norm = Math.sqrt(normSq) || 1;
  const descriptor = features.map((f) => Number((f / norm).toFixed(5)));

  return { descriptor, previewDataUrl };
}

export function loadImageFileToElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode selected image file.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.readAsDataURL(file);
  });
}
