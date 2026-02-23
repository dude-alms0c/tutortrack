import { db } from "./db";
import { students, schedules, payments } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(students);
  if (Number(existing[0].count) > 0) return;

  const insertedStudents = await db.insert(students).values([
    { name: "Aarav Sharma", phone: "9876543210", email: "aarav@example.com", grade: "10th", subject: "Mathematics", monthlyFee: 2500, status: "active" },
    { name: "Priya Patel", phone: "9876543211", email: "priya@example.com", grade: "12th", subject: "Physics", monthlyFee: 3000, status: "active" },
    { name: "Rohan Gupta", phone: "9876543212", grade: "8th", subject: "Science", monthlyFee: 2000, status: "active" },
    { name: "Ananya Iyer", phone: "9876543213", email: "ananya@example.com", grade: "9th", subject: "Chemistry", monthlyFee: 2500, status: "active" },
    { name: "Vikram Singh", phone: "9876543214", grade: "11th", subject: "Mathematics", monthlyFee: 3000, status: "inactive" },
  ]).returning();

  await db.insert(schedules).values([
    { studentId: insertedStudents[0].id, dayOfWeek: "Monday", startTime: "16:00", endTime: "17:00", subject: "Mathematics" },
    { studentId: insertedStudents[0].id, dayOfWeek: "Wednesday", startTime: "16:00", endTime: "17:00", subject: "Mathematics" },
    { studentId: insertedStudents[1].id, dayOfWeek: "Monday", startTime: "17:30", endTime: "18:30", subject: "Physics" },
    { studentId: insertedStudents[1].id, dayOfWeek: "Thursday", startTime: "17:30", endTime: "18:30", subject: "Physics" },
    { studentId: insertedStudents[2].id, dayOfWeek: "Tuesday", startTime: "15:00", endTime: "16:00", subject: "Science" },
    { studentId: insertedStudents[2].id, dayOfWeek: "Friday", startTime: "15:00", endTime: "16:00", subject: "Science" },
    { studentId: insertedStudents[3].id, dayOfWeek: "Wednesday", startTime: "17:30", endTime: "18:30", subject: "Chemistry" },
    { studentId: insertedStudents[3].id, dayOfWeek: "Saturday", startTime: "10:00", endTime: "11:00", subject: "Chemistry" },
  ]);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  await db.insert(payments).values([
    { studentId: insertedStudents[0].id, amount: 2500, month: currentMonth, year: currentYear, paidDate: today, method: "upi", notes: "Paid on time" },
    { studentId: insertedStudents[1].id, amount: 3000, month: currentMonth, year: currentYear, paidDate: today, method: "cash" },
  ]);

  console.log("Database seeded successfully");
}
