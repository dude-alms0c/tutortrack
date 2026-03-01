import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, Calendar, CreditCard, TrendingUp, FileBarChart, CheckCircle, XCircle, Clock, Home } from "lucide-react";
import { formatQAR, formatINREquivalent } from "@/lib/currency";
import type { Student, Schedule, Payment, StudentFee } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

//const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Reports() {
  const { data: students, isLoading: ls } = useQuery<Student[]>({ queryKey: ["/api/students"] });
  const { data: schedules, isLoading: lsc } = useQuery<Schedule[]>({ queryKey: ["/api/schedules"] });
  const { data: payments, isLoading: lp } = useQuery<Payment[]>({ queryKey: ["/api/payments"] });
  const { data: studentFeesData } = useQuery<StudentFee[]>({ queryKey: ["/api/student-fees"] });

  const loading = ls || lsc || lp;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-reports-title">Reports</h1>
        <p className="text-sm text-muted-foreground">Detailed analytics for students, schedules, and payments</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList data-testid="tabs-reports">
            <TabsTrigger value="students" data-testid="tab-students-report">
              <Users className="h-4 w-4 mr-1" /> Students
            </TabsTrigger>
            <TabsTrigger value="schedules" data-testid="tab-schedules-report">
              <Calendar className="h-4 w-4 mr-1" /> Schedules
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments-report">
              <CreditCard className="h-4 w-4 mr-1" /> Payments
            </TabsTrigger>
            <TabsTrigger value="families" data-testid="tab-families-report">
              <Home className="h-4 w-4 mr-1" /> Families
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentReport students={students || []} schedules={schedules || []} payments={payments || []} studentFees={studentFeesData || []} />
          </TabsContent>
          <TabsContent value="schedules">
            <ScheduleReport students={students || []} schedules={schedules || []} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentReport students={students || []} payments={payments || []} studentFees={studentFeesData || []} />
          </TabsContent>
          <TabsContent value="families">
            <FamilyReport students={students || []} payments={payments || []} studentFees={studentFeesData || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function StudentReport({ students, schedules, payments, studentFees }: { students: Student[]; schedules: Schedule[]; payments: Payment[]; studentFees: StudentFee[] }) {
  const active = students.filter(s => s.status === "active").length;
  const inactive = students.filter(s => s.status === "inactive").length;
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear();

  const getEffectiveFee = (studentId: number) => {
    const override = studentFees.find(f => f.studentId === studentId && f.month === currentMonth && f.year === currentYear);
    if (override) return override.amount;
    const student = students.find(s => s.id === studentId);
    return student?.monthlyFee || 0;
  };

  const statusData = [
    { name: "Active", value: active },
    { name: "Inactive", value: inactive },
  ];

  const subjectMap: Record<string, number> = {};
  students.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject] || 0) + 1; });
  const subjectData = Object.entries(subjectMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const gradeMap: Record<string, number> = {};
  students.forEach(s => { if (s.grade) gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1; });
  const gradeData = Object.entries(gradeMap).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));

