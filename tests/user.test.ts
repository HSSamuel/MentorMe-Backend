import request from "supertest";
import express from "express";
import userRoutes from "../routes/user.routes";

const app = express();
app.use(express.json());
app.use("/users", userRoutes);

describe("User Routes", () => {
  it("should get all mentors", async () => {
    const res = await request(app).get("/users/mentors");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get all available skills", async () => {
    const res = await request(app).get("/users/skills");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
