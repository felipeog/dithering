import { WORKER_EVENT_MAP } from "./constants";
import { TWorkerData } from "./types";

self.onmessage = (event: MessageEvent<TWorkerData>) => {
  const { offscreenCanvas, bitmap, maxLength } = event.data;

  const context = offscreenCanvas.getContext(
    "2d"
  ) as OffscreenCanvasRenderingContext2D;

  const resizedPixels = getResizedPixels(bitmap, maxLength);
  const ditheredPixels = getDitheredPixels(resizedPixels);
  const imageData = getImageData(ditheredPixels);

  self.postMessage({
    type: WORKER_EVENT_MAP.IMAGE_DATA,
    imageData,
  });

  function getResizedPixels(bitmap: ImageBitmap, maxLength = 512) {
    let width = 0;
    let height = 0;

    if (bitmap.width > bitmap.height) {
      width = Math.min(maxLength, bitmap.width);
      height = Math.floor(bitmap.height * (width / bitmap.width));
    } else {
      height = Math.min(maxLength, bitmap.height);
      width = Math.floor(bitmap.width * (height / bitmap.height));
    }

    const pixelsAmount = width * height;

    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);

    const result: number[][][] = [];

    for (let x = 0; x < width; x++) {
      result[x] = [];

      for (let y = 0; y < height; y++) {
        const index = (x + y * width) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        result[x][y] = [r, g, b];
      }

      self.postMessage({
        type: WORKER_EVENT_MAP.RESIZE_PROGRESS,
        progress: ((x + 1) * height) / pixelsAmount,
      });
    }

    return result;
  }

  function getDitheredPixels(pixels: number[][][]) {
    let result = Array.from(pixels);

    const width = result.length;
    const height = result[0].length;
    const pixelsAmount = width * height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const factor = 1;

        const [oldR, oldG, oldB] = result[x][y];

        const newR = Math.round(factor * (oldR / 255)) * (255 / factor);
        const newG = Math.round(factor * (oldG / 255)) * (255 / factor);
        const newB = Math.round(factor * (oldB / 255)) * (255 / factor);

        const errorR = oldR - newR;
        const errorG = oldG - newG;
        const errorB = oldB - newB;

        result[x][y] = [newR, newG, newB];

        if (result?.[x + 1]?.[y]) {
          result[x + 1][y][0] += errorR * (7 / 16);
          result[x + 1][y][1] += errorG * (7 / 16);
          result[x + 1][y][2] += errorB * (7 / 16);
        }

        if (result?.[x - 1]?.[y + 1]) {
          result[x - 1][y + 1][0] += errorR * (3 / 16);
          result[x - 1][y + 1][1] += errorG * (3 / 16);
          result[x - 1][y + 1][2] += errorB * (3 / 16);
        }

        if (result?.[x]?.[y + 1]) {
          result[x][y + 1][0] += errorR * (5 / 16);
          result[x][y + 1][1] += errorG * (5 / 16);
          result[x][y + 1][2] += errorB * (5 / 16);
        }

        if (result?.[x + 1]?.[y + 1]) {
          result[x + 1][y + 1][0] += errorR * (1 / 16);
          result[x + 1][y + 1][1] += errorG * (1 / 16);
          result[x + 1][y + 1][2] += errorB * (1 / 16);
        }
      }

      self.postMessage({
        type: WORKER_EVENT_MAP.DITHER_PROGRESS,
        progress: ((y + 1) * width) / pixelsAmount,
      });
    }

    return result;
  }

  function getImageData(pixels: number[][][]) {
    const width = pixels.length;
    const height = pixels[0].length;
    const pixelsAmount = width * height;

    const imageData = context.createImageData(width, height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const [r, g, b] = pixels[x][y];
        const i = (y * width + x) * 4;

        imageData.data[i + 0] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }

      self.postMessage({
        type: WORKER_EVENT_MAP.IMAGE_PROGRESS,
        progress: ((x + 1) * height) / pixelsAmount,
      });
    }

    return imageData;
  }
};
