let ditherStart;
let ditherEnd;

let drawStart;
let drawEnd;

const image = new Image();
const canvas = new OffscreenCanvas(0, 0);
const context = canvas.getContext("2d");

const formElement = document.querySelector("#form");
const svgElement = document.querySelector("#svg");
const backgroundElement = document.querySelector("#background");
const foregroundElement = document.querySelector("#foreground");

formElement.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const maxLength = Number(formData.get("maxLength"));
  const inputFile = formData.get("input");
  const imageSource = URL.createObjectURL(inputFile);

  image.onload = () => {
    ditherStart = performance.now();

    const resizedPixels = getResizedPixels(image, maxLength);
    const ditheredPixels = getDitheredPixels(resizedPixels);

    ditherEnd = performance.now();
    console.log(`Dithering took ${ditherEnd - ditherStart} ms`);

    drawStart = performance.now();

    const width = ditheredPixels.length;
    const height = ditheredPixels[0].length;

    foregroundElement.innerHTML = "";
    svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgElement.setAttribute("width", width);
    svgElement.setAttribute("height", height);

    for (let y = 0; y < height; y++) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      let d = "";

      path.setAttribute("fill", "white");
      path.setAttribute("stroke", "none");

      for (let x = 0; x < width; x++) {
        const [r, g, b] = ditheredPixels[x][y];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (luminance < 255 * (1 / 2)) continue;

        d +=
          `M ${x}, ${y} ` +
          `L ${x + 1}, ${y} ` +
          `L ${x + 1}, ${y + 1} ` +
          `L ${x}, ${y + 1} ` +
          `z `;
      }

      if (!d) continue;

      path.setAttribute("d", d);
      foregroundElement.append(path);
    }

    drawEnd = performance.now();
    console.log(`Drawing took ${drawEnd - drawStart} ms`);
  };

  image.src = imageSource;
});

function getResizedPixels(image, maxLength = 512) {
  let width = 0;
  let height = 0;

  if (image.width > image.height) {
    width = Math.min(maxLength, image.width);
    height = Math.floor(image.height * (width / image.width));
  } else {
    height = Math.min(maxLength, image.height);
    width = Math.floor(image.width * (height / image.height));
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

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
  }

  return result;
}

function getDitheredPixels(pixels) {
  let result = Array.from(pixels);

  const width = result.length;
  const height = result[0].length;

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
  }

  return result;
}
