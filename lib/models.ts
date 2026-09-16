import mongoose from 'mongoose';

// Ensure models aren't redefined upon hot reloads
const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: Number, required: true },
  
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  interventionStatus: { type: String, enum: ['None', 'Active', 'Resolved'], default: 'None' },
  
  // Detailed Data
  attendanceHistory: [{
    week: String,
    percentage: Number
  }],
  gradeHistory: [{
    test: String,
    score: Number
  }],
  contributingFactors: [{
    factor: String,
    points: Number,
    reason: String
  }],
  suggestedAction: { type: String },
  aiExplanation: { type: String },

  // Currently Active Intervention (nested inside student for easy querying)
  activeIntervention: {
    type: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['Active', 'Resolved', 'Discontinued'] },
    assignedDate: { type: String }
  }
}, { timestamps: true });

export const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

const UploadHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  fileName: { type: String, required: true },
  recordsProcessed: { type: Number, required: true },
  uploadType: { type: String, required: true }
}, { timestamps: true });

export const UploadHistory = mongoose.models.UploadHistory || mongoose.model('UploadHistory', UploadHistorySchema);

const OutcomeSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  name: { type: String, required: true },
  intervention: {
    type: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    startDate: { type: String }
  },
  baselineScore: { type: Number },
  currentScore: { type: Number },
  scoreDelta: { type: Number },
  outcome: { type: String },
  checkpointDate: { type: String }
}, { timestamps: true });

export const Outcome = mongoose.models.Outcome || mongoose.model('Outcome', OutcomeSchema);
