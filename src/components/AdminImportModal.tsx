import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { DatasetManifest } from '../types/qc';

interface AdminImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: DatasetManifest | null;
  versionHistory: any[];
  onImportSuccess: () => void;
}

export const AdminImportModal: React.FC<AdminImportModalProps> = ({
  isOpen,
  onClose,
  manifest,
  versionHistory,
  onImportSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('กรุณาเลือกไฟล์ Excel (.xlsx)');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์');
      }

      setSuccessMsg(data.message || 'นำเข้าข้อมูลสำเร็จ');
      setSelectedFiles([]);
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRollback = async (targetVersion: string) => {
    if (!confirm(`ต้องการย้อนกลับไปใช้ชุดข้อมูลรุ่น ${targetVersion} หรือไม่?`)) return;

    setRollbackLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ย้อนกลับไม่สำเร็จ');

      setSuccessMsg(data.message);
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRollbackLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg">
              จัดการและนำเข้าไฟล์ข้อมูล QC (Admin Import &amp; Versioning)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Current Active Dataset Summary */}
          {manifest && (
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>ชุดข้อมูลที่เปิดใช้งานอยู่ (Active Dataset)</span>
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-900 text-white">
                  {manifest.datasetVersion}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500">จำนวนแถวทั้งหมด:</span>{' '}
                  <strong className="text-slate-900 font-mono-num font-bold">
                    {manifest.rawRecordCount.toLocaleString()} แถว
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">เวลานำเข้า:</span>{' '}
                  <strong className="text-slate-900">{manifest.importedAt}</strong>
                </div>
                <div>
                  <span className="text-slate-500">แหล่งข้อมูล:</span>{' '}
                  <strong className="text-slate-900">{manifest.sourceOrigin}</strong>
                </div>
              </div>

              {/* Source files detail */}
              <div className="mt-2 pt-2 border-t border-blue-200/60 text-xs space-y-1">
                <div className="font-semibold text-slate-700">ไฟล์ที่ประกอบในรุ่นนี้:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {manifest.sourceFiles.map((sf, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-medium text-slate-900 truncate pr-2">{sf.fileName}</span>
                      <span className="text-slate-500 shrink-0 font-mono">
                        {sf.sheets.map((s) => `${s.sheetName}: ${s.rowCount}`).join(', ')} แถว
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Import New Files Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>นำเข้าไฟล์ชุดใหม่ (5 ไฟล์ Excel ครบชุด)</span>
            </h4>

            <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-center space-y-2">
              <input
                id="excel-file-input"
                type="file"
                multiple
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="excel-file-input"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>เลือกไฟล์ Excel ทั้ง 5 ไฟล์จากเครื่อง</span>
              </label>
              <p className="text-xs text-slate-500">
                ต้องการ: Project QC Thai Osuka (EN, IV, RM-1, RM-2, RM-3).xlsx
              </p>

              {selectedFiles.length > 0 && (
                <div className="pt-2 text-left space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-xs font-semibold text-slate-700">
                    ไฟล์ที่เลือก ({selectedFiles.length} ไฟล์):
                  </div>
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-600 bg-white p-1.5 rounded border border-slate-200 flex justify-between"
                    >
                      <span className="truncate pr-2">{f.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังตรวจสอบ Schema และนำเข้าข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ตรวจสอบความถูกต้องและเปิดใช้ Dataset รุ่นใหม่</span>
                </>
              )}
            </button>
          </div>

          {/* Version History & Rollback Section */}
          {versionHistory && versionHistory.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>ประวัติรุ่นชุดข้อมูลและย้อนกลับ (Dataset Versions &amp; Rollback)</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {versionHistory.map((v, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      v.isActive
                        ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">{v.version}</span>
                        {v.isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                            กำลังใช้งาน
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {v.importedAt} • {v.recordCount?.toLocaleString()} แถว • {v.sourceOrigin}
                      </div>
                    </div>

                    {!v.isActive && (
                      <button
                        type="button"
                        onClick={() => handleRollback(v.version)}
                        disabled={rollbackLoading}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>ย้อนกลับใช้รุ่นนี้</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security & Access Limitation Disclaimer */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>การจำกัดสิทธิ์และการใช้งานภายในแผนก:</span>
            </div>
            <p>
              ชุดข้อมูลนี้สำหรับพนักงานแผนก QC ใช้เพื่อตรวจสอบและคำนวณทรัพยากร
              การนำเข้าหรือเปลี่ยน active dataset จะถูกบันทึกประวัติและสามารถย้อนกลับได้เสมอ
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
