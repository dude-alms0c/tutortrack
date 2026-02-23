import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, CreditCard, TrendingUp, Clock } from "lucide-react";
import { formatQAR, formatINREquivalent } from "@/lib/currency";
import type { Student, Schedule, Payment } from "@shared/schema";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getTodayName() {
  return DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

export default function Dashboard() {
  const { data: students, isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });
  const { data: schedules, isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });
  const { data: payments, isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const loading = loadingStudents || loadingSchedules || loadingPayments;
  const activeStudents = students?.filter((s) => s.status === "active") || [];
  const todaySchedules = schedules?.filter((s) => s.dayOfWeek === getTodayName()) || [];
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear();
  const monthPayments = payments?.filter(
    (p) => p.month === currentMonth && p.year === currentYear
  ) || [];
  const totalCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = activeStudents.reduce((sum, s) => sum + s.monthlyFee, 0);

  const paidStudentIds = new Set(monthPayments.map((p) => p.studentId));
  const pendingStudents = activeStudents.filter((s) => !paidStudentIds.has(s.id));

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your tuition management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card data-testid="card-total-students">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStudents.length}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-today-classes">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Classes</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySchedules.length}</div>
                <p className="text-xs text-muted-foreground">{getTodayName()}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-collected">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Collected ({currentMonth})</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatQAR(totalCollected)}</div>
                <p className="text-xs text-muted-foreground">
                  of {formatQAR(totalExpected)} expected
                </p>
                <p className="text-xs text-muted-foreground">{formatINREquivalent(totalCollected)}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Fees</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingStudents.length}</div>
                <p className="text-xs text-muted-foreground">students this month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-today-schedule">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : todaySchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((schedule) => {
                    const student = students?.find((s) => s.id === schedule.studentId);
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3"
                        data-testid={`schedule-item-${schedule.id}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{student?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{schedule.subject}</p>
                        </div>
                        <Badge variant="secondary">
                          {schedule.startTime} - {schedule.endTime}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending-fees">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pending Fees - {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : pendingStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All fees collected for this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3"
                    data-testid={`pending-student-${student.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.subject}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{formatQAR(student.monthlyFee)}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatINREquivalent(student.monthlyFee)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
