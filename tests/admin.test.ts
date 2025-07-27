import request from "supertest";
import express from "express";
import adminRoutes from "../routes/admin.routes";

const app = express();
app.use(express.json());
app.use("/admin", adminRoutes);

describe("Admin Routes", () => {
  it("should get admin stats", async () => {
    const res = await request(app).get("/admin/stats");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("totalUsers");
    expect(res.body).toHaveProperty("totalMatches");
    expect(res.body).toHaveProperty("totalSessions");
  });

  it("should assign a mentor to a mentee", async () => {
    const res = await request(app)
      .post("/admin/assign")
      .send({ menteeId: "mentee123", mentorId: "mentor456" });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("status", "ACCEPTED");
  });
});
