import request from "supertest";
import express from "express";
import authRoutes from "../routes/auth.routes";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Routes", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
      role: "MENTEE",
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("email", "test@example.com");
  });

  it("should login an existing user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });
});
