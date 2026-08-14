import React from 'react';
import { Button } from '../../ui/Button';
import { Printer, X } from 'lucide-react';

interface ReportLayoutProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  landscape?: boolean;
}

export function ReportLayout({ title, onClose, children, landscape = true }: ReportLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-container fixed inset-0 z-[100] bg-white overflow-y-auto print:p-0 print:m-0 print:static print:bg-white print:overflow-visible">
      <div className="sticky top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center print:hidden shadow-md z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 h-9">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-700 h-9">
            <X className="w-5 h-5 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="p-8 max-w-[1500px] mx-auto print:p-0 print:m-0 print:max-w-none bg-white text-black print:text-black print:bg-white">
        {children}
      </div>

      {/* Required style to hide background UI when printing and set layout */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: ${landscape ? 'landscape' : 'portrait'};
          margin: 5mm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
