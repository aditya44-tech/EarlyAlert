const fs = require('fs');

let content = fs.readFileSync('views/DashboardView.tsx', 'utf8');

// 1. Signature update
content = content.replace(
  "onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise') =>",
  "onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) =>"
);

// 2. State update
content = content.replace(
  "const [viewingRawData, setViewingRawData] = useState<{ week: string, type: string, data: any[] } | null>(null);",
  "const [viewingRawData, setViewingRawData] = useState<{ week: string, type: string, data: any[], fileName?: string } | null>(null);"
);

// 3. onDataUpload call
content = content.replace(
  "const res = onDataUpload(data, finalWeekLabel, uploadType);",
  "const res = onDataUpload(data, finalWeekLabel, uploadType, uploadedFile.name);"
);

// 4. Modal filename
content = content.replace(
  "{viewingRawData.week} — {viewingRawData.type.replace('_', ' ').toUpperCase()}",
  "{viewingRawData.week} — {viewingRawData.type.replace('_', ' ').toUpperCase()} {viewingRawData.fileName ? `(${viewingRawData.fileName})` : ''}"
);

// 5. Button onClick
content = content.replace(
  "onClick={() => setViewingRawData({ week: group.week, type: log.type, data: log.rawData! })}",
  "onClick={() => setViewingRawData({ week: group.week, type: log.type, data: log.rawData!, fileName: log.fileName })}"
);

// 6. Table Header
content = content.replace(
  "<th className=\"p-2 border-r-2 border-[#0D0D0D]\">Uploaded On</th>",
  "<th className=\"p-2 border-r-2 border-[#0D0D0D]\">File Name</th>\n                    <th className=\"p-2 border-r-2 border-[#0D0D0D]\">Uploaded On</th>"
);

// 7. Table row
content = content.replace(
  "<td className=\"p-2 border-r-2 border-[#0D0D0D] capitalize\">{log.type.replace('_', ' ')}</td>\n                          <td className=\"p-2 border-r-2 border-[#0D0D0D]\">{new Date(log.uploadedAt).toLocaleString()}</td>",
  "<td className=\"p-2 border-r-2 border-[#0D0D0D] capitalize\">{log.type.replace('_', ' ')}</td>\n                          <td className=\"p-2 border-r-2 border-[#0D0D0D] text-neutral-600 italic font-mono text-[10px]\">{log.fileName || 'N/A'}</td>\n                          <td className=\"p-2 border-r-2 border-[#0D0D0D]\">{new Date(log.uploadedAt).toLocaleString()}</td>"
);

// 8. Move the section
const filterStart = content.indexOf("{/* Filter and Control Bar */}");
const uploadStart = content.indexOf("{/* Weekly Data Upload Section */}");
const uploadEnd = content.indexOf("{/* Raw Data Viewer Modal */}");

if (filterStart !== -1 && uploadStart !== -1 && uploadEnd !== -1) {
  const filterSection = content.substring(filterStart, uploadStart);
  const uploadSection = content.substring(uploadStart, uploadEnd);
  
  const beforeFilter = content.substring(0, filterStart);
  const afterUpload = content.substring(uploadEnd);
  
  content = beforeFilter + uploadSection + "\n      " + filterSection + afterUpload;
}

fs.writeFileSync('views/DashboardView.tsx', content);
console.log('Done');
