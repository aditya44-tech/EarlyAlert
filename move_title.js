const fs = require('fs');

let content = fs.readFileSync('views/DashboardView.tsx', 'utf8');

const titleBlock = `
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-[#0D0D0D] flex items-center gap-2">
            <span className="w-3 h-3 bg-[#D62828] inline-block border border-[#0D0D0D]" />
            Flagged Student Cohort ({filteredStudents.length})
          </h2>
          <span className="text-xs font-bold text-neutral-500">
            Click any row to open diagnostic detail
          </span>
        </div>`;

// 1. Remove the original title block inside the space-y-4 div
const originalTitleRegex = /\s*<div className="flex items-center justify-between">\s*<h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-\[#0D0D0D\] flex items-center gap-2">\s*<span className="w-3 h-3 bg-\[#D62828\] inline-block border border-\[#0D0D0D\]" \/>\s*Flagged Student Cohort \(\{filteredStudents\.length\}\)\s*<\/h2>\s*<span className="text-xs font-bold text-neutral-500">\s*Click any row to open diagnostic detail\s*<\/span>\s*<\/div>/;

content = content.replace(originalTitleRegex, '');

// 2. Insert the title block before the Filter and Control Bar
content = content.replace('{/* Filter and Control Bar */}', titleBlock + '\n\n      {/* Filter and Control Bar */}');

fs.writeFileSync('views/DashboardView.tsx', content);
console.log('Title moved successfully.');
