import {
  type Student, type InsertStudent,
  type Schedule, type InsertSchedule,
  type Payment, type InsertPayment,
  students, schedules, payments,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: InsertStudent): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<void>;
  getSchedules(): Promise<Schedule[]>;
  getSchedulesByStudent(studentId: number): Promise<Schedule[]>;
  createSchedule(data: InsertSchedule): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
  getPayments(): Promise<Payment[]>;
  getPaymentsByStudent(studentId: number): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  async getStudents(): Promise<Student[]> {
    return db.select().from(students);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async updateStudent(id: number, data: InsertStudent): Promise<Student | undefined> {
    const [student] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return student;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async getSchedules(): Promise<Schedule[]> {
    return db.select().from(schedules);
  }

  async getSchedulesByStudent(studentId: number): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.studentId, studentId));
  }

  async createSchedule(data: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schedules).values(data).returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }

  async getPaymentsByStudent(studentId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.studentId, studentId));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }
}

export const storage = new DatabaseStorage();
