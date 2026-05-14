'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import BorrowerNav from '@/components/BorrowerNav';
import Stepper from '@/components/Stepper';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { UploadCloud, FileText, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

export default function UploadDocs() {
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/api/borrower/latest-document').then((r) => {
        if (r.data.document) setUploaded(r.data.document);
      });
    }
  }, [user]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/borrower/upload-salary-slip', formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setUploaded(res.data.document);
      toast.success('Salary slip uploaded');
      // Refresh after a moment so textract result lands
      setTimeout(() => {
        api.get('/api/borrower/latest-document').then((r) => r.data.document && setUploaded(r.data.document));
      }, 4000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <BorrowerNav />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Stepper active={1} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Upload Salary Slip</h2>
            <p className="text-sm text-slate-400 mt-1">PDF, JPG, or PNG. Maximum 5MB. We&apos;ll auto-parse it using AWS Textract.</p>
          </div>

          {!uploaded && (
            <div
              {...getRootProps()}
              className={'p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ' + (isDragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20')}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
              <div className="font-medium">{file ? file.name : 'Drag & drop your salary slip here'}</div>
              <div className="text-sm text-slate-400 mt-1">or click to browse</div>
              {file && <div className="text-xs text-slate-500 mt-2">{(file.size / 1024).toFixed(0)} KB</div>}
            </div>
          )}

          {file && !uploaded && (
            <div>
              <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full">
                {uploading ? `Uploading… ${progress}%` : 'Upload to Credivo'}
              </button>
              {uploading && (
                <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}

          {uploaded && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="card-glass p-5 border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-emerald-400">Salary slip uploaded successfully</div>
                  <div className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {uploaded.originalFilename}
                  </div>
                </div>
              </div>

              <div className="card-glass p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Textract Analysis
                </div>
                {uploaded.textractStatus === 'completed' ? (
                  <div className="space-y-2 text-sm">
                    {uploaded.detectedSalary && (
                      <div>Detected salary: <span className="font-mono text-emerald-400">₹{Number(uploaded.detectedSalary).toLocaleString('en-IN')}</span></div>
                    )}
                    {uploaded.textractConfidence != null && (
                      <div>Confidence: <span className="font-mono">{Number(uploaded.textractConfidence).toFixed(1)}%</span></div>
                    )}
                    {uploaded.extractedText && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-500">View extracted text</summary>
                        <pre className="mt-2 text-xs bg-black/30 p-3 rounded-lg whitespace-pre-wrap text-slate-300 max-h-48 overflow-auto">{uploaded.extractedText.substring(0, 1000)}</pre>
                      </details>
                    )}
                  </div>
                ) : uploaded.textractStatus === 'failed' ? (
                  <div className="text-sm text-amber-400">Could not auto-parse this document — your application will still proceed for manual review.</div>
                ) : (
                  <div className="text-sm text-slate-400">Analysis in progress… <span className="inline-block animate-pulse">●</span></div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setUploaded(null); setFile(null); }} className="btn-secondary text-sm">Re-upload</button>
                <button onClick={() => router.push('/apply/loan-config')} className="btn-primary inline-flex items-center gap-2 ml-auto">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </>
  );
}
