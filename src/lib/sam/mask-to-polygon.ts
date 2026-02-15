/**
 * Mask → Polygon conversion (no external dependencies)
 *
 * Pipeline: binarize → contour detection (Suzuki-Abe border following)
 *   → largest contour → Douglas-Peucker simplification → normalized coords
 */

interface Point {
  x: number;
  y: number;
}

export interface PolygonResult {
  /** Flat array of normalized coordinates [x0, y0, x1, y1, ...] */
  points: number[];
  vertexCount: number;
}

/**
 * Convert a logit mask to a simplified polygon in normalized coordinates.
 * Returns null if no valid contour is found.
 */
export function maskToPolygon(
  mask: Float32Array,
  width: number,
  height: number,
  threshold = 0.0,
  epsilon = 2.0,
): PolygonResult | null {
  // Binarize
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    binary[i] = mask[i] > threshold ? 1 : 0;
  }

  // Find contours
  const contours = findContours(binary, width, height);
  if (contours.length === 0) return null;

  // Pick largest contour by area
  let largest = contours[0];
  let largestArea = Math.abs(contourArea(largest));
  for (let i = 1; i < contours.length; i++) {
    const area = Math.abs(contourArea(contours[i]));
    if (area > largestArea) {
      largestArea = area;
      largest = contours[i];
    }
  }

  if (largest.length < 3) return null;

  // Douglas-Peucker simplification
  const simplified = approxPolyDP(largest, epsilon);
  if (simplified.length < 3) return null;

  // Convert to flat normalized coordinates
  const points: number[] = [];
  for (const pt of simplified) {
    points.push(pt.x / width, pt.y / height);
  }

  return { points, vertexCount: simplified.length };
}

// --- Contour detection (border following) ---

function findContours(binary: Uint8Array, w: number, h: number): Point[][] {
  const contours: Point[][] = [];
  // Padded grid to simplify border checking
  const visited = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (binary[idx] !== 1 || visited[idx]) continue;

      // Check if this is a border pixel (adjacent to 0 or edge)
      if (!isBorderPixel(binary, w, h, x, y)) continue;

      const contour = traceContour(binary, visited, w, h, x, y);
      if (contour.length >= 3) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

function isBorderPixel(binary: Uint8Array, w: number, h: number, x: number, y: number): boolean {
  // 4-connectivity check
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [nx, ny] of neighbors) {
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) return true;
    if (binary[ny * w + nx] === 0) return true;
  }
  return false;
}

// 8-connectivity direction: right, down-right, down, down-left, left, up-left, up, up-right
const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

function traceContour(
  binary: Uint8Array,
  visited: Uint8Array,
  w: number,
  h: number,
  startX: number,
  startY: number,
): Point[] {
  const contour: Point[] = [];
  let cx = startX;
  let cy = startY;
  let dir = 7; // Start searching from up-right

  const maxSteps = w * h * 2; // Safety limit
  let steps = 0;

  do {
    contour.push({ x: cx, y: cy });
    visited[cy * w + cx] = 1;

    // Search for next border pixel in 8-connectivity
    let found = false;
    const startDir = (dir + 6) % 8; // Start search from dir-2 (turn back and search clockwise)

    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8;
      const nx = cx + DX[d];
      const ny = cy + DY[d];

      if (nx >= 0 && nx < w && ny >= 0 && ny < h && binary[ny * w + nx] === 1) {
        cx = nx;
        cy = ny;
        dir = d;
        found = true;
        break;
      }
    }

    if (!found) break;
    steps++;
  } while ((cx !== startX || cy !== startY) && steps < maxSteps);

  return contour;
}

// --- Douglas-Peucker simplification ---

export function approxPolyDP(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  // Find the point with maximum distance from the line segment (first, last)
  let maxDist = 0;
  let maxIdx = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = approxPolyDP(points.slice(0, maxIdx + 1), epsilon);
    const right = approxPolyDP(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ex = point.x - lineStart.x;
    const ey = point.y - lineStart.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return num / Math.sqrt(lengthSq);
}

// --- Contour area (Shoelace formula) ---

export function contourArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}
