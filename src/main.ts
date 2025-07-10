import "./style.css";
import { WORKER_EVENT_MAP } from "./constants";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const image = new Image();

const formElement = document.querySelector("#form");

const canvasElement = document.querySelector("#canvas");
const context = canvasElement.getContext("2d");

const resizeProgressElement = document.querySelector("#resizeProgress");
const ditherProgressElement = document.querySelector("#ditherProgress");
const imageProgressElement = document.querySelector("#imageProgress");

const downloadElement = document.querySelector("#download");

downloadElement.addEventListener("click", () => {
  const dataURL = canvasElement.toDataURL("image/png");
  const link = document.createElement("a");

  link.href = dataURL;
  link.download = "dithering.png";
  link.click();
});

formElement.addEventListener("submit", (event) => {
  event.preventDefault();

  resizeProgressElement.value = 0;
  ditherProgressElement.value = 0;
  imageProgressElement.value = 0;

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

  if (type === WORKER_EVENT_MAP.IMAGE_PROGRESS) {
    const { progress } = event.data;
    imageProgressElement.value = Math.round(progress * 100);
  }

  if (type === WORKER_EVENT_MAP.IMAGE_DATA) {
    const { imageData } = event.data;

    canvasElement.width = imageData.width;
    canvasElement.height = imageData.height;

    context.putImageData(imageData, 0, 0);
  }
});
