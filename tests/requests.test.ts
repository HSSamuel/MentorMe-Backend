import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import requestRoutes from "../routes/request.routes";

// Mock the authentication and role-based middleware
jest.mock("../middleware/auth.middleware", () => ({
  authMiddleware: (req: Request, res: Response, next: NextFunction) => {
    // Attach a mock user to the request
    req.user = { userId: "testUserId", role: "MENTEE", email: "test@test.com" };
    next();
  },
  menteeMiddleware: (req: Request, res: Response, next: NextFunction) => next(),
  mentorMiddleware: (req: Request, res: Response, next: NextFunction) => next(),
}));

// Mock the Prisma client
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockFindFirst = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    mentorshipRequest: {
      create: (args: any) => mockCreate(args),
      findMany: (args: any) => mockFindMany(args),
      update: (args: any) => mockUpdate(args),
      findFirst: (args: any) => mockFindFirst(args),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
    conversation: {
      create: jest.fn().mockResolvedValue({}),
    },
  })),
  RequestStatus: {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
  },
}));

const app = express();
app.use(express.json());
app.use("/requests", requestRoutes);

describe("Request Routes", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("POST / - should create a new mentorship request", async () => {
    const requestData = { mentorId: "mentor123" };
    const mockMenteeProfile = { profile: { name: "Test Mentee" } };
    mockCreate.mockResolvedValue({ ...requestData, mentee: mockMenteeProfile });

    const res = await request(app).post("/requests").send(requestData);

    expect(res.statusCode).toEqual(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          menteeId: "testUserId",
          mentorId: "mentor123",
          status: "PENDING",
        },
      })
    );
  });

  it("GET /sent - should retrieve sent requests for a mentee", async () => {
    const mockRequests = [
      { id: "req1", mentor: { profile: { name: "Mentor A" } } },
    ];
    mockFindMany.mockResolvedValue(mockRequests);

    const res = await request(app).get("/requests/sent");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockRequests);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { menteeId: "testUserId" },
      })
    );
  });
});
