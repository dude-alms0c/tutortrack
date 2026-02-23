import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Clock, Trash2, Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseCSV, validateRequired } from "@/lib/csv";
import type { Student, Schedule, InsertSchedule } from "@shared/schema";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function ScheduleForm({
  students,
  onSubmit,
  isPending,
}: {
  students: Student[];
  onSubmit: (data: InsertSchedule) => void;
  isPending: boolean;
}) {
  const [studentId, setStudentId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [subject, setSubject] = useState("");

  const handleStudentChange = (val: string) => {
    setStudentId(val);
    const student = students.find((s) => s.id.toString() === val);
    if (student) setSubject(student.subject);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ studentId: parseInt(studentId), dayOfWeek, startTime, endTime, subject });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Student *</Label>
        <Select value={studentId} onValueChange={handleStudentChange}>
          <SelectTrigger data-testid="select-schedule-student"><SelectValue placeholder="Select student" /></SelectTrigger>
          <SelectContent>
            {students.filter((s) => s.status === "active").map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Day *</Label>
        <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
          <SelectTrigger data-testid="select-schedule-day"><SelectValue placeholder="Select day" /></SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time *</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required data-testid="input-schedule-start" />
        </div>
        <div className="space-y-2">
          <Label>End Time *</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required data-testid="input-schedule-end" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required data-testid="input-schedule-subject" />
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-schedule">
        {isPending ? "Saving..." : "Add Schedule"}
      </Button>
    </form>
  );
}

function BulkScheduleDialog() {
  const { toast } = useToast();
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);

  const bulkMutation = useMutation({
    mutationFn: async (data: InsertSchedule[]) => {
      const res = await apiRequest("POST", "/api/schedules/bulk", data);
      return res.json();
    },
    onSuccess: (data: { created: number; errors: string[] }) => {
      setResults({ success: data.created, errors: data.errors });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      if (data.created > 0) toast({ title: `${data.created} schedules imported` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadTemplate = () => {
    const csv = "studentId,dayOfWeek,startTime,endTime,subject\n1,Monday,16:00,17:00,Mathematics\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedules_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { toast({ title: "Empty file", variant: "destructive" }); return; }
      const clientErrors: string[] = [];
      const rows: InsertSchedule[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const sid = parseInt(row.studentid || row.student_id || "0");
        if (!sid) { clientErrors.push(`Row ${i + 1}: Missing studentId`); continue; }
        const day = row.dayofweek || row.day_of_week || row.day || "";
        const start = row.starttime || row.start_time || "";
        const end = row.endtime || row.end_time || "";
        if (!day || !start || !end || !row.subject) { clientErrors.push(`Row ${i + 1}: Missing required fields`); continue; }
        rows.push({ studentId: sid, dayOfWeek: day, startTime: start, endTime: end, subject: row.subject });
      }
      if (rows.length === 0) { setResults({ success: 0, errors: clientErrors }); return; }
      if (clientErrors.length > 0) {
        bulkMutation.mutate(rows, { onSuccess: (data: { created: number; errors: string[] }) => { setResults({ success: data.created, errors: [...clientErrors, ...data.errors] }); } });
      } else { bulkMutation.mutate(rows); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload a CSV file with schedule data. Use student IDs from the Students page.</p>
      <Button variant="secondary" onClick={downloadTemplate} className="w-full" data-testid="button-download-schedule-template">
        <Download className="h-4 w-4 mr-2" />Download CSV Template
      </Button>
      <div className="space-y-2">
        <Label>Choose CSV File</Label>
        <Input type="file" accept=".csv" onChange={handleFile} data-testid="input-schedule-csv" />
      </div>
      {bulkMutation.isPending && <p className="text-sm text-muted-foreground">Uploading...</p>}
      {results && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>{results.success} schedules imported</span></div>
          {results.errors.length > 0 && results.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{err}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Schedules() {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();

  const { data: students } = useQuery<Student[]>({ queryKey: ["/api/students"] });
  const { data: schedules, isLoading } = useQuery<Schedule[]>({ queryKey: ["/api/schedules"] });

  const addMutation = useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const res = await apiRequest("POST", "/api/schedules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setAddOpen(false);
      toast({ title: "Schedule added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/schedules/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule removed" });
    },
  });

  const groupedByDay = DAYS.map((day) => ({
    day,
    items: (schedules || []).filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter((g) => g.items.length > 0);

  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-schedules-title">Schedules</h1>
          <p className="text-sm text-muted-foreground">Weekly tuition timetable</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" data-testid="button-bulk-upload-schedules">
                <Upload className="h-4 w-4 mr-2" />Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Bulk Upload Schedules</DialogTitle></DialogHeader>
              <BulkScheduleDialog />
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-schedule"><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Schedule</DialogTitle></DialogHeader>
              <ScheduleForm students={students || []} onSubmit={(data) => addMutation.mutate(data)} isPending={addMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}><Skeleton className="h-6 w-24 mb-3" /><div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div></div>
          ))}
        </div>
      ) : groupedByDay.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No schedules yet</p>
          <p className="text-sm">Create your first schedule to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDay.map(({ day, items }) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{day}</h2>
                {day === todayName && <Badge variant="default" className="text-[10px]">Today</Badge>}
              </div>
              <div className="space-y-2">
                {items.map((schedule) => {
                  const student = students?.find((s) => s.id === schedule.studentId);
                  return (
                    <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground min-w-[110px]">
                            <Clock className="h-3.5 w-3.5" />{schedule.startTime} - {schedule.endTime}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{schedule.subject}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(schedule.id)} data-testid={`button-delete-schedule-${schedule.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
