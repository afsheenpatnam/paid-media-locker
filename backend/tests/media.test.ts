import request from "supertest";
import { createApp } from "../src/app";
import { makeTestImage } from "./helpers";

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password: "Password123",
    displayName: email.split("@")[0],
  });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

describe("media upload + feed", () => {
  it("rejects upload without auth", async () => {
    const image = await makeTestImage();
    const res = await request(app)
      .post("/api/media")
      .field("title", "No Auth")
      .field("unlockPrice", "10")
      .attach("image", image, "test.jpg");
    expect(res.status).toBe(401);
  });

  it("rejects upload with a non-image file", async () => {
    const { token } = await registerAndLogin("uploader1@example.com");
    const res = await request(app)
      .post("/api/media")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Bad File")
      .field("unlockPrice", "10")
      .attach("image", Buffer.from("not an image"), { filename: "test.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  it("uploads an image and shows it in the feed as locked for other users", async () => {
    const owner = await registerAndLogin("owner1@example.com");
    const viewer = await registerAndLogin("viewer1@example.com");

    const image = await makeTestImage();
    const upload = await request(app)
      .post("/api/media")
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Cool Photo")
      .field("unlockPrice", "30")
      .attach("image", image, "test.jpg");

    expect(upload.status).toBe(201);
    const mediaId = upload.body.media.id;

    const ownerFeed = await request(app).get("/api/media").set("Authorization", `Bearer ${owner.token}`);
    const ownerItem = ownerFeed.body.items.find((i: { id: string }) => i.id === mediaId);
    expect(ownerItem.locked).toBe(false);

    const viewerFeed = await request(app).get("/api/media").set("Authorization", `Bearer ${viewer.token}`);
    const viewerItem = viewerFeed.body.items.find((i: { id: string }) => i.id === mediaId);
    expect(viewerItem.locked).toBe(true);
    expect(viewerItem.unlockPrice).toBe(30);
  });

  it("always allows fetching the preview, regardless of lock state", async () => {
    const owner = await registerAndLogin("owner2@example.com");
    const viewer = await registerAndLogin("viewer2@example.com");

    const image = await makeTestImage();
    const upload = await request(app)
      .post("/api/media")
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Preview Test")
      .field("unlockPrice", "10")
      .attach("image", image, "test.jpg");
    const mediaId = upload.body.media.id;

    const preview = await request(app)
      .get(`/api/media/${mediaId}/preview`)
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(preview.status).toBe(200);
    expect(preview.headers["content-type"]).toContain("image/jpeg");
  });
});
