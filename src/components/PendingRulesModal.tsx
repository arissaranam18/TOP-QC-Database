import React, { useState, useEffect } from 'react';
import { X, HelpCircle, AlertTriangle, ShieldCheck, FileQuestion } from 'lucide-react';

interface PendingRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingRulesModal: React.FC<PendingRulesModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/confirmed-rules')
        .then((res) => res.json())
        .then((d) => setData(d))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-300" />
            <h3 className="font-bold text-base sm:text-lg">
              กติกาและข้อกำกวมที่รอยืนยัน (Pending Confirmations)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>หลักการบริหารข้อมูล QC (Data Governance):</span>
            </div>
            <p>
              ข้อกำหนดด้านข้อมูลมีความสำคัญเหนือความสวยงาม ห้ามสร้างข้อมูลแล็ปขึ้นเอง
              ห้ามเดาหรือแก้ความหมายของข้อมูลที่กำกวม ในกรณีที่ข้อมูลมีความขัดแย้งเชิงตรรกะ
              ระบบจะระงับการออกผลตัวเลข (Blocked) และคงข้อมูลดิบไว้ให้ตรวจสอบอย่างโปร่งใส
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-blue-600" />
              <span>รายการประเด็นที่รอยืนยันจากเจ้าของข้อมูล (4 รายการหลัก):</span>
            </h4>

            {data?.pendingQuestions ? (
              <div className="space-y-3">
                {data.pendingQuestions.map((q: any, i: number) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs sm:text-sm">{q.field}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                        รอยืนยัน
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{q.issue}</p>
                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                      <strong>นโยบายระบบปัจจุบัน:</strong> {q.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>
            )}
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>โครงสร้าง ConfirmedRule:</span>
            </div>
            <p>
              ระบบได้เตรียมโครงสร้างข้อมูลเพื่อรองรับการเพิ่มกติกาที่ได้รับการยืนยันอย่างเป็นทางการ
              (เช่น ฐานเวลาเครื่องมือ, นโยบาย Control) โดยไม่แก้ไขค่าดิบในฐานข้อมูลเดิม
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
