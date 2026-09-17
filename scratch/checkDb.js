const mongoose = require('mongoose');

const UploadHistorySchema = new mongoose.Schema({
  id: { type: String },
  week: { type: String, required: true },
  type: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  studentsUpdated: { type: Number, required: true },
  uploadedBy: { type: String, required: true },
  rawData: { type: mongoose.Schema.Types.Mixed },
  fileName: { type: String }
}, { timestamps: true });

const UploadHistory = mongoose.models.UploadHistory || mongoose.model('UploadHistory', UploadHistorySchema);

async function check() {
  await mongoose.connect('mongodb+srv://ad1tya44:70zlQRW5TmAXG0Ab@cluster0.sbbmscf.mongodb.net/earlyalert?appName=Cluster0');
  const data = await UploadHistory.find({}).lean();
  console.log('MongoDB records found:', data.length);
  console.log(data);
  process.exit(0);
}

check();
