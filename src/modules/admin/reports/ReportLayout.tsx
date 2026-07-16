import React from 'react';
import { Button } from '../../../components/ui/Button';
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
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto print:p-0 print:m-0">
      <div className="sticky top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center print:hidden shadow-md z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg">Print Preview: {title}</h2>
          <span className="text-sm text-slate-300">Set destination to "Save as PDF" to download.</span>
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

      <div className="p-8 max-w-[1500px] mx-auto print:p-0 print:max-w-none bg-white text-black print:text-black">
        {children}
      </div>

      {/* Required style to hide the rest of the app when printing and set layout */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body > #root > *:not(div[class*="fixed inset-0 z-[100]"]) {
            display: none !important;
          }
          @page {
            size: ${landscape ? 'landscape' : 'portrait'};
            margin: 5mm;
          }
        }
      `}} />
    </div>
  );
}