//  const totalMonthlyRevenue = students.filter(s => s.status === "active").reduce((sum, s) => sum + getEffectiveFee(s.id), 0);
//  const avgFee = active > 0 ? Math.round(totalMonthlyRevenue / active) : 0;

  // Only include active students with fees > 0 in revenue calculations
  const studentsWithFees = students.filter(s => s.status === "active" && getEffectiveFee(s.id) > 0);
  const totalMonthlyRevenue = studentsWithFees.reduce((sum, s) => sum + getEffectiveFee(s.id), 0);
  const avgFee = studentsWithFees.length > 0 ? Math.round(totalMonthlyRevenue / studentsWithFees.length) : 0;

  const monthPayments = payments.filter(p => p.month === currentMonth && p.year === currentYear);
  const paidIds = new Set(monthPayments.map(p => p.studentId));
  
      // Sort students: active first, inactive last
  const sortedStudents = students?.sort((a, b) => {
    if (a.status === b.status) {
      // If same status, sort by name
      return a.name.localeCompare(b.name);
    }
    // Active comes before inactive
    return a.status === "active" ? -1 : 1;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-report-total-students">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
 <p className="text-xs text-muted-foreground">{active} active ({studentsWithFees.length} with fees), {inactive} inactive</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-avg-fee">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQAR(avgFee)}</div>
            <p className="text-xs text-muted-foreground">{formatINREquivalent(avgFee)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-monthly-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Monthly</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQAR(totalMonthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">{formatINREquivalent(totalMonthlyRevenue)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-subjects">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Taught</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjectData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Students by Subject</CardTitle></CardHeader>
          <CardContent>
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Students" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Student Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {gradeData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Students by Grade</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Students" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Student Fee Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{currentMonth} Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map(s => (
                <TableRow key={s.id} data-testid={`report-student-row-${s.id}`}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.subject}</TableCell>
                  <TableCell>{s.grade || "-"}</TableCell>
                  <TableCell>
                    <div>{formatQAR(getEffectiveFee(s.id))}</div>
                    <div className="text-xs text-muted-foreground">{formatINREquivalent(getEffectiveFee(s.id))}</div>
                    {getEffectiveFee(s.id) !== s.monthlyFee && (
                      <div className="text-[10px] text-muted-foreground line-through">{formatQAR(s.monthlyFee)} default</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {paidIds.has(s.id) ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" /> Paid
                      </Badge>
                    ) : s.status === "active" && getEffectiveFee(s.id) > 0 ? (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        <XCircle className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    ): s.status === "active" && getEffectiveFee(s.id) === 0 ? (
                             <Badge variant="outline" className="text-muted-foreground">
                          No Fee
                        </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleReport({ students, schedules }: { students: Student[]; schedules: Schedule[] }) {
  const dayDistribution = DAYS_ORDER.map(day => ({
    name: day.substring(0, 3),
    fullName: day,
    classes: schedules.filter(s => s.dayOfWeek === day).length,
  }));

  const totalClasses = schedules.length;
  const daysWithClasses = dayDistribution.filter(d => d.classes > 0).length;
  const busiestDay = dayDistribution.reduce((max, d) => d.classes > max.classes ? d : max, dayDistribution[0]);

  const studentLoad: Record<number, number> = {};
  schedules.forEach(s => { studentLoad[s.studentId] = (studentLoad[s.studentId] || 0) + 1; });

  const subjectSchedule: Record<string, number> = {};
  schedules.forEach(s => { subjectSchedule[s.subject] = (subjectSchedule[s.subject] || 0) + 1; });
  const subjectScheduleData = Object.entries(subjectSchedule).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const timeSlots: Record<string, number> = {};
  schedules.forEach(s => {
    const hour = parseInt(s.startTime.split(":")[0]);
    const label = hour < 12 ? "Morning (before 12)" : hour < 17 ? "Afternoon (12-5)" : "Evening (after 5)";
    timeSlots[label] = (timeSlots[label] || 0) + 1;
  });
  const timeData = Object.entries(timeSlots).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-report-total-classes">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes/Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-teaching-days">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teaching Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysWithClasses} / 7</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-busiest-day">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Busiest Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{busiestDay?.fullName || "-"}</div>
            <p className="text-xs text-muted-foreground">{busiestDay?.classes || 0} classes</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-subjects-scheduled">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Scheduled</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjectScheduleData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Classes per Day</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(val) => { const d = dayDistribution.find(dd => dd.name === val); return d?.fullName || val; }} />
                <Bar dataKey="classes" name="Classes" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Time Distribution</CardTitle></CardHeader>
          <CardContent>
            {timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={timeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}>
                    {timeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No schedules</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Student Schedule Load</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Classes/Week</TableHead>
                <TableHead>Schedule Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => {
                const studentSchedules = schedules.filter(sc => sc.studentId === s.id);
                if (studentSchedules.length === 0) return null;
                const days = Array.from(new Set(studentSchedules.map(sc => sc.dayOfWeek))).sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
                return (
                  <TableRow key={s.id} data-testid={`report-schedule-row-${s.id}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{studentSchedules.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {days.map(d => (
                          <Badge key={d} variant="outline" className="text-xs">{d.substring(0, 3)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }).filter(Boolean)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentReport({ students, payments, studentFees }: { students: Student[]; payments: Payment[]; studentFees: StudentFee[] }) {
  const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const yearNum = parseInt(selectedYear);

  const years = Array.from(new Set(payments.map(p => p.year))).sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const yearPayments = payments.filter(p => p.year === yearNum);

  const getMonthlyExpected = (month: string, year: number) => {
    const activeStudents = students.filter(s => s.status === "active");
    return activeStudents.reduce((sum, s) => {
      const override = studentFees.find(f => f.studentId === s.id && f.month === month && f.year === year);
//      return sum + (override ? override.amount : s.monthlyFee);
const fee = override ? override.amount : s.monthlyFee;
      return sum + (fee > 0 ? fee : 0);
    }, 0);
  };

  const monthlyData = MONTHS.map(month => {
    const monthPays = yearPayments.filter(p => p.month === month);
    const collected = monthPays.reduce((sum, p) => sum + p.amount, 0);
    const expected = getMonthlyExpected(month, yearNum);
    return { name: month.substring(0, 3), fullName: month, collected, expected, students: monthPays.length };
  });

  const totalCollected = yearPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpectedYear = monthlyData.reduce((sum, m) => sum + m.expected, 0);
  const collectionRate = totalExpectedYear > 0 ? Math.round((totalCollected / totalExpectedYear) * 100) : 0;

  const methodMap: Record<string, number> = {};
  yearPayments.forEach(p => { methodMap[p.method] = (methodMap[p.method] || 0) + 1; });
  const methodData = Object.entries(methodMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const methodAmountMap: Record<string, number> = {};
  yearPayments.forEach(p => { methodAmountMap[p.method] = (methodAmountMap[p.method] || 0) + p.amount; });
  const methodAmountData = Object.entries(methodAmountMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const currentMonthPayments = payments.filter(p => p.month === currentMonth && p.year === currentYear);
  const paidIds = new Set(currentMonthPayments.map(p => p.studentId));
  const activeStudents = students.filter(s => s.status === "active");
//  const paidCount = activeStudents.filter(s => paidIds.has(s.id)).length;
//  const pendingCount = activeStudents.length - paidCount;
  
  // Filter to only those with fees > 0
  const activeStudentsWithFees = activeStudents.filter(s => {
    const fee = studentFees.find(f => f.studentId === s.id && f.month === currentMonth && f.year === currentYear)?.amount || s.monthlyFee;
    return fee > 0;
  });
  
    // Students with zero fees (for display)
  const studentsWithZeroFees = activeStudents.filter(s => {
    const fee = studentFees.find(f => f.studentId === s.id && f.month === currentMonth && f.year === currentYear)?.amount || s.monthlyFee;
    return fee === 0;
  });

  // Count paid among those with fees
  const paidCount = activeStudentsWithFees.filter(s => paidIds.has(s.id)).length;
  const pendingCount = activeStudentsWithFees.length - paidCount;
  const zeroCount = studentsWithZeroFees.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">     
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32" data-testid="select-report-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-report-total-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected ({selectedYear})</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQAR(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">{formatINREquivalent(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-collection-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate}%</div>
            <p className="text-xs text-muted-foreground">of annual expected</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-payments-count">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearPayments.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-current-month">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{currentMonth} Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCount} paid</div>
            <p className="text-xs text-red-500">{pendingCount} pending</p>            
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Collection Trend - {selectedYear}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip
                labelFormatter={(val) => { const m = monthlyData.find(d => d.name === val); return m?.fullName || val; }}
                formatter={(value: number) => formatQAR(value)}
              />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expected" name="Expected" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods (Count)</CardTitle></CardHeader>
          <CardContent>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payments in {selectedYear}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods (Amount)</CardTitle></CardHeader>
          <CardContent>
            {methodAmountData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={methodAmountData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatQAR(value)} />
                  <Bar dataKey="value" name="Amount" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payments in {selectedYear}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment History - {selectedYear}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments in {selectedYear}</TableCell>
                </TableRow>
              ) : (
                yearPayments
                  .sort((a, b) => MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month) || b.paidDate.localeCompare(a.paidDate))
                  .map(p => {
                    const student = students.find(s => s.id === p.studentId);
                    return (
                      <TableRow key={p.id} data-testid={`report-payment-row-${p.id}`}>
                        <TableCell className="font-medium">{student?.name || "Unknown"}</TableCell>
                        <TableCell>{p.month}</TableCell>
                        <TableCell>
                          <div>{formatQAR(p.amount)}</div>
                          <div className="text-xs text-muted-foreground">{formatINREquivalent(p.amount)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.method}</Badge>
                        </TableCell>
                        <TableCell>{p.paidDate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.notes || "-"}</TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FamilyReport({ students, payments, studentFees }: { students: Student[]; payments: Payment[]; studentFees: StudentFee[] }) {
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const yearNum = parseInt(selectedYear);

  const years = Array.from(new Set(payments.map(p => p.year))).sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const familyMap = new Map<string, Student[]>();
  const unassigned: Student[] = [];
  students.forEach(s => {
    if (s.familyName) {
      const existing = familyMap.get(s.familyName) || [];
      existing.push(s);
      familyMap.set(s.familyName, existing);
    } else {
      unassigned.push(s);
    }
  });

  const getEffectiveFee = (studentId: number, month: string, year: number) => {
    const override = studentFees.find(f => f.studentId === studentId && f.month === month && f.year === year);
    if (override) return override.amount;
    const student = students.find(s => s.id === studentId);
    return student?.monthlyFee || 0;
  };

  const familyData = Array.from(familyMap.entries()).map(([familyName, members]) => {
    const activeMembers = members.filter(m => m.status === "active");
    // Only include active members with fees > 0 in expected total
    const activeMembersWithFees = activeMembers.filter(m => getEffectiveFee(m.id, selectedMonth, yearNum) > 0);
//    const totalExpected = activeMembers.reduce((sum, m) => sum + getEffectiveFee(m.id, selectedMonth, yearNum), 0);

    const totalExpected = activeMembersWithFees.reduce((sum, m) => sum + getEffectiveFee(m.id, selectedMonth, yearNum), 0);
    const monthPayments = payments.filter(p => p.month === selectedMonth && p.year === yearNum && members.some(m => m.id === p.studentId));
    const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidMembers = new Set(monthPayments.map(p => p.studentId));
    const allPaid = activeMembers.length > 0 && activeMembers.every(m => paidMembers.has(m.id));
    return { familyName, members, activeMembers, totalExpected, totalPaid, allPaid, paidMembers };
  }).sort((a, b) => a.familyName.localeCompare(b.familyName));

  const totalFamilies = familyData.length;
  const fullPaidFamilies = familyData.filter(f => f.allPaid).length;
  const totalFamilyExpected = familyData.reduce((sum, f) => sum + f.totalExpected, 0);
  const totalFamilyPaid = familyData.reduce((sum, f) => sum + f.totalPaid, 0);

  const familyChartData = familyData.map(f => ({
    name: f.familyName.length > 12 ? f.familyName.substring(0, 12) + "..." : f.familyName,
    fullName: f.familyName,
    expected: f.totalExpected,
    paid: f.totalPaid,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]" data-testid="select-family-month"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px]" data-testid="select-family-year"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-report-total-families">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Families</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFamilies}</div>
            <p className="text-xs text-muted-foreground">{unassigned.length} unassigned students</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-families-paid">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fully Paid Families</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fullPaidFamilies}</div>
            <p className="text-xs text-muted-foreground">{totalFamilies - fullPaidFamilies} pending</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-family-expected">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected (Families)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQAR(totalFamilyExpected)}</div>
            <p className="text-xs text-muted-foreground">{formatINREquivalent(totalFamilyExpected)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-report-family-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected (Families)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQAR(totalFamilyPaid)}</div>
            <p className="text-xs text-muted-foreground">{formatINREquivalent(totalFamilyPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {familyChartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Family Fee Collection - {selectedMonth} {selectedYear}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={familyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip
                  labelFormatter={(val) => { const f = familyChartData.find(d => d.name === val); return f?.fullName || val; }}
                  formatter={(value: number) => formatQAR(value)}
                />
                <Legend />
                <Bar dataKey="paid" name="Paid" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" name="Expected" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Family Fee Details - {selectedMonth} {selectedYear}</CardTitle></CardHeader>
        <CardContent>
          {familyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No families configured. Assign family names to students to see family-level reporting.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyData.map(f => {
                  const balance = f.totalExpected - f.totalPaid;
                  return (
                    <TableRow key={f.familyName} data-testid={`report-family-row-${f.familyName}`}>
                      <TableCell>
                        <div className="font-medium">{f.familyName}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.members.map(m => m.name).join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{f.activeMembers.length} active</Badge>
                        {f.members.length > f.activeMembers.length && (
                          <span className="text-xs text-muted-foreground ml-1">({f.members.length - f.activeMembers.length} inactive)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{formatQAR(f.totalExpected)}</div>
                        <div className="text-xs text-muted-foreground">{formatINREquivalent(f.totalExpected)}</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatQAR(f.totalPaid)}</div>
                        <div className="text-xs text-muted-foreground">{formatINREquivalent(f.totalPaid)}</div>
                      </TableCell>
                      <TableCell>
                        <div className={balance > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {balance > 0 ? formatQAR(balance) : balance === 0 ? "Settled" : formatQAR(Math.abs(balance)) + " overpaid"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {f.allPaid ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> All Paid
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            {f.activeMembers
                            .filter(m => getEffectiveFee(m.id, selectedMonth, yearNum) > 0)
                            .map(m => (
                              <div key={m.id} className="flex items-center gap-1 text-xs">
                                {f.paidMembers.has(m.id) ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span>{m.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
