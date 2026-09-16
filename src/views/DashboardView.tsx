import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { StudentSummary, UploadLog } from '../types';
import { StudentTableRow } from '../components/StudentTableRow';
import { StudentCard } from '../components/StudentCard';
import {
  AlertTriangle,
  ArrowDownUp,
  Filter,
  Search,
  Users,
  CheckCircle2,
  Activity,
  X,
  UploadCloud,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardViewProps {
  students: StudentSummary[];
  onSelectStudent: (studentId: string) => void;
  uploadHistory?: UploadLog[];
  onDataUpload?: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise') => { success: boolean; updatedCount: number; skippedCount: number };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  onSelectStudent,
  uploadHistory = [],
  onDataUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [sortAscending, setSortAscending] = useState(false); // default descending riskScore
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Upload UI State
  const [weekLabel, setWeekLabel] = useState<string>('Week 5');
  const [uploadType, setUploadType] = useState<'overall' | 'fee' | 'backlog' | 'subject_wise'>('overall');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Unique departments and years
  const departments = useMemo(() => {
    const set = new Set(students.map((s) => s.department));
    return ['All', ...Array.from(set)];
  }, [students]);

  const years = useMemo(() => {
    const set = new Set(students.map((s) => s.year.toString()));
    return ['All', ...Array.from(set).sort()];
  }, [students]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'All' || s.department === selectedDept;
        const matchesYear = selectedYear === 'All' || s.year.toString() === selectedYear;
        const matchesRisk = selectedRisk === 'All' || s.riskLevel === selectedRisk;
        return matchesSearch && matchesDept && matchesYear && matchesRisk;
      })
      .sort((a, b) => {
        if (!sortAscending) {
          if (a.riskLevel === 'High' && b.riskLevel !== 'High') return -1;
          if (a.riskLevel !== 'High' && b.riskLevel === 'High') return 1;
        }
        return sortAscending ? a.riskScore - b.riskScore : b.riskScore - a.riskScore;
      });
  }, [students, searchQuery, selectedDept, selectedYear, selectedRisk, sortAscending]);

  // Aggregate metrics
  const totalCount = students.length;
  const highRiskCount = students.filter((s) => s.riskLevel === 'High').length;
  const activeInterventionsCount = students.filter((s) => s.interventionStatus === 'Active').length;
  const avgRiskScore = Math.round(
    students.reduce((acc, curr) => acc + curr.riskScore, 0) / (totalCount || 1)
  );

  const handleProcessUpload = () => {
    if (!uploadedFile) {
      setUploadMessage({ type: 'error', text: 'Please select a CSV file first.' });
      return;
    }
    if (!weekLabel.trim()) {
      setUploadMessage({ type: 'error', text: 'Please enter a Week label.' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsUploading(false);
        const data = results.data as any[];
        
        // Validate columns
        if (data.length > 0) {
          const firstRow = data[0];
          if (!('studentId' in firstRow)) {
            setUploadMessage({ type: 'error', text: 'Invalid CSV format. Required column: studentId.' });
            return;
          }
          if (uploadType === 'overall' && (!('attendance' in firstRow) || !('testScore' in firstRow))) {
            setUploadMessage({ type: 'error', text: 'Invalid CSV format for Overall. Required columns: studentId, attendance, testScore.' });
            return;
          }
          if (uploadType === 'fee' && (!('feeStatus' in firstRow) || !('overdueDays' in firstRow))) {
            setUploadMessage({ type: 'error', text: 'Invalid CSV format for Fee. Required columns: studentId, feeStatus, overdueDays.' });
            return;
          }
          if (uploadType === 'backlog' && !('backlogCount' in firstRow)) {
            setUploadMessage({ type: 'error', text: 'Invalid CSV format for Backlog. Required columns: studentId, backlogCount.' });
            return;
          }
        } else {
          setUploadMessage({ type: 'error', text: 'The CSV file is empty.' });
          return;
        }

        if (onDataUpload) {
          const res = onDataUpload(data, weekLabel, uploadType);
          if (res.success) {
            setUploadMessage({ type: 'success', text: `Upload successful! ${res.updatedCount} records updated, ${res.skippedCount} skipped.` });
            setUploadedFile(null);
            // Suggest next week
            const currentWeekMatch = weekLabel.match(/\d+/);
            if (currentWeekMatch) {
              setWeekLabel(`Week ${parseInt(currentWeekMatch[0]) + 1}`);
            }
          }
        }
      },
      error: (error: Error) => {
        setIsUploading(false);
        setUploadMessage({ type: 'error', text: `Failed to parse CSV: ${error.message}` });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Stat blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="neo-card p-3.5 md:p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Monitored
            </span>
            <Users className="w-4 h-4 text-[#0D0D0D]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0D0D0D] mt-1 font-mono">
            {totalCount}
          </div>
          <span className="text-[11px] font-bold text-neutral-500">Total active cohort</span>
        </div>

        <div className="neo-card p-3.5 md:p-4 bg-[#D62828] text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-red-100">
              High Risk
            </span>
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white mt-1 font-mono">
            {highRiskCount}
          </div>
          <span className="text-[11px] font-bold text-red-100">Requires immediate contact</span>
        </div>

        <div className="neo-card p-3.5 md:p-4 bg-[#F4C430] text-[#0D0D0D]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-900">
              Active Plans
            </span>
            <Activity className="w-4 h-4 text-[#0D0D0D]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0D0D0D] mt-1 font-mono">
            {activeInterventionsCount}
          </div>
          <span className="text-[11px] font-bold text-neutral-800">Support underway</span>
        </div>

        <div className="neo-card p-3.5 md:p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Avg Cohort Risk
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#2D9D5F]" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-[#0D0D0D] mt-1 font-mono">
            {avgRiskScore}
            <span className="text-sm font-sans font-bold text-neutral-400">/100</span>
          </div>
          <span className="text-[11px] font-bold text-neutral-500">Threshold baseline</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="neo-card p-4 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="student-search-input"
              type="text"
              placeholder="Search by student name, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input w-full pl-9 pr-8 py-2 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#0D0D0D]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                Dept:
              </span>
              <select
                id="dept-filter-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="neo-input py-1.5 px-2.5 text-xs font-bold"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                Year:
              </span>
              <select
                id="year-filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="neo-input py-1.5 px-2.5 text-xs font-bold"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === 'All' ? 'All Years' : `Year ${yr}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                Risk:
              </span>
              <select
                id="risk-filter-select"
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="neo-input py-1.5 px-2.5 text-xs font-bold"
              >
                <option value="All">All Risks</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              id="sort-risk-toggle-btn"
              onClick={() => setSortAscending((prev) => !prev)}
              className="neo-btn px-3 py-1.5 bg-[#0D0D0D] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Toggle Risk Score sorting"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>{sortAscending ? 'Risk: Low → High' : 'Risk: High → Low'}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(selectedDept !== 'All' || selectedYear !== 'All' || selectedRisk !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-[#0D0D0D] text-xs">
            <span className="font-extrabold uppercase tracking-wider text-neutral-500">
              Active Filters:
            </span>
            {searchQuery && (
              <span className="bg-neutral-100 border border-[#0D0D0D] px-2 py-0.5 font-bold">
                "{searchQuery}"
              </span>
            )}
            {selectedDept !== 'All' && (
              <span className="bg-neutral-100 border border-[#0D0D0D] px-2 py-0.5 font-bold">
                Dept: {selectedDept}
              </span>
            )}
            {selectedYear !== 'All' && (
              <span className="bg-neutral-100 border border-[#0D0D0D] px-2 py-0.5 font-bold">
                Year: {selectedYear}
              </span>
            )}
            {selectedRisk !== 'All' && (
              <span className="bg-neutral-100 border border-[#0D0D0D] px-2 py-0.5 font-bold">
                Risk: {selectedRisk}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedYear('All');
                setSelectedRisk('All');
              }}
              className="text-[#D62828] font-black underline ml-auto cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Weekly Data Upload Section */}
      <div className="neo-card p-4 bg-[#F5F1E8] border-2 border-dashed border-[#0D0D0D]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-[#0D0D0D] uppercase tracking-tight flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#D62828]" />
                Weekly Data Upload
              </h3>
              <p className="text-xs font-bold text-neutral-600 mt-1">
                Upload CSV with attendance and test scores to update risk profiles.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="neo-input py-1.5 px-3 text-xs font-bold bg-white"
              >
                <option value="overall">Overall Data</option>
                <option value="fee">Fee Status</option>
                <option value="backlog">Backlogs</option>
                <option value="subject_wise">Subject-wise</option>
              </select>
              <input 
                type="text" 
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                placeholder="e.g. Week 5"
                className="neo-input py-1.5 px-3 text-xs font-bold w-28"
              />
              <label className="neo-btn px-4 py-2 bg-neutral-800 text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 hover:bg-black transition-colors">
                <UploadCloud className="w-4 h-4" />
                <span>{uploadedFile ? 'Change File' : 'Choose CSV'}</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setUploadedFile(e.target.files[0]);
                      setUploadMessage(null);
                    }
                  }}
                />
              </label>
              {uploadedFile && (
                <button 
                  onClick={handleProcessUpload}
                  disabled={isUploading}
                  className="neo-btn px-4 py-2 bg-[#D62828] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* File Selected & Message Feedback */}
          <div className="flex items-center justify-between mt-2">
            <div>
              {uploadedFile && !uploadMessage && (
                <span className="text-xs font-bold text-neutral-800 bg-white px-2 py-1 border border-neutral-300">
                  Ready: {uploadedFile.name}
                </span>
              )}
            </div>
            {uploadMessage && (
              <div className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-2 ${uploadMessage.type === 'success' ? 'bg-[#D4EDDA] text-[#155724] border-[#155724]' : 'bg-[#F8D7DA] text-[#721C24] border-[#721C24]'}`}>
                {uploadMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {uploadMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* Upload History Table */}
        {uploadHistory && uploadHistory.length > 0 && (
          <div className="mt-6 border-t-2 border-[#0D0D0D] pt-4">
            <h4 className="font-black text-xs uppercase tracking-wider text-[#0D0D0D] mb-3">Recent Uploads</h4>
            <div className="bg-white border-2 border-[#0D0D0D] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-[#0D0D0D] font-black uppercase tracking-wider text-neutral-600">
                    <th className="p-2 border-r-2 border-[#0D0D0D]">Week</th>
                    <th className="p-2 border-r-2 border-[#0D0D0D]">Type</th>
                    <th className="p-2 border-r-2 border-[#0D0D0D]">Uploaded On</th>
                    <th className="p-2 border-r-2 border-[#0D0D0D]">Students Updated</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.map((log, idx) => (
                    <tr key={idx} className="border-b border-neutral-200 font-bold">
                      <td className="p-2 border-r-2 border-[#0D0D0D]">{log.week}</td>
                      <td className="p-2 border-r-2 border-[#0D0D0D] capitalize">{log.type.replace('_', ' ')}</td>
                      <td className="p-2 border-r-2 border-[#0D0D0D]">{new Date(log.uploadedAt).toLocaleString()}</td>
                      <td className="p-2 border-r-2 border-[#0D0D0D]">{log.studentsUpdated}</td>
                      <td className="p-2 text-[#2D9D5F] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Success</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Student Data Table (Desktop) & Card List (Mobile) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-[#0D0D0D] flex items-center gap-2">
            <span className="w-3 h-3 bg-[#D62828] inline-block border border-[#0D0D0D]" />
            Flagged Student Cohort ({filteredStudents.length})
          </h2>
          <span className="text-xs font-bold text-neutral-500">
            Click any row to open diagnostic detail
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="neo-card p-10 text-center bg-white">
            <p className="font-black text-lg text-[#0D0D0D]">No students match your criteria.</p>
            <p className="text-xs text-neutral-600 mt-1">
              Try adjusting your search filters or clear the active query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedYear('All');
                setSelectedRisk('All');
              }}
              className="neo-btn px-4 py-2 bg-[#0D0D0D] text-white text-xs mt-4"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block neo-card bg-white overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0D0D0D] text-white font-black text-xs uppercase tracking-wider">
                    <th className="p-3.5 border-r-2 border-neutral-700">ID</th>
                    <th className="p-3.5 border-r-2 border-neutral-700">Student Name</th>
                    <th className="p-3.5 border-r-2 border-neutral-700">Department</th>
                    <th
                      className="p-3.5 border-r-2 border-neutral-700 cursor-pointer hover:bg-neutral-800 select-none"
                      onClick={() => setSortAscending((prev) => !prev)}
                    >
                      <div className="flex items-center gap-1">
                        <span>Risk Score</span>
                        <ArrowDownUp className="w-3 h-3 text-neutral-300" />
                      </div>
                    </th>
                    <th className="p-3.5 border-r-2 border-neutral-700">Risk Level</th>
                    <th className="p-3.5 border-r-2 border-neutral-700">Intervention</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <StudentTableRow
                      key={student.studentId}
                      student={student}
                      onSelect={onSelectStudent}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.studentId}
                  student={student}
                  onSelect={onSelectStudent}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
