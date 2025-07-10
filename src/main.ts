import "./style.css";
import { WORKER_EVENT_MAP } from "./constants";
import { TWorkerData } from "./types";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

const image = new Image();

const formElement = document.querySelector("#form") as HTMLFormElement;

const canvasElement = document.querySelector("#canvas") as HTMLCanvasElement;
const context = canvasElement.getContext("2d") as CanvasRenderingContext2D;

const resizeProgressElement = document.querySelector(
  "#resizeProgress"
) as HTMLProgressElement;
const ditherProgressElement = document.querySelector(
  "#ditherProgress"
) as HTMLProgressElement;
const imageProgressElement = document.querySelector(
  "#imageProgress"
) as HTMLProgressElement;

const downloadElement = document.querySelector(
  "#download"
) as HTMLButtonElement;

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

  const formData = new FormData(event.target as HTMLFormElement);
  const maxLength = Number(formData.get("maxLength"));
  const inputFile = formData.get("input") as Blob;
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
      } satisfies TWorkerData,
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
