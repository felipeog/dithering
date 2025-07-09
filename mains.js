import { MAIN_EVENT_MAP, WORKER_EVENT_MAP } from "./constants.js";

const worker = new Worker("./worker.js", { type: "module" });

const image = new Image();

const formElement = document.querySelector("#form");

const svgElement = document.querySelector("#svg");
const backgroundElement = document.querySelector("#background");
const foregroundElement = document.querySelector("#foreground");

const resizeProgressElement = document.querySelector("#resizeProgress");
const ditherProgressElement = document.querySelector("#ditherProgress");
const pathProgressElement = document.querySelector("#pathProgress");
const renderProgressElement = document.querySelector("#renderProgress");

formElement.addEventListener("submit", (event) => {
  event.preventDefault();

  resizeProgressElement.value = 0;
  ditherProgressElement.value = 0;
  pathProgressElement.value = 0;
  renderProgressElement.value = 0;

  const formData = new FormData(event.target);
  const maxLength = Number(formData.get("maxLength"));
  const inputFile = formData.get("input");
  const imageSource = URL.createObjectURL(inputFile);

  image.onload = async () => {
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
  const { type } = event.data;

  if (type === WORKER_EVENT_MAP.RESIZE_PROGRESS) {
    const { progress } = event.data;
    resizeProgressElement.value = Math.round(progress * 100);
  }

  if (type === WORKER_EVENT_MAP.DITHER_PROGRESS) {
    const { progress } = event.data;
    ditherProgressElement.value = Math.round(progress * 100);
  }

  if (type === WORKER_EVENT_MAP.PATH_PROGRESS) {
    const { progress } = event.data;
    pathProgressElement.value = Math.round(progress * 100);
  }

  if (type === WORKER_EVENT_MAP.PATH_STRING) {
    const { pathString, width, height } = event.data;

    svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgElement.setAttribute("width", width);
    svgElement.setAttribute("height", height);

    foregroundElement.innerHTML = "";

    insertInChunks(pathString);
  }
});

function insertInChunks(pathsString) {
  const paths = pathsString.split("\n").filter((path) => path.trim() !== "");
  const initialLength = paths.length;

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
    renderProgressElement.value = Math.round(
      (1 - paths.length / initialLength) * 100
    );

    if (paths.length <= 0) return;

    requestAnimationFrame(insertNextChunk);
  }

  requestAnimationFrame(insertNextChunk);
}
