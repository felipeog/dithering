const worker = new Worker("./worker.js");

let ditherStart;
let ditherEnd;

let drawStart;
let drawEnd;

const image = new Image();

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

  image.onload = async () => {
    ditherStart = performance.now();

    const canvasElement = document.createElement("canvas");
    const offscreenCanvas = canvasElement.transferControlToOffscreen();
    const bitmap = await createImageBitmap(image);

    worker.postMessage(
      {
        offscreenCanvas,
        bitmap,
        maxLength,
      },
      [offscreenCanvas]
    );
  };

  image.src = imageSource;
});

worker.addEventListener("message", (event) => {
  // console.log("main", event);

  ditherEnd = performance.now();
  console.log(`Dither took ${ditherEnd - ditherStart} ms`);

  drawStart = performance.now();

  const ditheredPixels = event.data;

  const width = ditheredPixels.length;
  const height = ditheredPixels[0].length;

  foregroundElement.innerHTML = "";
  svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svgElement.setAttribute("width", width);
  svgElement.setAttribute("height", height);

  for (let y = 0; y < height; y++) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
});
