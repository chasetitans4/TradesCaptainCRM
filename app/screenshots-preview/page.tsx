import React from 'react';

const SCREENSHOTS = [
  '01-my-day-active-job',
  '02-invoice-detail',
  '03-more-menu',
  '04-job-detail-expanded',
  '05-dashboard',
  '06-leads-kanban',
  '07-customer-detail',
  '08-calendar',
  '09-jobs-list',
  '10-invoices-list',
  '11-messages',
  '12-quotes-list',
  '13-voice-dashboard',
  '14-dispatch-board',
  '15-route-summary',
];

export default function ScreenshotsPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Screenshot Preview Gallery</h1>
          <p className="text-gray-600 mt-2">Generated via Playwright automation (24 Screens)</p>
        </header>

        <div className="space-y-12">
          {SCREENSHOTS.map((baseName) => (
            <section key={baseName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800 font-mono">{baseName}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                {/* Light Mode */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">LIGHT MODE</span>
                  </div>
                  <div className="relative border border-gray-200 rounded-lg overflow-hidden shadow-md group">
                    <img 
                      src={`/screenshots-preview/${baseName}-light.png`} 
                      alt={`${baseName} Light`}
                      className="w-full h-auto object-contain block transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Dark Mode */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded">DARK MODE</span>
                  </div>
                  <div className="relative border border-gray-800 rounded-lg overflow-hidden shadow-md bg-gray-900 group">
                    <img 
                      src={`/screenshots-preview/${baseName}-dark.png`} 
                      alt={`${baseName} Dark`}
                      className="w-full h-auto object-contain block transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
