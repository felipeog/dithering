import { WORKER_EVENT_MAP } from "./constants.js";

self.onmessage = (event) => {
  //   console.log("worker", event);

  const { offscreenCanvas, bitmap, maxLength } = event.data;

  const context = offscreenCanvas.getContext("2d");

  const resizedPixels = getResizedPixels(bitmap, maxLength);
  const ditheredPixels = getDitheredPixels(resizedPixels);
  const pathString = getPathString(ditheredPixels);

  self.postMessage({
    type: WORKER_EVENT_MAP.PATH_STRING,
    pathString,
    width: resizedPixels.length,
    height: resizedPixels[0].length,
  });

  function getResizedPixels(bitmap, maxLength = 512) {
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

    const result = [];

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

  function getDitheredPixels(pixels) {
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

  function getPathString(pixels) {
    let pathString = "";

    const width = pixels.length;
    const height = pixels[0].length;
    const pixelsAmount = width * height;

    for (let y = 0; y < height; y++) {
      let d = "";

      for (let x = 0; x < width; x++) {
        const [r, g, b] = pixels[x][y];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (luminance < 255 * (1 / 2)) continue;

        d +=
          `M ${x}, ${y} ` +
          `L ${x + 1}, ${y} ` +
          `L ${x + 1}, ${y + 1} ` +
          `L ${x}, ${y + 1} ` +
          `z `;
      }

      self.postMessage({
        type: WORKER_EVENT_MAP.PATH_PROGRESS,
        progress: ((y + 1) * width) / pixelsAmount,
      });

      if (!d) continue;

      pathString += `${d}\n`;
    }

    return pathString;
  }
};
