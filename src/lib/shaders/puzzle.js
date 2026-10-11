// Shader puzzles compare a deterministic, fixed-size render with a public
// reference image. Rendering stays in the browser because GLSL requires a
// WebGL implementation; this module contains the shared, server-safe config
// validation as well as the browser comparison helpers.

export const SHADER_PUZZLE_LIMITS = {
  minSize: 16,
  maxSize: 512,
  maxReferenceLength: 400_000,
};

const DATA_IMAGE = /^(?:data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*|data:image\/svg\+xml,[^\r\n]+)$/i;

export class InvalidShaderPuzzleError extends Error {}

export function getShaderPuzzle(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object") {
    throw new InvalidShaderPuzzleError("Invalid shader puzzle configuration.");
  }

  const { width, height, tolerance, requiredMatch, referenceImage } = value;
  const validSize = (n) => Number.isInteger(n) && n >= SHADER_PUZZLE_LIMITS.minSize && n <= SHADER_PUZZLE_LIMITS.maxSize;
  const validRatio = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

  if (
    !validSize(width) ||
    !validSize(height) ||
    !validRatio(tolerance) ||
    !validRatio(requiredMatch) ||
    requiredMatch < 0.5 ||
    typeof referenceImage !== "string" ||
    referenceImage.length > SHADER_PUZZLE_LIMITS.maxReferenceLength ||
    !DATA_IMAGE.test(referenceImage)
  ) {
    throw new InvalidShaderPuzzleError("Invalid shader puzzle configuration.");
  }

  return { width, height, tolerance, requiredMatch, referenceImage };
}

// Kept separate from getShaderPuzzle so server components can validate and
// serialize a puzzle without ever touching browser globals.
export async function compareShaderRender(referenceImage, candidateImage, config) {
  const puzzle = getShaderPuzzle({ ...config, referenceImage });
  if (typeof document === "undefined") throw new Error("Shader image comparison requires a browser.");

  const [reference, candidate] = await Promise.all([
    imageDataFromSource(referenceImage, puzzle.width, puzzle.height),
    imageDataFromSource(candidateImage, puzzle.width, puzzle.height),
  ]);

  return compareShaderPixels(reference.data, candidate.data, puzzle);
}

export function compareShaderPixels(reference, candidate, { width, height, tolerance, requiredMatch }) {
  const pixelCount = width * height;
  if (!pixelCount || reference.length !== pixelCount * 4 || candidate.length !== reference.length) {
    throw new Error("The shader images have invalid dimensions.");
  }
  let matching = 0;
  for (let i = 0; i < reference.length; i += 4) {
    const difference = Math.max(
      Math.abs(reference[i] - candidate[i]),
      Math.abs(reference[i + 1] - candidate[i + 1]),
      Math.abs(reference[i + 2] - candidate[i + 2])
    ) / 255;
    if (difference <= tolerance) matching += 1;
  }

  const matchRatio = matching / pixelCount;
  return { solved: matchRatio >= requiredMatch, matchRatio };
}

function imageDataFromSource(source, width, height) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("This browser cannot compare shader images.");
        // Match the opaque black WebGL canvas when a reference has transparency.
        context.fillStyle = "black";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(context.getImageData(0, 0, width, height));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("The shader reference image could not be loaded."));
    image.src = source;
  });
}
