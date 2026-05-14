'use client';
import { useEffect, useState, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BorrowerNav from '@/components/BorrowerNav';
import Stepper from '@/components/Stepper';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle, Briefcase, User, GraduationCap } from 'lucide-react';

const employmentOptions = [
  { value: 'salaried', label: 'Salaried', icon: Briefcase, desc: 'Full-time employed' },
  { value: 'self-employed', label: 'Self-Employed', icon: User, desc: 'Business / freelance' },
  { value: 'unemployed', label: 'Unemployed', icon: GraduationCap, desc: 'Currently not working' },
];

function checkBRE(form: any) {
  const reasons: { rule: string; ok: boolean; msg: string }[] = [];
  const dob = form.dateOfBirth ? new Date(form.dateOfBirth) : null;
  let age = 0;
  if (dob) {
    age = new Date().getFullYear() - dob.getFullYear();
    if (new Date().getMonth() < dob.getMonth() || (new Date().getMonth() === dob.getMonth() && new Date().getDate() < dob.getDate())) age--;
  }
  reasons.push({ rule: 'Age', ok: !!dob && age >= 23 && age <= 50, msg: dob ? `Age ${age} — ${age >= 23 && age <= 50 ? 'eligible' : 'must be 23-50'}` : 'Enter DOB' });
  const salary = Number(form.monthlySalary);
  reasons.push({ rule: 'Salary', ok: salary >= 25000, msg: salary ? (salary >= 25000 ? `₹${salary.toLocaleString('en-IN')} OK` : `Min ₹25,000`) : 'Enter salary' });
  const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan || '');
  reasons.push({ rule: 'PAN format', ok: panOk, msg: form.pan ? (panOk ? 'Valid' : 'Format: ABCDE1234F') : 'Enter PAN' });
  reasons.push({ rule: 'Employment', ok: form.employmentMode && form.employmentMode !== 'unemployed', msg: form.employmentMode === 'unemployed' ? 'Not eligible' : form.employmentMode ? 'OK' : 'Select mode' });
  return reasons;
}

export default function PersonalDetails() {
  const router = useRouter();
  const { user, loading } = useAuth({ redirectTo: '/login', requireRoles: ['borrower'] });
  const [form, setForm] = useState({ fullName: '', pan: '', dateOfBirth: '', monthlySalary: '', employmentMode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);

  useEffect(() => {
    if (user?.profile?.fullName) {
      setForm({
        fullName: user.profile.fullName,
        pan: user.profile.pan,
        dateOfBirth: user.profile.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
        monthlySalary: String(user.profile.monthlySalary || ''),
        employmentMode: user.profile.employmentMode || '',
      });
    }
  }, [user]);

  const bre = useMemo(() => checkBRE(form), [form]);
  const allPass = bre.every((b) => b.ok);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors(null);
    setSubmitting(true);
    try {
      await api.post('/api/borrower/profile', { ...form, monthlySalary: Number(form.monthlySalary) });
      toast.success('Profile saved');
      router.push('/apply/upload-documents');
    } catch (err: any) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.rejectionReasons || []);
        toast.error('Eligibility check failed');
      } else {
        toast.error(err.response?.data?.error || 'Could not save');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <BorrowerNav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Stepper active={0} />
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="lg:col-span-2 card-glass p-8 space-y-5">
            <h2 className="text-2xl font-semibold">Personal Details</h2>
            <p className="text-sm text-slate-400">All fields are required. Validation runs on every keystroke.</p>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Full Name</label>
              <input className="input-base" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">PAN</label>
                <input className="input-base font-mono uppercase" required maxLength={10} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Date of Birth</label>
                <input type="date" className="input-base" required value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Monthly Salary (₹)</label>
              <input type="number" className="input-base font-mono" required value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} placeholder="25000" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Employment Mode</label>
              <div className="grid sm:grid-cols-3 gap-3">
                {employmentOptions.map((opt) => {
                  const active = form.employmentMode === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, employmentMode: opt.value })}
                      className={'p-4 rounded-xl border text-left transition-all ' + (active ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/20')}
                    >
                      <Icon className={'w-5 h-5 mb-2 ' + (active ? 'text-emerald-400' : 'text-slate-400')} />
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {errors && errors.length > 0 && (
              <div className="card-glass p-4 border-rose-500/30 bg-rose-500/5">
                <div className="font-medium text-rose-400 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Your application cannot proceed</div>
                <ul className="space-y-1 text-sm">
                  {errors.map((e, i) => (
                    <li key={i} className="flex gap-2 text-slate-300"><XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <button disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Saving…' : 'Save & Continue'}
            </button>
          </motion.form>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Live eligibility</div>
            <div className="space-y-3">
              {bre.map((b) => (
                <div key={b.rule} className="flex items-start gap-3">
                  {b.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{b.rule}</div>
                    <div className="text-xs text-slate-400">{b.msg}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={'mt-5 p-3 rounded-xl text-sm ' + (allPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
              {allPass ? '✓ All checks pass — server will re-validate' : 'Complete all fields to proceed'}
            </div>
          </motion.aside>
        </div>
      </main>
    </>
  );
}
