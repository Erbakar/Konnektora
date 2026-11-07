import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { NotFoundException } from "@nestjs/common";
import { configureMediaDatabase, durableStorage, removeDurableUpload } from "./durable-storage";
import { MediaStorageController } from "./media-storage.controller";

describe("Durable media", () => {
  const storedUpload = { create: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() };
  let directory: string;
  beforeEach(async () => {
    jest.resetAllMocks();
    storedUpload.create.mockResolvedValue({});
    storedUpload.deleteMany.mockResolvedValue({ count: 1 });
    directory = await mkdtemp(join(tmpdir(), "konnektora-media-"));
    configureMediaDatabase({ storedUpload } as never);
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  const upload = (storage: ReturnType<typeof durableStorage>) => new Promise<Express.Multer.File>((resolve, reject) => storage._handleFile({} as never, { stream: Readable.from(Buffer.from([0, 255, 42])), mimetype: "image/png" } as never, (error, result) => error ? reject(error) : resolve(result as Express.Multer.File)));
  const storage = () => durableStorage({ destination: directory, filename: (_request, _file, cb) => cb(null, "opaque-id.png") });
  const response = () => { const res = { setHeader: jest.fn(), status: jest.fn(), send: jest.fn(), end: jest.fn() }; res.status.mockReturnValue(res); return res; };

  it("persists exact binary data before success and serves it after local files are lost", async () => {
    const file = await upload(storage());
    expect(storedUpload.create).toHaveBeenCalledWith({ data: { filename: "opaque-id.png", mimeType: "image/png", bytes: Buffer.from([0, 255, 42]) } });
    await rm(directory, { recursive: true });
    storedUpload.findUnique.mockResolvedValue(storedUpload.create.mock.calls[0][0].data);
    const res = response();
    await new MediaStorageController({ storedUpload } as never).read(file.filename, undefined, res as never);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([0, 255, 42]));
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
  });
  it("rejects database failures and removes the temporary file", async () => {
    storedUpload.create.mockRejectedValue(new Error("Database unavailable"));
    await expect(upload(storage())).rejects.toThrow("Database unavailable");
    await expect(readFile(join(directory, "opaque-id.png"))).rejects.toThrow();
  });
  it("removes durable bytes when content is removed even if the temporary file is gone", async () => {
    await removeDurableUpload(join(directory, "opaque-id.png"));
    expect(storedUpload.deleteMany).toHaveBeenCalledWith({ where: { filename: "opaque-id.png" } });
  });
  it.each([["bytes=1-2", [255, 42], "bytes 1-2/3"], ["bytes=-1", [42], "bytes 2-2/3"]])("serves video-compatible partial reads %s", async (range, expected, contentRange) => {
    storedUpload.findUnique.mockResolvedValue({ bytes: Buffer.from([0, 255, 42]), mimeType: "video/mp4" });
    const res = response();
    await new MediaStorageController({ storedUpload } as never).read("opaque-id.mp4", range, res as never);
    expect(res.status).toHaveBeenCalledWith(206);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Range", contentRange);
    expect(res.send).toHaveBeenCalledWith(Buffer.from(expected));
  });
  it("rejects out-of-bounds ranges and traversal paths", async () => {
    storedUpload.findUnique.mockResolvedValue({ bytes: Buffer.from([0]), mimeType: "image/png" });
    const controller = new MediaStorageController({ storedUpload } as never);
    const res = response();
    await controller.read("opaque-id.png", "bytes=9-10", res as never);
    expect(res.status).toHaveBeenCalledWith(416);
    await expect(controller.read("../secret.txt", undefined, res as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});
