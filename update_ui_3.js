const fs = require('fs');

// --- Update EarlyAlertApp.tsx ---
let appContent = fs.readFileSync('app/_app/EarlyAlertApp.tsx', 'utf8');

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

  // Navigation handlers`;

appContent = appContent.replace('  // Navigation handlers', handlers);

appContent = appContent.replace(
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

fs.writeFileSync('app/_app/EarlyAlertApp.tsx', appContent);


// --- Update DashboardView.tsx ---
let dash = fs.readFileSync('views/DashboardView.tsx', 'utf8');

// 1. Icons
dash = dash.replace('Eye\n} from', 'Eye,\n  Trash2,\n  ChevronUp,\n  ChevronDown\n} from');

// 2. Props
dash = dash.replace(
  /onDataUpload\?: \(.*?\) => \{.*?\};\n\}/,
  `onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) => { success: boolean; updatedCount: number; skippedCount: number };
  onClearAllData?: () => void;
  onDeleteUpload?: (uploadedAt: string) => void;
}`
);

// 3. Destructure
dash = dash.replace(
  'onDataUpload,\n}) => {',
  'onDataUpload,\n  onClearAllData,\n  onDeleteUpload,\n}) => {'
);

// 4. State
dash = dash.replace(
  'const [viewingRawData',
  'const [isUploadMinimized, setIsUploadMinimized] = useState(false);\n  const [viewingRawData'
);

// 5. High Risk Colors
dash = dash.replace(
  /<span className="text-xs font-black uppercase tracking-wider text-red-100">/g,
  '<span className="text-xs font-black uppercase tracking-wider text-white">'
);
dash = dash.replace(
  /<span className="text-\[11px\] font-bold text-red-100">Requires immediate contact<\/span>/g,
  '<span className="text-[11px] font-bold text-white">Requires immediate contact</span>'
);

// 6. Delete Upload button in table
dash = dash.replace(
  /<Eye className="w-3 h-3" \/> View Data\s*<\/button>\s*\)}/g,
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
                            )}`
);

// 7. Minimize section & Clear All
// Wrap the contents of the neo-card p-4 bg-[#F5F1E8]... in a condition
const uploadSectionStart = '<div className="neo-card p-4 bg-[#F5F1E8] border-2 border-dashed border-[#0D0D0D]">';
const uploadSectionReplacement = `<div className="neo-card p-4 bg-[#F5F1E8] border-2 border-dashed border-[#0D0D0D]">
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
        
        {!isUploadMinimized && (
          <>`;
dash = dash.replace(uploadSectionStart, uploadSectionReplacement);

// We need to close the `</>` and `)}` before the `{/* Filter and Control Bar */}`
const filterSectionStart = '{/* Filter and Control Bar */}';
const filterReplacement = `  </>
        )}
      </div>

      ${filterSectionStart}`;
      
// The Upload Section ends with `</div>` right before `{/* Filter and Control Bar */}`
// But earlier I moved the upload section BEFORE the filter section. Let me check what comes after the upload section now.
// It is `{/* Filter and Control Bar */}`! So I can replace `      </div>\n\n      {/* Filter and Control Bar */}`
dash = dash.replace(/<\/div>\s*\{\/\* Filter and Control Bar \*\/\}/, filterReplacement);

fs.writeFileSync('views/DashboardView.tsx', dash);
console.log('Update successful');
