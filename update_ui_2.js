const fs = require('fs');

let content = fs.readFileSync('app/_app/EarlyAlertApp.tsx', 'utf8');

// Add handlers
const handlers = `
  const handleClearAllData = () => {
    if (confirm('Are you sure you want to reset all data to the initial state? This cannot be undone.')) {
      setStudents(initialStudents);
      setDetailsMap(studentDetailsMap);
      setUploadHistory([]);
      setStudentStatusData(studentStatusMap);
      setOutcomeDataMap(outcomeComparisonsMap);
      localStorage.removeItem('ea_uploadHistory');
      localStorage.removeItem('ea_students');
      localStorage.removeItem('ea_detailsMap');
    }
  };

  const handleDeleteUpload = (uploadedAt: string) => {
    if (confirm('Delete this upload log?')) {
      setUploadHistory(prev => prev.filter(log => log.uploadedAt !== uploadedAt));
    }
  };

  // Navigation handlers
`;

content = content.replace('  // Navigation handlers', handlers);

// Update DashboardView usage
content = content.replace(
  /<DashboardView\s+students=\{students\}\s+onSelectStudent=\{handleSelectStudent\}\s+uploadHistory=\{uploadHistory\}\s+onDataUpload=\{handleDataUpload\}\s*\/>/g,
  `<DashboardView 
            students={students} 
            onSelectStudent={handleSelectStudent} 
            uploadHistory={uploadHistory}
            onDataUpload={handleDataUpload}
            onClearAllData={handleClearAllData}
            onDeleteUpload={handleDeleteUpload}
          />`
);

fs.writeFileSync('app/_app/EarlyAlertApp.tsx', content);

let dashboard = fs.readFileSync('views/DashboardView.tsx', 'utf8');

// Icons
dashboard = dashboard.replace('Eye\n} from', 'Eye,\n  Trash2,\n  ChevronUp,\n  ChevronDown\n} from');

// Props
dashboard = dashboard.replace(
  'onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: \'overall\' | \'fee\' | \'backlog\' | \'subject_wise\', fileName?: string) => { success: boolean; updatedCount: number; skippedCount: number };\n}',
  `onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) => { success: boolean; updatedCount: number; skippedCount: number };
  onClearAllData?: () => void;
  onDeleteUpload?: (uploadedAt: string) => void;
}`
);

// Destructure
dashboard = dashboard.replace(
  'onDataUpload,\n}) => {',
  'onDataUpload,\n  onClearAllData,\n  onDeleteUpload,\n}) => {'
);

// State for minimization
dashboard = dashboard.replace(
  'const [viewingRawData',
  'const [isUploadMinimized, setIsUploadMinimized] = useState(false);\n  const [viewingRawData'
);

// High Risk Card text color
dashboard = dashboard.replace(
  /<span className="text-xs font-black uppercase tracking-wider text-red-100">/g,
  '<span className="text-xs font-black uppercase tracking-wider text-white">'
);
dashboard = dashboard.replace(
  /<span className="text-\[11px\] font-bold text-red-100">Requires immediate contact<\/span>/g,
  '<span className="text-[11px] font-bold text-white">Requires immediate contact</span>'
);

// Minimize section and Clear all button
dashboard = dashboard.replace(
  '<div className="neo-card p-4 bg-[#F5F1E8] border-2 border-dashed border-[#0D0D0D]">',
  `<div className="neo-card p-4 bg-[#F5F1E8] border-2 border-dashed border-[#0D0D0D]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-neutral-300">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-[#0D0D0D] uppercase tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#D62828]" />
              Weekly Data Upload
            </h3>
            <button onClick={() => setIsUploadMinimized(!isUploadMinimized)} className="p-1 hover:bg-neutral-200 rounded">
              {isUploadMinimized ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
            </button>
          </div>
          {onClearAllData && (
            <button onClick={onClearAllData} className="neo-btn px-3 py-1 bg-[#D62828] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-700">
              <Trash2 className="w-3 h-3"/> Reset All Data
            </button>
          )}
        </div>
        
        {!isUploadMinimized && (`
);

dashboard = dashboard.replace(
  /\{viewingRawData && \(/,
  `)}
      
      {/* Raw Data Viewer Modal */}
      {viewingRawData && (`
);

// Wait, the replacement for `{!isUploadMinimized && (` needs to close `)}` at the end of the Weekly Data Upload section.
// The upload section ends right before `{/* Filter and Control Bar */}`
// Let's do this more cleanly.

// Delete actions column addition
dashboard = dashboard.replace(
  /<Eye className="w-3 h-3" \/> View Data\n                              <\/button>\n                            \)}\n                          <\/td>/,
  `<Eye className="w-3 h-3" /> View Data
                              </button>
                            )}
                            {onDeleteUpload && (
                              <button
                                onClick={() => onDeleteUpload(log.uploadedAt)}
                                className="neo-btn px-2 py-1 bg-[#D62828] border border-[#0D0D0D] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-700 mt-1"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </td>`
);

fs.writeFileSync('views/DashboardView.tsx', dashboard);
console.log('Script done');
