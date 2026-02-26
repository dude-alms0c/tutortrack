import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Download, Upload, Database, Shield, Clock, Users, Calendar, CreditCard, AlertTriangle, CheckCircle2, FileJson } from "lucide-react";

interface BackupData {
  version: string;
  exportedAt: string;
  students: any[];
  schedules: any[];
  payments: any[];
  studentFees?: any[];
}

export default function Backup() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ students: number; schedules: number; payments: number; studentFees: number; skipped: number } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tutortrack_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded", description: `${data.students.length} students, ${data.schedules.length} schedules, ${data.payments.length} payments, ${(data.studentFees || []).length} fee overrides exported.` });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        if (!data.version || !data.students || !data.schedules || !data.payments) {
          toast({ title: "Invalid file", description: "This doesn't look like a TutorTrack backup file.", variant: "destructive" });
          return;
        }
        setPreviewData(data);
        setShowPreview(true);
      } catch {
        toast({ title: "Invalid file", description: "Could not read the file. Make sure it's a valid JSON backup.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRestore = async () => {
    if (!previewData) return;
    setShowConfirm(false);
    setIsRestoring(true);
    try {
      const res = await apiRequest("POST", "/api/restore", previewData);
      const result = await res.json();
      setRestoreResult({ students: result.students, schedules: result.schedules, payments: result.payments, studentFees: result.studentFees || 0, skipped: result.skipped || 0 });
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-fees"] });
      toast({ title: "Restore complete", description: `${result.students} students, ${result.schedules} schedules, ${result.payments} payments, ${result.studentFees || 0} fee overrides restored.` });
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-backup-title">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground">Export your data for safekeeping or restore from a previous backup</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        <Card data-testid="card-backup">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Backup</CardTitle>
                <CardDescription>Download all your data as a JSON file</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>All student records and details</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Complete schedule information</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Full payment history</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Your backup file contains all data and can be used to restore your database to this exact state.</span>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              data-testid="button-create-backup"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Creating backup..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-restore">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Restore Data</CardTitle>
                <CardDescription>Import data from a backup file</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                <span>Upload a .json backup file</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Preview data before restoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmation required before changes</span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 flex items-start gap-2 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Restoring will replace ALL existing data with the backup data. Create a backup first if you want to save your current data.</span>
            </div>
            <input
              type="file"
              accept=".json"
              ref={fileRef}
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-restore-file"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
              data-testid="button-select-backup-file"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Backup File
            </Button>
          </CardContent>
        </Card>
      </div>

      {restoreResult && (
        <Card className="mt-6 max-w-4xl border-green-200" data-testid="card-restore-result">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">Restore Completed Successfully</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">{restoreResult.students}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">{restoreResult.schedules}</div>
                <div className="text-xs text-muted-foreground">Schedules</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">{restoreResult.payments}</div>
                <div className="text-xs text-muted-foreground">Payments</div>
              </div>
              {restoreResult.studentFees > 0 && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-2xl font-bold">{restoreResult.studentFees}</div>
                  <div className="text-xs text-muted-foreground">Fee Overrides</div>
                </div>
              )}
            </div>
            {restoreResult.skipped > 0 && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {restoreResult.skipped} record(s) skipped due to missing student references
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Backup Preview</DialogTitle>
            <DialogDescription>Review the backup file contents before restoring</DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Backup version</span>
                  <Badge variant="secondary">{previewData.version}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(previewData.exportedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Data Summary</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold" data-testid="text-preview-students">{previewData.students.length}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold" data-testid="text-preview-schedules">{previewData.schedules.length}</div>
                    <div className="text-xs text-muted-foreground">Schedules</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold" data-testid="text-preview-payments">{previewData.payments.length}</div>
                    <div className="text-xs text-muted-foreground">Payments</div>
                  </div>
                  {(previewData.studentFees?.length || 0) > 0 && (
                    <div className="rounded-lg border p-3 text-center">
                      <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-xl font-bold" data-testid="text-preview-fees">{previewData.studentFees!.length}</div>
                      <div className="text-xs text-muted-foreground">Fee Overrides</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 flex items-start gap-2 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>This will delete all current data and replace it with the backup contents.</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-cancel-restore">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowPreview(false); setShowConfirm(true); }}
              data-testid="button-proceed-restore"
            >
              Restore This Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all current students, schedules, and payment records, then replace them with the backup data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-restore"
            >
              {isRestoring ? "Restoring..." : "Yes, Restore Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
