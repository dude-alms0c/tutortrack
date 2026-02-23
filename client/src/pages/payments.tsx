import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, Filter, Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatQAR, formatINREquivalent } from "@/lib/currency";
import { parseCSV } from "@/lib/csv";
import type { Student, Payment, InsertPayment } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function PaymentForm({
  students,
  onSubmit,
  isPending,
}: {
  students: Student[];
  onSubmit: (data: InsertPayment) => void;
  isPending: boolean;
}) {
  const currentDate = new Date();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(MONTHS[currentDate.getMonth()]);
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [paidDate, setPaidDate] = useState(currentDate.toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const handleStudentChange = (val: string) => {
    setStudentId(val);
    const student = students.find((s) => s.id.toString() === val);
    if (student) setAmount(student.monthlyFee.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      studentId: parseInt(studentId),
      amount: parseInt(amount),
      month,
      year: parseInt(year),
      paidDate,
      method,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Student *</Label>
        <Select value={studentId} onValueChange={handleStudentChange}>
          <SelectTrigger data-testid="select-payment-student"><SelectValue placeholder="Select student" /></SelectTrigger>
          <SelectContent>
            {students.filter((s) => s.status === "active").map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name} - {formatQAR(s.monthlyFee)}/mo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount (QAR) *</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" required data-testid="input-payment-amount" />
        </div>
        <div className="space-y-2">
          <Label>Payment Date *</Label>
          <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} required data-testid="input-payment-date" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Month *</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger data-testid="select-payment-month"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Year *</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} required data-testid="input-payment-year" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" data-testid="input-payment-notes" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-payment">
        {isPending ? "Recording..." : "Record Payment"}
      </Button>
    </form>
  );
}

function BulkPaymentDialog() {
  const { toast } = useToast();
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);

  const bulkMutation = useMutation({
    mutationFn: async (data: InsertPayment[]) => {
      const res = await apiRequest("POST", "/api/payments/bulk", data);
      return res.json();
    },
    onSuccess: (data: { created: number; errors: string[] }) => {
      setResults({ success: data.created, errors: data.errors });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      if (data.created > 0) toast({ title: `${data.created} payments imported` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadTemplate = () => {
    const csv = "studentId,amount,month,year,paidDate,method,notes\n1,500,February,2026,2026-02-22,cash,Monthly fee\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_template.csv";
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
      const rows: InsertPayment[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const sid = parseInt(row.studentid || row.student_id || "0");
        const amount = parseInt(row.amount || "0");
        const year = parseInt(row.year || "0");
        const month = row.month || "";
        const paidDate = row.paiddate || row.paid_date || "";
        if (!sid) { clientErrors.push(`Row ${i + 1}: Missing studentId`); continue; }
        if (!amount || amount <= 0) { clientErrors.push(`Row ${i + 1}: Invalid amount`); continue; }
        if (!month || !year || !paidDate) { clientErrors.push(`Row ${i + 1}: Missing month, year, or paidDate`); continue; }
        rows.push({ studentId: sid, amount, month, year, paidDate, method: row.method || "cash", notes: row.notes || null });
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
      <p className="text-sm text-muted-foreground">Upload a CSV file with payment records. Use student IDs from the Students page.</p>
      <Button variant="secondary" onClick={downloadTemplate} className="w-full" data-testid="button-download-payment-template">
        <Download className="h-4 w-4 mr-2" />Download CSV Template
      </Button>
      <div className="space-y-2">
        <Label>Choose CSV File</Label>
        <Input type="file" accept=".csv" onChange={handleFile} data-testid="input-payment-csv" />
      </div>
      {bulkMutation.isPending && <p className="text-sm text-muted-foreground">Uploading...</p>}
      {results && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>{results.success} payments imported</span></div>
          {results.errors.length > 0 && results.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{err}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Payments() {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const { toast } = useToast();

  const { data: students } = useQuery<Student[]>({ queryKey: ["/api/students"] });
  const { data: payments, isLoading } = useQuery<Payment[]>({ queryKey: ["/api/payments"] });

  const addMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setAddOpen(false);
      toast({ title: "Payment recorded" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredPayments = payments?.filter(
    (p) => p.month === filterMonth && p.year === parseInt(filterYear)
  ) || [];
  const totalFiltered = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const methodLabel = (m: string) => {
    switch (m) {
      case "cash": return "Cash";
      case "upi": return "UPI";
      case "bank_transfer": return "Bank Transfer";
      case "cheque": return "Cheque";
      default: return m;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-payments-title">Payments</h1>
          <p className="text-sm text-muted-foreground">Track fee collections from students</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" data-testid="button-bulk-upload-payments">
                <Upload className="h-4 w-4 mr-2" />Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Bulk Upload Payments</DialogTitle></DialogHeader>
              <BulkPaymentDialog />
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-payment"><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <PaymentForm students={students || []} onSubmit={(data) => addMutation.mutate(data)} isPending={addMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-month"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="number" className="w-[100px]" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} data-testid="input-filter-year" />
        <div className="ml-auto text-right">
          <Badge variant="secondary">Total: {formatQAR(totalFiltered)}</Badge>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatINREquivalent(totalFiltered)}</p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No payments found</p>
          <p className="text-sm">No payments recorded for {filterMonth} {filterYear}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount (QAR)</TableHead>
                  <TableHead className="hidden sm:table-cell">INR Equiv.</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments
                  .sort((a, b) => b.paidDate.localeCompare(a.paidDate))
                  .map((payment) => {
                    const student = students?.find((s) => s.id === payment.studentId);
                    return (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{student?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{student?.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{formatQAR(payment.amount)}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {formatINREquivalent(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {payment.paidDate}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">{methodLabel(payment.method)}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
