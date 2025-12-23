import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserRole } from '../types';
import { api } from '../services/api';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Clock,
  MapPin,
  Camera,
  Save,
  BadgeCheck,
  Shield,
  Globe,
  Award,
  Stethoscope,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type ScheduleDay = {
  dayKey: DayKey;
  active: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
};

export const Profile: React.FC = () => {
  const { t } = useLanguage();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState({
    name: 'Karen Gomes',
    email: 'karen.gomes@psiclinica.com',
    role: UserRole.PSYCHOLOGIST,
    phone: '(11) 99999-8888',
    crp: '06/172315',
    specialty: 'Psicologia Clinica & Neuropsicologia',
    companyName: 'Clinica Mente Saudavel',
    address: 'Av. Paulista, 1000 - Sala 42, Sao Paulo - SP',
    bio: 'Especialista em Terapia Cognitivo-Comportamental com foco em transtornos de ansiedade e desenvolvimento pessoal. Atuo ha mais de 10 anos transformando vidas atraves da psicologia baseada em evidencias.',
    avatarUrl: '',
    clinicLogoUrl: '',
    coverUrl: '',
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { dayKey: 'monday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'friday', active: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'saturday', active: false, start: '09:00', end: '13:00', lunchStart: '', lunchEnd: '' },
    { dayKey: 'sunday', active: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
  ]);


  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.get<any>('/profile/me');
        if (data) {
          setUser(prev => ({
            ...prev,
            name: data.name ?? prev.name,
            email: data.email ?? prev.email,
            role: data.role ?? prev.role,
            phone: data.phone ?? prev.phone,
            crp: data.crp ?? prev.crp,
            specialty: data.specialty ?? prev.specialty,
            companyName: data.company_name ?? data.companyName ?? prev.companyName,
            address: data.address ?? prev.address,
            bio: data.bio ?? prev.bio,
            avatarUrl: data.avatar_url ?? data.avatarUrl ?? prev.avatarUrl,
            clinicLogoUrl: data.clinic_logo_url ?? data.clinicLogoUrl ?? prev.clinicLogoUrl,
            coverUrl: data.cover_url ?? data.coverUrl ?? prev.coverUrl,
          }));
        }

        if (data?.schedule) {
          const scheduleData = typeof data.schedule == 'string' ? JSON.parse(data.schedule) : data.schedule;
          if (Array.isArray(scheduleData)) {
            setSchedule(scheduleData as ScheduleDay[]);
          }
        }
      } catch (err) {
        // keep local state if request fails
      }
    };

    loadProfile();
  }, []);

  const initials = useMemo(() => {
    const parts = user.name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? 'U';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }, [user.name]);



  const pickImage = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Erro ao carregar imagem'));
      reader.readAsDataURL(file);
    });
  };

  const onAvatarPick = async (file?: File | null) => {
    if (!file) return;
    const url = await pickImage(file);
    setUser(prev => ({ ...prev, avatarUrl: url }));
  };

  const onLogoPick = async (file?: File | null) => {
    if (!file) return;
    const url = await pickImage(file);
    setUser(prev => ({ ...prev, clinicLogoUrl: url }));
  };

  const onCoverPick = async (file?: File | null) => {
    if (!file) return;
    const url = await pickImage(file);
    setUser(prev => ({ ...prev, coverUrl: url }));
  };

  const toggleDay = (index: number) => {
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, active: !d.active } : d)));
  };

  const updateDay = (index: number, patch: Partial<ScheduleDay>) => {
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };


  const handleSave = async () => {
    setSaveStatus('saving');

    try {
      await api.put('/profile/me', {
        name: user.name,
        email: user.email,
        phone: user.phone,
        crp: user.crp,
        specialty: user.specialty,
        company_name: user.companyName,
        address: user.address,
        bio: user.bio,
        avatar_url: user.avatarUrl,
        clinic_logo_url: user.clinicLogoUrl,
        cover_url: user.coverUrl,
        schedule,
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      setSaveStatus('idle');
      alert('Nao foi possivel salvar o perfil.');
    }
  };

  return (
    <div className="font-sans overflow-x-hidden">
      {/* HEADER / COVER */}
      <div className="relative w-full">
        <div className="relative h-52 sm:h-56 w-full overflow-hidden">
          {/* cover */}
          <div className="absolute inset-0">
            {user.coverUrl ? (
              <img src={user.coverUrl} alt="cover" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900" />
            )}
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_55%)]" />
          </div>

          <div className="absolute top-3 right-3">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-md border border-white/15 hover:bg-white/15 transition"
            >
              <Camera size={14} />
              {t('profile.changeCover')}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => onCoverPick(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-3 sm:px-5 lg:px-8 -mt-14 sm:-mt-16 pb-24">
        {/* Grid responsivo: no xl vira 2 colunas, no resto 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 sm:gap-6">
          {/* LEFT CARD */}
          <aside className="min-w-0 space-y-5">
            <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="p-5 sm:p-6">
                {/* Avatar + Logo row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="group relative h-20 w-20 sm:h-22 sm:w-22 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm"
                      title={t('profile.changePhoto')}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover group-hover:scale-[1.02] transition" />
                      ) : (
                        <div className="h-full w-full grid place-items-center">
                          <span className="text-xl font-extrabold text-indigo-400">{initials}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                        <Camera className="text-white" size={18} />
                      </div>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => onAvatarPick(e.target.files?.[0])}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base sm:text-lg font-extrabold text-slate-900">
                          {user.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t('profile.online')}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[12px] text-slate-500 font-semibold flex items-center gap-1.5">
                        <Stethoscope size={14} className="text-indigo-500" />
                        <span className="truncate">{user.specialty}</span>
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          CRP {user.crp}
                        </span>
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 inline-flex items-center gap-1">
                          <Award size={12} />
                          {t('profile.premium')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clinic logo */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="group flex-shrink-0 h-14 w-14 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden grid place-items-center hover:border-indigo-200 transition"
                    title={t('profile.clinicLogo')}
                  >
                    {user.clinicLogoUrl ? (
                      <img src={user.clinicLogoUrl} alt="clinic logo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid place-items-center">
                        <ImageIcon size={18} className="text-slate-400 group-hover:text-indigo-500 transition" />
                        <span className="mt-0.5 text-[9px] font-bold text-slate-400">LOGO</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => onLogoPick(e.target.files?.[0])}
                  />
                </div>

                {/* Info blocks */}
                <div className="mt-5 space-y-3">
                  <InfoRow icon={<Mail size={16} />} label={t('profile.professionalEmail')} value={user.email} />
                  <InfoRow icon={<Phone size={16} />} label={t('profile.contact')} value={user.phone} />
                  <InfoRow icon={<MapPin size={16} />} label={t('profile.location')} value={user.address} />
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
            </div>

            {/* Verified */}
            <div className="rounded-3xl bg-slate-950 text-white border border-white/10 shadow-[0_10px_30px_rgba(2,6,23,0.25)] overflow-hidden">
              <div className="p-5 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_55%)]" />
                <div className="relative flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center">
                    <BadgeCheck className="text-emerald-400" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold">{t('profile.verified')}</h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{t('profile.verifiedDesc')}</p>

                    <div className="mt-4 w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-emerald-400 h-1.5 rounded-full w-full shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
                    </div>

                    <p className="mt-2 text-[10px] text-slate-400 text-right">{t('profile.validity')}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT */}
          <main className="min-w-0 space-y-6">
            {/* About */}
            <section className="rounded-3xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center border border-indigo-100">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{t('profile.about')}</h3>
                    <p className="text-[11px] text-slate-500">{t('profile.publicInfo')}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    icon={<Building2 size={16} />}
                    label={t('profile.companyName')}
                    value={user.companyName}
                    onChange={v => setUser(prev => ({ ...prev, companyName: v }))}
                  />
                  <Field
                    icon={<Shield size={16} />}
                    label={t('profile.registry')}
                    value={user.crp}
                    onChange={v => setUser(prev => ({ ...prev, crp: v }))}
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('profile.bio')}
                  </label>
                  <div className="mt-2 relative">
                    <textarea
                      value={user.bio}
                      onChange={e => setUser(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full resize-none rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-[13px] leading-relaxed text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                      rows={5}
                      maxLength={420}
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-slate-100">
                      {user.bio.length}/420
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule */}
            <section className="rounded-3xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center border border-emerald-100">
                      <Clock size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{t('profile.schedule')}</h3>
                      <p className="text-[11px] text-slate-500">{t('profile.scheduleDesc')}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <Globe size={14} />
                    {t('profile.timezone')}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {/* header */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-3">{t('profile.day')}</div>
                    <div className="col-span-5 text-center">{t('profile.workHours')}</div>
                    <div className="col-span-3 text-center">{t('profile.break')}</div>
                    <div className="col-span-1 text-right">{t('profile.status')}</div>
                  </div>

                  {schedule.map((day, index) => (
                    <div
                      key={day.dayKey}
                      className={[
                        'grid grid-cols-12 gap-3 items-center rounded-2xl border px-3 py-3 transition',
                        day.active
                          ? 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                          : 'bg-slate-50 border-transparent opacity-70 grayscale',
                      ].join(' ')}
                    >
                      {/* Day */}
                      <div className="col-span-12 md:col-span-3 flex items-center gap-3 min-w-0">
                        <div className={['h-8 w-1.5 rounded-full', day.active ? 'bg-indigo-500' : 'bg-slate-300'].join(' ')} />
                        <span className="text-[13px] font-extrabold text-slate-800 truncate">
                          {t(`days.${day.dayKey}`)}
                        </span>
                      </div>

                      {/* Work hours */}
                      <div className="col-span-8 md:col-span-5 flex items-center justify-start md:justify-center gap-2">
                        <TimeInput
                          disabled={!day.active}
                          value={day.start}
                          onChange={v => updateDay(index, { start: v })}
                        />
                        <span className="text-slate-300 font-extrabold text-[12px]">{t('profile.to')}</span>
                        <TimeInput
                          disabled={!day.active}
                          value={day.end}
                          onChange={v => updateDay(index, { end: v })}
                        />
                      </div>

                      {/* Lunch */}
                      <div className="col-span-8 md:col-span-3 flex items-center justify-start md:justify-center gap-2">
                        <TimeInput
                          small
                          disabled={!day.active || !day.lunchStart}
                          value={day.lunchStart}
                          onChange={v => updateDay(index, { lunchStart: v })}
                          placeholder="--:--"
                        />
                        <span className="text-slate-300 font-extrabold text-[12px]">-</span>
                        <TimeInput
                          small
                          disabled={!day.active || !day.lunchEnd}
                          value={day.lunchEnd}
                          onChange={v => updateDay(index, { lunchEnd: v })}
                          placeholder="--:--"
                        />
                      </div>

                      {/* Toggle */}
                      <div className="col-span-4 md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggleDay(index)}
                          className={[
                            'h-7 w-12 rounded-full p-1 transition focus:outline-none focus:ring-4 focus:ring-indigo-500/20',
                            day.active ? 'bg-indigo-600' : 'bg-slate-300',
                          ].join(' ')}
                          aria-label="toggle day"
                        >
                          <div
                            className={[
                              'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                              day.active ? 'translate-x-5' : 'translate-x-0',
                            ].join(' ')}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* bottom spacer (bar fixed) */}
            <div className="h-2" />
          </main>
        </div>
      </div>

      {/* SAVE BAR (fixa e bonita) */}
      <div className="fixed bottom-3 left-0 right-0 z-30 px-3 sm:px-5">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,42,0.14)] px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold text-slate-900 truncate">
                {t('profile.about')}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {saveStatus === 'saved' ? t('profile.saved') : t('profile.publicInfo')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={[
                'inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-[12px] font-extrabold transition',
                'border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700',
                'disabled:opacity-70 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              <Save size={16} />
              {saveStatus === 'saving'
                ? t('profile.saving') ?? 'Salvando...'
                : saveStatus === 'saved'
                  ? t('profile.saved')
                  : t('profile.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Small components ---------- */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-white hover:border-indigo-200 transition">
      <div className="h-9 w-9 rounded-2xl bg-white border border-slate-100 shadow-sm grid place-items-center text-indigo-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="group">
      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider group-focus-within:text-indigo-600 transition">
        {label}
      </label>
      <div className="mt-2 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition">
          {icon}
        </div>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-10 pr-3 py-2.5 text-[13px] font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
        />
      </div>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  disabled,
  small,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  small?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={[
        'rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-extrabold focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition',
        small ? 'w-[86px] px-2 py-1.5 text-[12px]' : 'w-[110px] px-3 py-2 text-[13px]',
        'disabled:bg-transparent disabled:border-transparent disabled:text-slate-400',
      ].join(' ')}
    />
  );
}
