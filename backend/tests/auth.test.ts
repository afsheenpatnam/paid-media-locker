import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("auth", () => {
  it("registers a new user with a seeded wallet balance", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.walletBalance).toBe(100);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send({
      email: "bob@example.com",
      password: "Password123",
      displayName: "Bob",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "bob@example.com",
      password: "AnotherPass1",
      displayName: "Bob Two",
    });

    expect(res.status).toBe(409);
  });

  it("rejects registration with a weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "weak@example.com",
      password: "short",
      displayName: "Weak",
    });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      email: "carol@example.com",
      password: "Password123",
      displayName: "Carol",
    });

    const good = await request(app)
      .post("/api/auth/login")
      .send({ email: "carol@example.com", password: "Password123" });
    expect(good.status).toBe(200);
    expect(good.body.token).toEqual(expect.any(String));

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "carol@example.com", password: "WrongPassword" });
    expect(bad.status).toBe(401);
  });

  it("rejects /api/me without a token and accepts with one", async () => {
    const noAuth = await request(app).get("/api/me");
    expect(noAuth.status).toBe(401);

    const reg = await request(app).post("/api/auth/register").send({
      email: "dave@example.com",
      password: "Password123",
      displayName: "Dave",
    });

    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${reg.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("dave@example.com");
  });
});
