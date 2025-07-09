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

  const { pathString, width, height } = event.data;

  svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svgElement.setAttribute("width", width);
  svgElement.setAttribute("height", height);

  foregroundElement.innerHTML = "";

  insertInChunks(pathString);

  drawEnd = performance.now();
  console.log(`Drawing took ${drawEnd - drawStart} ms`);
});

function insertInChunks(pathsString) {
  const paths = pathsString.split("\n").filter((path) => path.trim() !== "");

  function insertNextChunk() {
    const chunk = paths.splice(0, 10);
    const fragment = document.createDocumentFragment();

    chunk.forEach((path) => {
      const pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      pathElement.setAttribute("d", path);
      pathElement.setAttribute("fill", "white");
      pathElement.setAttribute("stroke", "none");

      fragment.appendChild(pathElement);
    });

    foregroundElement.appendChild(fragment);

    if (paths.length <= 0) return;

    requestAnimationFrame(insertNextChunk);
  }

  requestAnimationFrame(insertNextChunk);
}
