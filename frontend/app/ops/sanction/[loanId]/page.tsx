'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { inr, inrPrecise, fmtDate, maskPan } from '@/lib/formatters';
import { ChevronLeft, Sparkles, RotateCw, FileText, CheckCircle2, XCircle, Download } from 'lucide-react';

function riskBadge(s?: string) {
  if (!s) return { level: 'PENDING', cls: 'bg-slate-500/15 text-slate-400' };
  const m = s.match(/risk level:\s*(low|medium|high)/i);
  const lvl = m ? m[1].toUpperCase() : 'PENDING';
  const cls = lvl === 'LOW' ? 'bg-emerald-500/15 text-emerald-400' : lvl === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' : lvl === 'HIGH' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/15 text-slate-400';
  return { level: lvl, cls };
}

export default function SanctionReview() {
  const params = useParams<{ loanId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['sanction', 'admin'] });
  const [data, setData] = useState<any>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (user) api.get(`/api/sanction/queue/${params.loanId}`).then((r) => setData(r.data.loan));
  }, [user, params.loanId]);

  if (loading || !user) return null;
  if (!data) return <div className="text-slate-400">Loading…</div>;
  const risk = riskBadge(data.aiRiskSummary);

  async function regenAI() {
    setRegenerating(true);
    try {
      const r = await api.post(`/api/sanction/regenerate-ai/${params.loanId}`);
      setData({ ...data, aiRiskSummary: r.data.aiRiskSummary });
      toast.success('AI analysis refreshed');
    } catch { toast.error('Failed'); } finally { setRegenerating(false); }
  }

  async function approve() {
    if (!confirm('Approve this loan?')) return;
    setBusy(true);
    try {
      await api.post(`/api/sanction/approve/${params.loanId}`);
      toast.success('Loan approved');
      router.push('/ops/sanction');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  }

  async function reject() {
    if (!rejectReason.trim()) { toast.error('Reason required'); return; }
    setBusy(true);
    try {
      await api.post(`/api/sanction/reject/${params.loanId}`, { rejectionReason: rejectReason });
      toast.success('Loan rejected');
      router.push('/ops/sanction');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Link href="/ops/sanction" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400 mb-6"><ChevronLeft className="w-4 h-4" /> Back to queue</Link>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Loan Review</div>
          <h1 className="text-3xl font-semibold mt-1 font-mono">{data.loanId}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={approve} disabled={busy} className="btn-primary inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approve</button>
          <button onClick={() => setShowReject(true)} disabled={busy} className="btn-danger inline-flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-glass p-6 space-y-4">
          <h3 className="text-sm uppercase text-slate-400">Borrower</h3>
          <div className="text-lg font-semibold">{data.borrower?.profile?.fullName}</div>
          <div className="text-xs text-slate-400">{data.borrower?.email}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-slate-400">PAN</div><div className="font-mono">{maskPan(data.borrower?.profile?.pan)}</div></div>
            <div><div className="text-xs text-slate-400">DOB</div><div>{fmtDate(data.borrower?.profile?.dateOfBirth)}</div></div>
            <div><div className="text-xs text-slate-400">Employment</div><div className="capitalize">{data.borrower?.profile?.employmentMode}</div></div>
            <div><div className="text-xs text-slate-400">Salary</div><div className="font-mono">₹{data.borrower?.profile?.monthlySalary?.toLocaleString('en-IN')}</div></div>
          </div>
          {data.salarySlipDocument && (
            <div className="pt-3 border-t border-white/5">
              <a href={data.salarySlipDocument.presignedUrl} target="_blank" rel="noopener" className="card-glass p-3 flex items-center gap-2 text-sm hover:border-emerald-500/30">
                <FileText className="w-4 h-4 text-emerald-400" /> View salary slip
              </a>
              {data.salarySlipDocument.detectedSalary && (
                <div className="mt-3 text-xs text-slate-400">
                  Textract detected salary: <span className="font-mono text-emerald-400">₹{Number(data.salarySlipDocument.detectedSalary).toLocaleString('en-IN')}</span> · Confidence {Number(data.salarySlipDocument.textractConfidence || 0).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-glass p-6 space-y-4">
          <h3 className="text-sm uppercase text-slate-400">Loan Details</h3>
          <div className="space-y-3">
            <Row k="Principal" v={inr(data.principalAmount)} />
            <Row k="Tenure" v={`${data.tenureDays} days`} />
            <Row k="Interest Rate" v={`${data.interestRate}% p.a.`} />
            <Row k="Simple Interest" v={inrPrecise(data.simpleInterest)} />
            <div className="pt-2 border-t border-white/5">
              <Row k="Total Repayment" v={inrPrecise(data.totalRepayment)} highlight />
            </div>
            <Row k="Applied On" v={fmtDate(data.appliedAt)} />
          </div>
        </div>

        <div className="card-glass p-6 space-y-4 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase text-slate-400 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /> AI Risk Analysis</h3>
            <button onClick={regenAI} disabled={regenerating} className="text-xs text-emerald-400 inline-flex items-center gap-1"><RotateCw className={'w-3 h-3 ' + (regenerating ? 'animate-spin' : '')} /> Regenerate</button>
          </div>
          <div>
            <span className={'badge ' + risk.cls}>{risk.level} RISK</span>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {data.aiRiskSummary || 'Generating AI analysis…'}
          </div>
          <div className="text-xs text-slate-500">Powered by AWS Bedrock (Claude 3 Haiku)</div>
        </div>
      </div>

      {showReject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-glass max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-3">Reject loan</h2>
            <p className="text-sm text-slate-400 mb-4">This action is final. Provide a clear reason.</p>
            <textarea className="input-base h-32" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g., DTI too high, suspicious documents..." />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowReject(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={reject} disabled={busy} className="btn-danger flex-1">Confirm reject</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{k}</span>
      <span className={'font-mono ' + (highlight ? 'text-emerald-400 text-lg' : '')}>{v}</span>
    </div>
  );
}
