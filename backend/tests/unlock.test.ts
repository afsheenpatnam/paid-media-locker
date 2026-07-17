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

async function uploadMedia(token: string, price: number, title = "Media") {
  const image = await makeTestImage();
  const res = await request(app)
    .post("/api/media")
    .set("Authorization", `Bearer ${token}`)
    .field("title", title)
    .field("unlockPrice", String(price))
    .attach("image", image, "test.jpg");
  return res.body.media.id as string;
}

describe("unlock flow", () => {
  it("unlocks media, deducts wallet balance, and records a purchase + transaction", async () => {
    const owner = await registerAndLogin("owner3@example.com");
    const buyer = await registerAndLogin("buyer3@example.com");
    const mediaId = await uploadMedia(owner.token, 40);

    const unlock = await request(app)
      .post(`/api/media/${mediaId}/unlock`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(unlock.status).toBe(200);
    expect(unlock.body.walletBalance).toBe(60);

    const wallet = await request(app).get("/api/wallet").set("Authorization", `Bearer ${buyer.token}`);
    expect(wallet.body.balance).toBe(60);

    const txs = await request(app)
      .get("/api/wallet/transactions")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(txs.body.items.some((t: { type: string; amount: number }) => t.type === "DEBIT" && t.amount === 40)).toBe(
      true
    );
  });

  it("rejects a duplicate unlock of the same media", async () => {
    const owner = await registerAndLogin("owner4@example.com");
    const buyer = await registerAndLogin("buyer4@example.com");
    const mediaId = await uploadMedia(owner.token, 20);

    const first = await request(app)
      .post(`/api/media/${mediaId}/unlock`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/media/${mediaId}/unlock`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(second.status).toBe(409);
  });

  it("rejects unlock when wallet balance is insufficient", async () => {
    const owner = await registerAndLogin("owner5@example.com");
    const buyer = await registerAndLogin("buyer5@example.com");
    const mediaId = await uploadMedia(owner.token, 999);

    const res = await request(app)
      .post(`/api/media/${mediaId}/unlock`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(400);

    const wallet = await request(app).get("/api/wallet").set("Authorization", `Bearer ${buyer.token}`);
    expect(wallet.body.balance).toBe(100);
  });

  it("rejects an owner trying to unlock their own media", async () => {
    const owner = await registerAndLogin("owner6@example.com");
    const mediaId = await uploadMedia(owner.token, 10);

    const res = await request(app)
      .post(`/api/media/${mediaId}/unlock`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(400);
  });

  it("404s when unlocking media that does not exist", async () => {
    const buyer = await registerAndLogin("buyer6@example.com");
    const res = await request(app)
      .post("/api/media/00000000-0000-0000-0000-000000000000/unlock")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(404);
  });
});
