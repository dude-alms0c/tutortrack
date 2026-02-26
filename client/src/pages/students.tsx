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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Phone, Mail, BookOpen, UserCheck, UserX, Users, Upload, Download, AlertCircle, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { formatQAR, formatINREquivalent } from "@/lib/currency";
import { parseCSV, validateRequired } from "@/lib/csv";
import type { Student, InsertStudent, StudentFee } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function StudentForm({
  onSubmit,
  isPending,
  initialData,
}: {
  onSubmit: (data: InsertStudent) => void;
  isPending: boolean;
  initialData?: Student;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [grade, setGrade] = useState(initialData?.grade || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [monthlyFee, setMonthlyFee] = useState(initialData?.monthlyFee?.toString() || "");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [familyName, setFamilyName] = useState(initialData?.familyName || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      phone,
      email: email || null,
      grade: grade || null,
      subject,
      monthlyFee: parseInt(monthlyFee),
      status,
      familyName: familyName || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Student Name *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter student name" required data-testid="input-student-name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required data-testid="input-student-phone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" data-testid="input-student-email" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="grade">Grade/Class</Label>
          <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., 10th, 12th" data-testid="input-student-grade" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" required data-testid="input-student-subject" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="familyName">Family / Household Name</Label>
        <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="e.g., Sharma Family (to group siblings)" data-testid="input-student-family" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fee">Default Monthly Fee (QAR) *</Label>
          <Input id="fee" type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="e.g., 500" required data-testid="input-student-fee" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-student-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-student">
        {isPending ? "Saving..." : initialData ? "Update Student" : "Add Student"}
      </Button>
    </form>
  );
}

function BulkUploadDialog({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const bulkMutation = useMutation({
    mutationFn: async (data: InsertStudent[]) => {
      const res = await apiRequest("POST", "/api/students/bulk", data);
      return res.json();
    },
    onSuccess: (data: { created: number; errors: string[] }) => {
      setResults({ success: data.created, errors: data.errors });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      if (data.created > 0) toast({ title: `${data.created} students imported` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadTemplate = () => {
    const csv = "name,phone,email,grade,subject,monthlyFee,status,familyName\nJohn Doe,1234567890,john@example.com,10th,Mathematics,500,active,Doe Family\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
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
      if (parsed.length === 0) {
        toast({ title: "Empty file", description: "CSV needs a header row and at least one data row", variant: "destructive" });
        return;
      }
      const clientErrors: string[] = [];
      const rows: InsertStudent[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const err = validateRequired(row, ["name", "phone", "subject"], i + 1);
        if (err) { clientErrors.push(err); continue; }
        const fee = parseInt(row.monthlyfee || row.monthly_fee || row.fee || "0");
        if (!fee || fee <= 0) { clientErrors.push(`Row ${i + 1}: Invalid or missing monthlyFee`); continue; }
        rows.push({
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          grade: row.grade || null,
          subject: row.subject,
          monthlyFee: fee,
          status: row.status || "active",
          familyName: row.familyname || row.family_name || row.family || null,
        });
      }
      if (rows.length === 0) {
        setResults({ success: 0, errors: clientErrors });
        return;
      }
      if (clientErrors.length > 0) {
        bulkMutation.mutate(rows, {
          onSuccess: (data: { created: number; errors: string[] }) => {
            setResults({ success: data.created, errors: [...clientErrors, ...data.errors] });
          },
        });
      } else {
        bulkMutation.mutate(rows);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a CSV file with student data. Download the template to see the expected format.
      </p>
      <Button variant="secondary" onClick={downloadTemplate} className="w-full" data-testid="button-download-student-template">
        <Download className="h-4 w-4 mr-2" />
        Download CSV Template
      </Button>
      <div className="space-y-2">
        <Label>Choose CSV File</Label>
        <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} data-testid="input-student-csv" />
      </div>
      {bulkMutation.isPending && <p className="text-sm text-muted-foreground">Uploading...</p>}
      {results && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{results.success} students imported successfully</span>
          </div>
          {results.errors.length > 0 && (
            <div className="space-y-1">
              {results.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MonthlyFeesDialog({ student }: { student: Student }) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [feeMonth, setFeeMonth] = useState(MONTHS[new Date().getMonth()]);
  const [feeAmount, setFeeAmount] = useState("");

  const { data: fees, isLoading } = useQuery<StudentFee[]>({
    queryKey: ["/api/student-fees", student.id],
  });

  const yearFees = fees?.filter(f => f.year === parseInt(year)) || [];

  const setFeeMutation = useMutation({
    mutationFn: async (data: { studentId: number; month: string; year: number; amount: number }) => {
      const res = await apiRequest("POST", "/api/student-fees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees", student.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees"] });
      setFeeAmount("");
      toast({ title: "Monthly fee updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteFeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/student-fees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees", student.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees"] });
      toast({ title: "Monthly fee override removed" });
    },
  });

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(feeAmount);
    if (!amount || amount <= 0) return;
    setFeeMutation.mutate({
      studentId: student.id,
      month: feeMonth,
      year: parseInt(year),
      amount,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Default fee: <span className="font-medium text-foreground">{formatQAR(student.monthlyFee)}</span>
        <span className="ml-1">({formatINREquivalent(student.monthlyFee)})</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Set different fees for specific months. Months without overrides use the default fee.
      </p>

      <form onSubmit={handleAddFee} className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Select value={feeMonth} onValueChange={setFeeMonth}>
            <SelectTrigger className="w-[120px]" data-testid="select-fee-month"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Input type="number" className="w-[80px]" value={year} onChange={e => setYear(e.target.value)} data-testid="input-fee-year" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fee (QAR)</Label>
          <Input type="number" className="w-[100px]" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder={student.monthlyFee.toString()} data-testid="input-fee-amount" />
        </div>
        <Button type="submit" size="sm" disabled={setFeeMutation.isPending} data-testid="button-set-fee">
          Set
        </Button>
      </form>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : yearFees.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No fee overrides for {year}. Default fee applies to all months.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>vs Default</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONTHS.filter(m => yearFees.some(f => f.month === m)).map(m => {
              const fee = yearFees.find(f => f.month === m)!;
              const diff = fee.amount - student.monthlyFee;
              return (
                <TableRow key={fee.id} data-testid={`row-fee-${fee.id}`}>
                  <TableCell className="text-sm">{m}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{formatQAR(fee.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{formatINREquivalent(fee.amount)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={diff > 0 ? "default" : diff < 0 ? "secondary" : "outline"} className="text-xs">
                      {diff > 0 ? "+" : ""}{formatQAR(diff)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFeeMutation.mutate(fee.id)} data-testid={`button-delete-fee-${fee.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function Students() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertStudent) => {
      const res = await apiRequest("POST", "/api/students", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setAddOpen(false);
      toast({ title: "Student added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertStudent }) => {
      const res = await apiRequest("PATCH", `/api/students/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setEditStudent(null);
      toast({ title: "Student updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees"] });
      setDeleteTarget(null);
      toast({ title: "Student deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = students?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-students-title">Students</h1>
          <p className="text-sm text-muted-foreground">Manage your tuition students</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => {
            if (!students?.length) return;
            const header = "id,name,phone,email,grade,subject,monthlyFee,status,familyName";
            const rows = students.map(s => `${s.id},"${s.name}",${s.phone},${s.email || ""},${s.grade || ""},${s.subject},${s.monthlyFee},${s.status},"${s.familyName || ""}"`);
            const csv = [header, ...rows].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "students_list.csv"; a.click();
            URL.revokeObjectURL(url);
          }} data-testid="button-download-students-list">
            <Download className="h-4 w-4 mr-2" />Download List
          </Button>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" data-testid="button-bulk-upload-students">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Students</DialogTitle>
              </DialogHeader>
              <BulkUploadDialog onClose={() => setBulkOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-student">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <StudentForm onSubmit={(data) => addMutation.mutate(data)} isPending={addMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search students by name or subject..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-students" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-24 mb-4" /><Skeleton className="h-4 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No students found</p>
          <p className="text-sm">Add your first student to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((student) => (
            <Card key={student.id} className="cursor-pointer hover-elevate" onClick={() => setEditStudent(student)} data-testid={`card-student-${student.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-medium text-sm">{student.name} <span className="text-xs text-muted-foreground font-normal">#{student.id}</span></h3>
                    {student.grade && <p className="text-xs text-muted-foreground">{student.grade}</p>}
                    {student.familyName && <Badge variant="outline" className="text-[10px] mt-0.5" data-testid={`badge-family-${student.id}`}><Users className="h-2.5 w-2.5 mr-1" />{student.familyName}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={student.status === "active" ? "default" : "secondary"}>
                      {student.status === "active" ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                      {student.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(student); }}
                      data-testid={`button-delete-student-${student.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="h-3 w-3" /><span>{student.subject}</span></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" /><span>{student.phone}</span></div>
                  {student.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" /><span>{student.email}</span></div>}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-semibold">
                    {formatQAR(student.monthlyFee)}
                    <span className="text-xs font-normal text-muted-foreground"> /month (default)</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatINREquivalent(student.monthlyFee)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student - {editStudent?.name}</DialogTitle></DialogHeader>
          {editStudent && (
            <Tabs defaultValue="details">
              <TabsList className="w-full">
                <TabsTrigger value="details" data-testid="tab-student-details">Details</TabsTrigger>
                <TabsTrigger value="fees" data-testid="tab-student-fees">Monthly Fees</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <StudentForm initialData={editStudent} onSubmit={(data) => updateMutation.mutate({ id: editStudent.id, data })} isPending={updateMutation.isPending} />
              </TabsContent>
              <TabsContent value="fees">
                <MonthlyFeesDialog student={editStudent} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleteTarget?.name}</span>? This will also remove all their schedules, payments, and fee overrides. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-student">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-student"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
