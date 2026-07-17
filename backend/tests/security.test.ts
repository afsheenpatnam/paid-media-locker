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

async function uploadMedia(token: string, price: number) {
  const image = await makeTestImage();
  const res = await request(app)
    .post("/api/media")
    .set("Authorization", `Bearer ${token}`)
    .field("title", "Secure Media")
    .field("unlockPrice", String(price))
    .attach("image", image, "test.jpg");
  return res.body.media.id as string;
}

describe("original file access control", () => {
  it("denies original access to a user who has not unlocked the media", async () => {
    const owner = await registerAndLogin("secOwner1@example.com");
    const stranger = await registerAndLogin("secStranger1@example.com");
    const mediaId = await uploadMedia(owner.token, 50);

    const res = await request(app)
      .get(`/api/media/${mediaId}/original`)
      .query({ token: "not-a-real-token" })
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(res.status).toBe(400);
  });

  it("does not expose an originalUrl in details when locked", async () => {
    const owner = await registerAndLogin("secOwner2@example.com");
    const stranger = await registerAndLogin("secStranger2@example.com");
    const mediaId = await uploadMedia(owner.token, 50);

    const details = await request(app)
      .get(`/api/media/${mediaId}`)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(details.body.media.locked).toBe(true);
    expect(details.body.originalUrl).toBeUndefined();
  });

  it("issues a working signed originalUrl only after unlock, and rejects it for a different user", async () => {
    const owner = await registerAndLogin("secOwner3@example.com");
    const buyer = await registerAndLogin("secBuyer3@example.com");
    const stranger = await registerAndLogin("secStranger3@example.com");
    const mediaId = await uploadMedia(owner.token, 20);

    await request(app).post(`/api/media/${mediaId}/unlock`).set("Authorization", `Bearer ${buyer.token}`);

    const details = await request(app)
      .get(`/api/media/${mediaId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(details.body.media.locked).toBe(false);
    const originalUrl: string = details.body.originalUrl;
    expect(originalUrl).toContain("token=");

    const path = originalUrl.replace("/api", "");

    // Token was minted for the buyer specifically -- another user (even the
    // owner) presenting that same token is rejected, since tokens are bound
    // to a single (mediaId, userId) pair, not just the media.
    const asStranger = await request(app).get(`/api${path}`).set("Authorization", `Bearer ${stranger.token}`);
    expect(asStranger.status).toBe(400);

    const asOwnerWithBuyersToken = await request(app)
      .get(`/api${path}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(asOwnerWithBuyersToken.status).toBe(400);

    // The owner mints their own token via GET details and it works for them.
    const ownerDetails = await request(app)
      .get(`/api/media/${mediaId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    const ownerOriginalUrl: string = ownerDetails.body.originalUrl;
    const ownerPath = ownerOriginalUrl.replace("/api", "");
    const asOwner = await request(app).get(`/api${ownerPath}`).set("Authorization", `Bearer ${owner.token}`);
    expect(asOwner.status).toBe(200);

    const asBuyer = await request(app).get(`/api${path}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(asBuyer.status).toBe(200);
    expect(asBuyer.headers["content-type"]).toContain("image/jpeg");
  });

  it("rejects original access with no Authorization header at all", async () => {
    const owner = await registerAndLogin("secOwner4@example.com");
    const mediaId = await uploadMedia(owner.token, 20);

    const res = await request(app).get(`/api/media/${mediaId}/original`).query({ token: "irrelevant" });
    expect(res.status).toBe(401);
  });
});
