import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertScheduleSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/students", async (_req, res) => {
    const students = await storage.getStudents();
    res.json(students);
  });

  app.get("/api/students/:id", async (req, res) => {
    const student = await storage.getStudent(parseInt(req.params.id));
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.post("/api/students", async (req, res) => {
    const parsed = insertStudentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const student = await storage.createStudent(parsed.data);
    res.status(201).json(student);
  });

  app.post("/api/students/bulk", async (req, res) => {
    const items = z.array(insertStudentSchema).safeParse(req.body);
    if (!items.success) return res.status(400).json({ message: items.error.message });
    const results = { created: 0, errors: [] as string[] };
    for (let i = 0; i < items.data.length; i++) {
      try {
        await storage.createStudent(items.data[i]);
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }
    res.json(results);
  });

  app.patch("/api/students/:id", async (req, res) => {
    const parsed = insertStudentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const student = await storage.updateStudent(parseInt(req.params.id), parsed.data);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.delete("/api/students/:id", async (req, res) => {
    await storage.deleteStudent(parseInt(req.params.id));
    res.status(204).end();
  });

  app.get("/api/schedules", async (_req, res) => {
    const schedules = await storage.getSchedules();
    res.json(schedules);
  });

  app.post("/api/schedules", async (req, res) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const schedule = await storage.createSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  app.post("/api/schedules/bulk", async (req, res) => {
    const items = z.array(insertScheduleSchema).safeParse(req.body);
    if (!items.success) return res.status(400).json({ message: items.error.message });
    const results = { created: 0, errors: [] as string[] };
    for (let i = 0; i < items.data.length; i++) {
      try {
        await storage.createSchedule(items.data[i]);
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }
    res.json(results);
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    await storage.deleteSchedule(parseInt(req.params.id));
    res.status(204).end();
  });

  app.get("/api/payments", async (_req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const payment = await storage.createPayment(parsed.data);
    res.status(201).json(payment);
  });

  app.post("/api/payments/bulk", async (req, res) => {
    const items = z.array(insertPaymentSchema).safeParse(req.body);
    if (!items.success) return res.status(400).json({ message: items.error.message });
    const results = { created: 0, errors: [] as string[] };
    for (let i = 0; i < items.data.length; i++) {
      try {
        await storage.createPayment(items.data[i]);
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }
    res.json(results);
  });

  return httpServer;
}
