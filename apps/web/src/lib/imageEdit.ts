/** 23/11 #58: tarayıcıda resmi döndürme ve kırpma (sonuç yeni dosya olarak eskisinin yerine yüklenir). */
function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Resim yüklenemedi."));
    image.src = url;
  });
}

function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(new File([blob], name, { type: "image/jpeg" })) : reject(new Error("Resim kaydedilemedi."))), "image/jpeg", 0.92);
  });
}

export async function rotateImageRight(url: string) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tarayıcı resim düzenlemeyi desteklemiyor.");
  context.translate(canvas.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(image, 0, 0);
  return canvasToFile(canvas, "rotated.jpg");
}

/** crop: 0–1 aralığında oransal seçim (x, y, genişlik, yükseklik). */
export async function cropImage(url: string, crop: { x: number; y: number; width: number; height: number }) {
  const image = await loadImage(url);
  const sx = Math.round(crop.x * image.naturalWidth);
  const sy = Math.round(crop.y * image.naturalHeight);
  const sw = Math.max(1, Math.round(crop.width * image.naturalWidth));
  const sh = Math.max(1, Math.round(crop.height * image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tarayıcı resim düzenlemeyi desteklemiyor.");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToFile(canvas, "cropped.jpg");
}
