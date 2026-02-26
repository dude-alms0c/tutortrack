import {
  type Student, type InsertStudent,
  type Schedule, type InsertSchedule,
  type Payment, type InsertPayment,
  type StudentFee, type InsertStudentFee,
  students, schedules, payments, studentFees,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface BackupData {
  version: string;
  exportedAt: string;
  students: Student[];
  schedules: Schedule[];
  payments: Payment[];
  studentFees?: StudentFee[];
}

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
  updatePayment(id: number, data: InsertPayment): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;
  getStudentFees(): Promise<StudentFee[]>;
  getStudentFeesByStudent(studentId: number): Promise<StudentFee[]>;
  getStudentFee(studentId: number, month: string, year: number): Promise<StudentFee | undefined>;
  setStudentFee(data: InsertStudentFee): Promise<StudentFee>;
  deleteStudentFee(id: number): Promise<void>;
  exportBackup(): Promise<BackupData>;
  restoreBackup(data: BackupData): Promise<{ students: number; schedules: number; payments: number; studentFees: number; skipped: number }>;
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
    await db.delete(studentFees).where(eq(studentFees.studentId, id));
    await db.delete(payments).where(eq(payments.studentId, id));
    await db.delete(schedules).where(eq(schedules.studentId, id));
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

  async updatePayment(id: number, data: InsertPayment): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment;
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async getStudentFees(): Promise<StudentFee[]> {
    return db.select().from(studentFees);
  }

  async getStudentFeesByStudent(studentId: number): Promise<StudentFee[]> {
    return db.select().from(studentFees).where(eq(studentFees.studentId, studentId));
  }

  async getStudentFee(studentId: number, month: string, year: number): Promise<StudentFee | undefined> {
    const [fee] = await db.select().from(studentFees).where(
      and(
        eq(studentFees.studentId, studentId),
        eq(studentFees.month, month),
        eq(studentFees.year, year)
      )
    );
    return fee;
  }

  async setStudentFee(data: InsertStudentFee): Promise<StudentFee> {
    const existing = await this.getStudentFee(data.studentId, data.month, data.year);
    if (existing) {
      const [updated] = await db.update(studentFees).set({ amount: data.amount }).where(eq(studentFees.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(studentFees).values(data).returning();
    return created;
  }

  async deleteStudentFee(id: number): Promise<void> {
    await db.delete(studentFees).where(eq(studentFees.id, id));
  }

  async exportBackup(): Promise<BackupData> {
    const allStudents = await db.select().from(students);
    const allSchedules = await db.select().from(schedules);
    const allPayments = await db.select().from(payments);
    const allStudentFees = await db.select().from(studentFees);
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      students: allStudents,
      schedules: allSchedules,
      payments: allPayments,
      studentFees: allStudentFees,
    };
  }

  async restoreBackup(data: BackupData): Promise<{ students: number; schedules: number; payments: number; studentFees: number; skipped: number }> {
    const pool = (db as any)._.client || (db as any).session?.client;

    let studentCount = 0;
    let scheduleCount = 0;
    let paymentCount = 0;
    let studentFeeCount = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
      await tx.delete(studentFees);
      await tx.delete(payments);
      await tx.delete(schedules);
      await tx.delete(students);

      const idMap = new Map<number, number>();

      for (const s of data.students) {
        const oldId = s.id;
        const [created] = await tx.insert(students).values({
          name: s.name,
          phone: s.phone,
          email: s.email ?? null,
          grade: s.grade ?? null,
          subject: s.subject,
          monthlyFee: s.monthlyFee,
          status: s.status || "active",
          familyName: s.familyName ?? null,
        }).returning();
        idMap.set(oldId, created.id);
        studentCount++;
      }

      for (const s of data.schedules) {
        const newStudentId = idMap.get(s.studentId);
        if (!newStudentId) { skipped++; continue; }
        await tx.insert(schedules).values({
          studentId: newStudentId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
        });
        scheduleCount++;
      }

      for (const p of data.payments) {
        const newStudentId = idMap.get(p.studentId);
        if (!newStudentId) { skipped++; continue; }
        await tx.insert(payments).values({
          studentId: newStudentId,
          amount: p.amount,
          month: p.month,
          year: p.year,
          paidDate: p.paidDate,
          method: p.method || "cash",
          notes: p.notes ?? null,
        });
        paymentCount++;
      }

      if (data.studentFees) {
        for (const f of data.studentFees) {
          const newStudentId = idMap.get(f.studentId);
          if (!newStudentId) { skipped++; continue; }
          await tx.insert(studentFees).values({
            studentId: newStudentId,
            month: f.month,
            year: f.year,
            amount: f.amount,
          });
          studentFeeCount++;
        }
      }
    });

    return { students: studentCount, schedules: scheduleCount, payments: paymentCount, studentFees: studentFeeCount, skipped };
  }
}

export const storage = new DatabaseStorage();
