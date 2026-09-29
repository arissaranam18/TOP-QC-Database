import React from 'react';
import { Database, ShieldCheck, Upload, HelpCircle, FileText } from 'lucide-react';
import { DatasetManifest } from '../types/qc';

interface HeaderProps {
  manifest: DatasetManifest | null;
  onOpenAdmin: () => void;
  onOpenRules: () => void;
}

export const Header: React.FC<HeaderProps> = ({ manifest, onOpenAdmin, onOpenRules }) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-md border-b border-blue-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-blue-700/60 rounded-xl border border-blue-500/30 shadow-inner flex items-center justify-center shrink-0">
              <Database className="w-7 h-7 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  TOP QC Database
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  พร้อมใช้งาน
                </span>
                {manifest && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-200 border border-blue-600/40">
                    {manifest.datasetVersion}
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-200 mt-0.5">
                ค้นหาข้อมูลและคำนวณทรัพยากรสำหรับงาน QC
              </p>
            </div>
          </div>

          {/* Action Buttons & Manifest Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {manifest && (
              <div className="hidden lg:flex flex-col text-right text-xs text-blue-200/90 pr-2 border-r border-blue-700/60">
                <span className="font-semibold text-white">
                  {manifest.rawRecordCount.toLocaleString()} แถวข้อมูลจริง
                </span>
                <span className="text-blue-300 text-[11px] truncate max-w-[200px]" title={manifest.sourceOrigin}>
                  {manifest.importedAt}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenRules}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-800/80 hover:bg-blue-700 text-blue-100 hover:text-white border border-blue-600/50 transition-colors shadow-sm cursor-pointer"
              title="ดูข้อกำกวมและประเด็นที่รอยืนยัน"
            >
              <HelpCircle className="w-4 h-4 text-blue-300" />
              <span>กติกาและข้อกำกวม</span>
            </button>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>นำเข้าไฟล์ QC (Admin)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
