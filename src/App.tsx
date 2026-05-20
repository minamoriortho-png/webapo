import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Menu,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  User,
  UserPlus,
  Users,
} from 'lucide-react';

type AppointmentType = {
  id: number;
  name: string;
  duration: number;
  visible: boolean;
  web: boolean;
};

type ChairAppointment = {
  chair: string;
  start: string;
  span: number;
  name: string;
  type: string;
  memo: string;
  status: '予約確定' | '来院済み' | '要連絡';
};

type Patient = {
  id: number;
  patientCode: string;
  name: string;
  kana: string;
  phone: string;
  status: string;
};

type Holiday = {
  id: number;
  date: string;
  reason: string;
};

type ShiftRow = {
  id: number;
  name: string;
  am: boolean;
  pm: boolean;
};

type WeekDay = {
  date: string;
  label: string;
  weekday: string;
  dayOfWeek: number;
};

const initialTypes: AppointmentType[] = [
  { id: 1, name: '初診相談', duration: 60, visible: true, web: true },
  { id: 2, name: '検査', duration: 60, visible: true, web: true },
  { id: 3, name: '診断', duration: 30, visible: true, web: true },
  { id: 4, name: '調整', duration: 30, visible: true, web: true },
  { id: 5, name: '装置装着', duration: 60, visible: true, web: true },
  { id: 6, name: '装置除去', duration: 60, visible: true, web: true },
  { id: 7, name: '保定観察', duration: 30, visible: true, web: true },
  { id: 8, name: '急患', duration: 30, visible: true, web: true },
];

const chairs = ['チェア1', 'チェア2', '初診', 'SOS&初診小児用'];

const timeline = [
  '9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45', '18:00',
];

const chairAppointments: ChairAppointment[] = [
  { chair: 'チェア1', start: '10:00', span: 4, name: '山田 花子', type: '調整', memo: 'ワイヤー交換', status: '予約確定' },
  { chair: 'チェア1', start: '11:30', span: 2, name: '佐藤 太郎', type: '保定観察', memo: 'リテーナー確認', status: '来院済み' },
  { chair: 'チェア2', start: '14:00', span: 4, name: '田中 美咲', type: '検査', memo: '資料採得', status: '要連絡' },
  { chair: '初診', start: '10:30', span: 4, name: '中村 葵', type: '初診相談', memo: '小児相談', status: '予約確定' },
  { chair: 'SOS&初診小児用', start: '16:00', span: 4, name: '鈴木 一郎', type: '装置装着', memo: '上顎装置', status: '予約確定' },
];

const patientDatabase: Patient[] = [
  { id: 1, patientCode: '000123', name: '山田 花子', kana: 'やまだ はなこ', phone: '090-1234-5678', status: '治療中' },
  { id: 2, patientCode: '000124', name: '佐藤 太郎', kana: 'さとう たろう', phone: '080-2222-3333', status: '保定中' },
  { id: 3, patientCode: '000125', name: '田中 美咲', kana: 'たなか みさき', phone: '090-9999-1111', status: '検査後' },
  { id: 4, patientCode: '000126', name: '中村 葵', kana: 'なかむら あおい', phone: '070-5555-8888', status: '初診予定' },
  { id: 5, patientCode: '000127', name: '鈴木 一郎', kana: 'すずき いちろう', phone: '090-4444-7777', status: '治療中' },
];

const basePatientWeekStart = '2026-05-18';
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

function addDays(dateString: string, days: number): Date {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPatientWeekDates(weekOffset: number): WeekDay[] {
  const startDate = addDays(basePatientWeekStart, weekOffset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(toDateString(startDate), index);
    return {
      date: toDateString(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: weekdays[date.getDay()],
      dayOfWeek: date.getDay(),
    };
  });
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/[\s\-ー−―‐]/g, '');
}

function getAvailableTimes({
  date,
  dayOfWeek,
  durationMinutes,
  regularClosedDays,
  specialClosedDates,
  clinicOpenTime = '9:00',
  clinicCloseTime = '18:00',
  existingAppointments = chairAppointments,
}: {
  date: string;
  dayOfWeek: number;
  durationMinutes: number;
  regularClosedDays: number[];
  specialClosedDates: Holiday[];
  clinicOpenTime?: string;
  clinicCloseTime?: string;
  existingAppointments?: ChairAppointment[];
}): string[] {
  // 判定順：定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き
  if (regularClosedDays.includes(dayOfWeek)) return [];
  if (specialClosedDates.some((holiday) => holiday.date === date)) return [];

  const openMinutes = timeToMinutes(clinicOpenTime);
  const closeMinutes = timeToMinutes(clinicCloseTime);
  const slotUnitMinutes = 15;
  const candidates: string[] = [];

  for (let start = openMinutes; start + durationMinutes <= closeMinutes; start += slotUnitMinutes) {
    const end = start + durationMinutes;
    const overlapsExistingAppointment = existingAppointments.some((appointment) => {
      const appointmentStart = timeToMinutes(appointment.start);
      const appointmentEnd = appointmentStart + appointment.span * slotUnitMinutes;
      return start < appointmentEnd && end > appointmentStart;
    });
    if (!overlapsExistingAppointment) candidates.push(minutesToTime(start));
  }
  return candidates;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm border border-slate-100 ${className}`}>{children}</div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{children}</span>;
}

function MiniCalendar({ regularClosedDays, specialClosedDates }: { regularClosedDays: number[]; specialClosedDates: string[] }) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const cells = [
    { d: 26, date: '2026-04-26', dow: 0, muted: true }, { d: 27, date: '2026-04-27', dow: 1, muted: true }, { d: 28, date: '2026-04-28', dow: 2, muted: true }, { d: 29, date: '2026-04-29', dow: 3, muted: true }, { d: 30, date: '2026-04-30', dow: 4, muted: true },
    { d: 1, date: '2026-05-01', dow: 5 }, { d: 2, date: '2026-05-02', dow: 6 }, { d: 3, date: '2026-05-03', dow: 0 }, { d: 4, date: '2026-05-04', dow: 1 }, { d: 5, date: '2026-05-05', dow: 2 }, { d: 6, date: '2026-05-06', dow: 3 }, { d: 7, date: '2026-05-07', dow: 4 }, { d: 8, date: '2026-05-08', dow: 5 }, { d: 9, date: '2026-05-09', dow: 6 },
    { d: 10, date: '2026-05-10', dow: 0 }, { d: 11, date: '2026-05-11', dow: 1 }, { d: 12, date: '2026-05-12', dow: 2 }, { d: 13, date: '2026-05-13', dow: 3 }, { d: 14, date: '2026-05-14', dow: 4 }, { d: 15, date: '2026-05-15', dow: 5 }, { d: 16, date: '2026-05-16', dow: 6 },
    { d: 17, date: '2026-05-17', dow: 0 }, { d: 18, date: '2026-05-18', dow: 1 }, { d: 19, date: '2026-05-19', dow: 2 }, { d: 20, date: '2026-05-20', dow: 3 }, { d: 21, date: '2026-05-21', dow: 4 }, { d: 22, date: '2026-05-22', dow: 5 }, { d: 23, date: '2026-05-23', dow: 6 },
    { d: 24, date: '2026-05-24', dow: 0 }, { d: 25, date: '2026-05-25', dow: 1 }, { d: 26, date: '2026-05-26', dow: 2 }, { d: 27, date: '2026-05-27', dow: 3 }, { d: 28, date: '2026-05-28', dow: 4 }, { d: 29, date: '2026-05-29', dow: 5 }, { d: 30, date: '2026-05-30', dow: 6 },
    { d: 31, date: '2026-05-31', dow: 0 }, { d: 1, date: '2026-06-01', dow: 1, muted: true }, { d: 2, date: '2026-06-02', dow: 2, muted: true }, { d: 3, date: '2026-06-03', dow: 3, muted: true }, { d: 4, date: '2026-06-04', dow: 4, muted: true }, { d: 5, date: '2026-06-05', dow: 5, muted: true }, { d: 6, date: '2026-06-06', dow: 6, muted: true },
  ];

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <button className="rounded px-1 hover:bg-slate-100">«</button>
        <span>2026年5月</span>
        <button className="rounded px-1 hover:bg-slate-100">»</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
        {days.map((d) => <div key={d} className="py-1">{d}</div>)}
        {cells.map((cell, i) => {
          const isToday = cell.date === '2026-05-13';
          const isSelected = cell.date === '2026-05-20';
          const isClosed = regularClosedDays.includes(cell.dow) || specialClosedDates.includes(cell.date);
          return (
            <div
              key={`${cell.date}-${i}`}
              className={`h-8 rounded-sm pt-1 text-xs ${cell.muted ? 'text-slate-400' : 'text-slate-700'} ${isClosed ? 'bg-rose-100 text-rose-600' : 'bg-sky-50'} ${isToday ? 'bg-teal-500 text-white' : ''} ${isSelected ? 'bg-yellow-200 text-slate-900 ring-1 ring-yellow-500' : ''}`}
            >
              {cell.d}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 text-[10px]"><span className="rounded bg-rose-100 px-2 py-1 text-rose-700">休診</span><span className="rounded bg-sky-50 px-2 py-1 text-sky-700">診療</span></div>
    </div>
  );
}

function AppointmentBlock({ appt }: { appt: ChairAppointment }) {
  const colors: Record<ChairAppointment['status'], string> = {
    予約確定: 'bg-sky-100 border-sky-300 text-sky-900',
    来院済み: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    要連絡: 'bg-amber-100 border-amber-300 text-amber-900',
  };
  return (
    <div className={`absolute left-1 right-1 z-10 rounded border px-2 py-1 text-[11px] shadow-sm ${colors[appt.status]}`} style={{ height: `${appt.span * 40 - 6}px` }}>
      <div className="font-bold leading-tight">{appt.name}</div>
      <div className="leading-tight">{appt.type}</div>
      <div className="mt-1 truncate text-[10px] opacity-80">{appt.memo}</div>
    </div>
  );
}

function ChairCalendarGrid() {
  return (
    <div className="overflow-hidden border border-slate-400 bg-white">
      <div className="grid" style={{ gridTemplateColumns: `58px repeat(${chairs.length}, minmax(180px, 1fr))` }}>
        <div className="sticky top-0 z-20 border-r border-slate-500 bg-slate-50" />
        {chairs.map((chair) => (
          <div key={chair} className="sticky top-0 z-20 border-r border-slate-500 bg-cyan-50 px-3 py-2 text-center text-sm font-bold">{chair}</div>
        ))}
      </div>
      <div className="max-h-[680px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `58px repeat(${chairs.length}, minmax(180px, 1fr))` }}>
          {timeline.map((time, row) => (
            <div key={time} className="contents">
              <div className={`h-10 border-r border-slate-500 pr-1 pt-1 text-right text-xs ${time.endsWith(':00') ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{time}</div>
              {chairs.map((chair) => {
                const appt = chairAppointments.find((a) => a.chair === chair && a.start === time);
                const hiddenBySpan = chairAppointments.some((a) => {
                  if (a.chair !== chair || a.start === time) return false;
                  const startIndex = timeline.indexOf(a.start);
                  return row > startIndex && row < startIndex + a.span;
                });
                return (
                  <div key={`${chair}-${time}`} className={`relative h-10 border-r border-slate-500 ${time.endsWith(':00') ? 'border-t border-t-slate-500' : 'border-t border-dashed border-t-slate-400'} bg-zinc-200`}>
                    {!hiddenBySpan && appt && <AppointmentBlock appt={appt} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'admin' | 'patient'>('admin');
  const [patientMode, setPatientMode] = useState<'new' | 'existing' | null>(null);
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<AppointmentType[]>(initialTypes);
  const [selectedType, setSelectedType] = useState<AppointmentType>(initialTypes[0]);
  const [selectedDate, setSelectedDate] = useState('2026-05-20');
  const [selectedTime, setSelectedTime] = useState('10:30');
  const [weekOffset, setWeekOffset] = useState(0);
  const [status, setStatus] = useState('予約確定');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'reservationTypes' | 'web' | 'shift' | 'holidays'>('reservationTypes');
  const [webBookingEnabled, setWebBookingEnabled] = useState(true);
  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([
    { id: 1, name: '院長', am: true, pm: true },
    { id: 2, name: 'スタッフA', am: true, pm: false },
  ]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [regularClosedDays, setRegularClosedDays] = useState<number[]>([0, 4]);
  const [specialClosedDates, setSpecialClosedDates] = useState<Holiday[]>([
    { id: 1, date: '2026-05-21', reason: '定休日' },
    { id: 2, date: '2026-05-28', reason: '午後休診' },
    { id: 3, date: '2026-06-03', reason: '臨時休診' },
  ]);

  const patientSearchResults = useMemo(() => {
    const keyword = normalizeSearchText(patientSearch);
    if (!keyword) return [];
    return patientDatabase.filter((patient) => {
      const phone = normalizeSearchText(patient.phone);
      const name = normalizeSearchText(patient.name);
      const kana = normalizeSearchText(patient.kana);
      const codeWithoutZero = patient.patientCode.replace(/^0+/, '');
      const keywordWithoutZero = keyword.replace(/^0+/, '');
      return name.includes(keyword) || kana.includes(keyword) || patient.patientCode.includes(keyword) || codeWithoutZero.includes(keywordWithoutZero) || phone.includes(keyword);
    });
  }, [patientSearch]);

  const visibleTypes = useMemo(() => {
    const base = types.filter((t) => t.visible && t.web);
    if (patientMode === 'new') return base.filter((t) => t.name === '初診相談');
    if (patientMode === 'existing') return base.filter((t) => t.name !== '初診相談');
    return base;
  }, [types, patientMode]);

  const displayedWeekDates = useMemo(() => getPatientWeekDates(weekOffset), [weekOffset]);

  const computedAvailableTimesByDate = useMemo(() => displayedWeekDates.map((day) => ({
    ...day,
    times: getAvailableTimes({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      durationMinutes: selectedType.duration,
      regularClosedDays,
      specialClosedDates,
    }),
  })), [displayedWeekDates, selectedType.duration, regularClosedDays, specialClosedDates]);

  const addType = () => {
    setTypes((prev) => [...prev, { id: Date.now(), name: '新しい予約項目', duration: 30, visible: true, web: true }]);
  };

  const updateDuration = (id: number, duration: string | number) => {
    const nextDuration = Number(duration);
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, duration: nextDuration } : t)));
    if (selectedType.id === id) setSelectedType((prev) => ({ ...prev, duration: nextDuration }));
  };

  const toggleVisible = (id: number) => {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)));
  };

  const regularHolidayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-300 bg-white">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-bold text-slate-500">Apotool風 予約MVP</div>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {['診療カレンダー', 'イベント', '来院状況', '患者管理', 'クリニックデータ'].map((n) => (
                <button key={n} className="border-l border-slate-200 px-4 py-3 hover:bg-slate-50">{n}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setView('patient')} className={`rounded px-3 py-1 ${view === 'patient' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100'}`}>患者側</button>
            <button onClick={() => setView('admin')} className={`rounded px-3 py-1 ${view === 'admin' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100'}`}>管理画面</button>
            <button onClick={() => setSettingsOpen(true)} className="ml-2 flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 font-bold hover:bg-slate-50"><Settings size={16} /> 設定</button>
            <span className="font-bold">のばた矯正歯科</span>
          </div>
        </div>
      </header>

      {view === 'patient' ? (
        <div className="mx-auto max-w-6xl p-4">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Card className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Web予約</h2>
                  <p className="text-sm text-slate-500">予約種別を選び、空き時間から予約できます。</p>
                </div>
                <Pill>{step === 0 ? '入口選択' : `Step ${step} / 5`}</Pill>
              </div>
              <div className="mb-6 grid grid-cols-6 gap-2">
                {['入口', '種別', '日時', '入力', '確認', '完了'].map((label, i) => (
                  <div key={label} className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${step >= i ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'}`}>{label}</div>
                ))}
              </div>

              {step === 0 && (
                <div>
                  <h3 className="mb-2 text-lg font-bold">ご予約の入口を選択してください</h3>
                  <p className="mb-5 text-sm text-slate-500">初めての方と、すでに当院に通われている方で入口を分けています。</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button onClick={() => { setPatientMode('new'); setSelectedType(types.find((t) => t.name === '初診相談') || types[0]); setStep(1); }} className="rounded-3xl border-2 border-sky-100 bg-white p-6 text-left shadow-sm hover:border-sky-400 hover:bg-sky-50">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><UserPlus size={26} /></div>
                      <div className="text-xl font-bold">初めての方</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">初診相談をご希望の方はこちら。</p>
                    </button>
                    <button onClick={() => { setPatientMode('existing'); setSelectedType(types.find((t) => t.name === '調整') || types[0]); setStep(1); }} className="rounded-3xl border-2 border-emerald-100 bg-white p-6 text-left shadow-sm hover:border-emerald-400 hover:bg-emerald-50">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Users size={26} /></div>
                      <div className="text-xl font-bold">当院に通われている方</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">調整・保定観察・急患などはこちら。</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">予約種別を選択してください</h3>
                      <p className="text-sm text-slate-500">{patientMode === 'new' ? '初めての方は初診相談のみ選択できます。' : '当院に通われている方が選択できる予約内容です。'}</p>
                    </div>
                    <button onClick={() => { setPatientMode(null); setStep(0); }} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">入口を変更</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleTypes.map((type) => (
                      <button key={type.id} onClick={() => setSelectedType(type)} className={`rounded-2xl border p-4 text-left hover:border-sky-300 hover:bg-sky-50 ${selectedType.id === type.id ? 'border-sky-400 bg-sky-50' : 'border-slate-100 bg-white'}`}>
                        <div className="flex items-center justify-between"><span className="font-bold">{type.name}</span><span className="text-sm text-slate-500">{type.duration}分</span></div>
                        <p className="mt-2 text-sm text-slate-500">処置時間に応じて、連続した空き枠のみ表示します。</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="mb-1 text-lg font-bold">日時を選択してください</h3>
                  <p className="mb-4 text-sm text-slate-500">選択中：{selectedType.name}（{selectedType.duration}分）</p>
                  <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2 font-semibold">
                      <span className="flex items-center gap-2"><CalendarDays size={18} /> 1週間分の空き枠</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setWeekOffset((prev) => prev - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">前の週</button>
                        <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-slate-500">{displayedWeekDates[0].label}〜{displayedWeekDates[6].label}</span>
                        <button onClick={() => setWeekOffset((prev) => prev + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">次の週</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[760px] grid-cols-7 gap-2">
                        {computedAvailableTimesByDate.map((day) => {
                          const isClosed = day.times.length === 0;
                          return (
                            <div key={day.date} className={`rounded-2xl border p-2 ${isClosed ? 'border-rose-100 bg-rose-50' : 'border-sky-100 bg-white'}`}>
                              <div className={`mb-2 rounded-xl px-2 py-2 text-center text-sm font-bold ${isClosed ? 'bg-rose-100 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>
                                <div>{day.label}</div>
                                <div className="text-xs">{day.weekday}</div>
                              </div>
                              {isClosed ? (
                                <div className="py-6 text-center text-xs font-bold text-rose-500">休診<br />または空きなし</div>
                              ) : (
                                <div className="space-y-2">
                                  {day.times.slice(0, 6).map((time) => (
                                    <button key={`${day.date}-${time}`} onClick={() => { setSelectedDate(day.date); setSelectedTime(time); }} className={`w-full rounded-xl border px-2 py-2 text-xs font-bold ${selectedDate === day.date && selectedTime === time ? 'border-sky-400 bg-sky-100 text-sky-700' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>{time}</button>
                                  ))}
                                  {day.times.length > 6 && <div className="text-center text-[11px] text-slate-400">ほか {day.times.length - 6} 件</div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き、の順番で除外しています。</p>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="mb-4 text-lg font-bold">患者情報を入力してください</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {['氏名', 'ふりがな', '生年月日', '電話番号', 'メールアドレス', '紹介者の有無'].map((label) => (
                      <label key={label} className="text-sm font-semibold">{label}<input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-sky-400" placeholder={label} /></label>
                    ))}
                    <label className="text-sm font-semibold md:col-span-2">相談内容・備考<textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-sky-400" rows={4} placeholder="気になることをご入力ください" /></label>
                  </div>
                  <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="mb-2 text-sm font-bold text-slate-800">個人情報の取り扱いについて</div>
                    <p className="text-xs leading-6 text-slate-600">ご入力いただいた個人情報は、予約受付、本人確認、診療に関するご連絡、予約内容の確認の目的で利用します。法令に基づく場合を除き、ご本人の同意なく第三者へ提供しません。</p>
                    <label className="mt-3 flex items-start gap-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="mt-1 h-4 w-4" />
                      <span>個人情報の取り扱いに同意して予約へ進みます</span>
                    </label>
                    {!privacyAgreed && <p className="mt-2 text-xs font-bold text-rose-600">確認のため、同意チェックを入れてから次へお進みください。</p>}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="mb-4 text-lg font-bold">予約内容の確認</h3>
                  <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between"><span className="text-slate-500">予約種別</span><b>{selectedType.name}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">処置時間</span><b>{selectedType.duration}分</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">予約日時</span><b>{selectedDate} {selectedTime}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">個人情報同意</span><b className="text-emerald-600">確認済み</b></div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="py-10 text-center"><CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={64} /><h3 className="text-2xl font-bold">予約が完了しました</h3><p className="mt-2 text-slate-500">{selectedDate} {selectedTime} / {selectedType.name}</p></div>
              )}

              <div className="mt-8 flex justify-between">
                <button disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 disabled:opacity-40">戻る</button>
                <button disabled={step === 0 || (step === 3 && !privacyAgreed)} onClick={() => setStep(Math.min(5, step + 1))} className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-40">{step === 4 ? '予約を確定' : step === 5 ? '完了' : '次へ'}</button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Clock size={18} /> 予約判定イメージ</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-sky-50 p-3"><b>{selectedType.name}</b><br /><span className="text-slate-500">処置時間：{selectedType.duration}分</span></div>
                <div className="rounded-xl bg-emerald-50 p-3">表示条件：{selectedType.duration}分連続で空きがある枠のみ</div>
                <div className="rounded-xl bg-amber-50 p-3">除外順：定休日 → 臨時休診日 → 診療時間 → 既存予約 → 連続空き</div>
                <div className="rounded-xl bg-slate-50 p-3">既存予約と重なる時間は非表示</div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex h-12 items-center gap-2 border-b border-slate-300 bg-slate-100 px-2">
            <div className="mr-3 text-xl font-medium">2026年5月13日（水）</div>
            <button className="rounded border bg-white px-3 py-1"><ChevronLeft size={16} /></button>
            <button className="rounded border bg-white px-3 py-1"><ChevronRight size={16} /></button>
            <button className="rounded border bg-white px-4 py-1 font-bold">本日</button>
            <div className="relative ml-3">
              <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="h-8 w-64 rounded border border-slate-300 px-2 text-sm" placeholder="患者検索：氏名・よみ・診察券番号・電話番号" />
              {patientSearchResults.length > 0 && (
                <div className="absolute left-0 top-9 z-40 w-[420px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                  <div className="border-b bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">患者データベース検索結果</div>
                  {patientSearchResults.map((patient) => (
                    <button key={patient.id} onClick={() => { setSelectedPatient(patient); setPatientSearch(`${patient.patientCode} ${patient.name}`); }} className="grid w-full grid-cols-[80px_1fr_120px] gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-sky-50">
                      <div className="font-bold text-sky-700">{patient.patientCode}</div>
                      <div><div className="font-bold text-slate-800">{patient.name}</div><div className="text-slate-500">{patient.kana}</div></div>
                      <div><div className="text-slate-700">{patient.phone}</div><div className="text-slate-500">{patient.status}</div></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="rounded border bg-cyan-50 px-3 py-1 text-sm font-bold">ユニット</button>
            <button className="rounded border bg-white px-3 py-1 text-sm">スタッフ</button>
            <button className="rounded border bg-white px-3 py-1 text-sm font-bold">日</button>
            <button className="rounded border bg-white px-3 py-1 text-sm">週</button>
            <button className="rounded border bg-white px-2 py-1"><Search size={16} /></button>
            <button className="rounded border bg-white px-2 py-1"><Printer size={16} /></button>
            <button className="rounded border bg-white px-2 py-1"><RefreshCw size={16} /></button>
            <button className={`rounded border px-3 py-1 text-sm font-bold ${webBookingEnabled ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>Web {webBookingEnabled ? 'ON' : 'OFF'}</button>
            <button className="rounded border bg-white px-2 py-1"><Menu size={16} /></button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '250px 1fr' }}>
            <aside className="min-h-[820px] border-r border-slate-400 bg-slate-50 p-1">
              <MiniCalendar regularClosedDays={regularClosedDays} specialClosedDates={specialClosedDates.map((h) => h.date)} />
              <div className="mt-3"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>日毎メモ</span><button className="rounded border bg-white px-1 text-xs">▾</button></div><textarea className="h-28 w-full resize-none border border-slate-300 bg-white p-2 text-sm" /></div>
              <div className="mt-4"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>掲示板</span><div className="flex gap-1"><button className="rounded border bg-white px-3 py-1 text-xs">一覧</button><button className="rounded border bg-white px-3 py-1 text-xs">追加</button></div></div><div className="h-10 border border-slate-300 bg-white" /></div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-sm font-bold"><span>シフト</span><button className="rounded border bg-white px-1 text-xs">▾</button></div>
                <table className="w-full border border-slate-300 bg-white text-sm">
                  <thead className="bg-cyan-50"><tr><th className="border p-2">名前</th><th className="border p-2">AM</th><th className="border p-2">PM</th></tr></thead>
                  <tbody>{shiftRows.map((staff) => (<tr key={staff.id}><td className="border px-1 py-1">{staff.name}</td><td className="border text-center">{staff.am ? '○' : '−'}</td><td className="border text-center">{staff.pm ? '○' : '−'}</td></tr>))}</tbody>
                </table>
              </div>
              <div className="mt-4"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>イベント</span><button className="rounded border bg-white px-1 text-xs">▾</button></div><div className="border border-slate-300 bg-white p-1 text-sm">本日のイベントはありません</div></div>
            </aside>

            <main className="min-w-0 bg-white">
              <ChairCalendarGrid />
              <div className="grid gap-4 bg-slate-100 p-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><User size={18} /> 予約詳細・患者検索</h3>
                  <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-600">患者検索窓は、氏名・よみ・診察券番号・電話番号から検索します。電話番号はハイフンなしでも検索できます。</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">選択中の患者</p><p className="font-bold">{selectedPatient ? selectedPatient.name : '山田 花子'}</p><p className="text-xs text-slate-500">{selectedPatient ? `${selectedPatient.kana} / 診察券番号 ${selectedPatient.patientCode} / ${selectedPatient.phone}` : 'やまだ はなこ / 診察券番号 000123 / 090-1234-5678'}</p><p className="mt-2 text-xs text-slate-500">予約</p><p className="font-bold">調整 / 30分 / チェア1</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="mb-1 text-xs text-slate-500">ステータス</p><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border px-3 py-2 font-bold">{['予約確定', '来院済み', 'キャンセル', '無断キャンセル', '要連絡', '会計済み', '終了'].map((s) => <option key={s}>{s}</option>)}</select><p className="mt-2 text-xs text-slate-500">変更履歴を保存</p></div>
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><CalendarDays size={18} /> 管理画面仕様</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>・横軸：チェア / 初診枠 / SOS枠</li>
                    <li>・appointments に chair_id / unit_id を持たせてチェア別に表示</li>
                    <li>・縦軸：15分単位の時間</li>
                    <li>・患者検索は氏名、よみ、診察券番号、電話番号で患者DBから検索。電話番号はハイフンなし対応</li>
                    <li>・右上の設定ボタンから予約種別、Web予約可否、スタッフシフト、休診日を管理</li>
                    <li>・患者側の日時選択は1週間分の空き枠を一覧表示</li>
                    <li>・予約可能枠は、定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き、の順番で除外</li>
                  </ul>
                </Card>
              </div>
            </main>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/25 p-4">
          <div className="mt-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-lg font-bold">設定</h2><p className="text-xs text-slate-500">予約種別・Web予約・スタッフシフト・休診日を管理します</p></div>
              <button onClick={() => setSettingsOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold hover:bg-slate-200">閉じる</button>
            </div>
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3">
              {[
                { key: 'reservationTypes' as const, label: '予約種別' },
                { key: 'web' as const, label: 'Web予約' },
                { key: 'shift' as const, label: 'スタッフシフト' },
                { key: 'holidays' as const, label: '休診日' },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setSettingsTab(tab.key)} className={`rounded-t-xl px-4 py-3 text-sm font-bold ${settingsTab === tab.key ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{tab.label}</button>
              ))}
            </div>

            <div className="max-h-[70vh] overflow-auto p-5">
              {settingsTab === 'reservationTypes' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="font-bold">予約種別管理</h3><p className="text-xs text-slate-500">項目名、処置時間、患者側表示、Web予約可否を管理します。</p></div>
                    <button onClick={addType} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 予約項目を追加</button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">項目名</th><th className="p-3">処置時間</th><th className="p-3">患者側表示</th><th className="p-3">Web予約</th></tr></thead>
                      <tbody>
                        {types.map((type) => (
                          <tr key={type.id} className="border-t border-slate-100">
                            <td className="p-3"><input value={type.name} onChange={(e) => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, name: e.target.value } : t))} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-bold outline-none" /></td>
                            <td className="p-3"><select value={type.duration} onChange={(e) => updateDuration(type.id, e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2">{[15, 30, 45, 60, 90, 120].map((min) => <option key={min} value={min}>{min}分</option>)}</select></td>
                            <td className="p-3"><button onClick={() => toggleVisible(type.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${type.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{type.visible ? '表示' : '非表示'}</button></td>
                            <td className="p-3"><button onClick={() => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, web: !t.web } : t))} className={`rounded-full px-3 py-1 text-xs font-bold ${type.web ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>{type.web ? '可' : '不可'}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {settingsTab === 'web' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div><h3 className="font-bold">Web予約の受付</h3><p className="text-sm text-slate-500">OFFにすると患者側の新規Web予約を停止します。</p></div>
                      <button onClick={() => setWebBookingEnabled((v) => !v)} className={`rounded-xl px-5 py-3 text-sm font-bold ${webBookingEnabled ? 'bg-sky-600 text-white' : 'bg-rose-600 text-white'}`}>{webBookingEnabled ? 'Web予約 ON' : 'Web予約 OFF'}</button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'shift' && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="font-bold">スタッフシフト</h3><p className="text-xs text-slate-500">日別のAM/PM勤務を設定します。</p></div>
                    <button onClick={() => setShiftRows((prev) => [...prev, { id: Date.now(), name: 'スタッフ', am: true, pm: true }])} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 追加</button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-cyan-50 text-left"><tr><th className="p-3">名前</th><th className="p-3 text-center">AM</th><th className="p-3 text-center">PM</th></tr></thead>
                      <tbody>{shiftRows.map((staff) => (<tr key={staff.id} className="border-t border-slate-100"><td className="p-3"><input value={staff.name} onChange={(e) => setShiftRows((prev) => prev.map((s) => s.id === staff.id ? { ...s, name: e.target.value } : s))} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-bold" /></td><td className="p-3 text-center"><input type="checkbox" checked={staff.am} onChange={(e) => setShiftRows((prev) => prev.map((s) => s.id === staff.id ? { ...s, am: e.target.checked } : s))} /></td><td className="p-3 text-center"><input type="checkbox" checked={staff.pm} onChange={(e) => setShiftRows((prev) => prev.map((s) => s.id === staff.id ? { ...s, pm: e.target.checked } : s))} /></td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {settingsTab === 'holidays' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold">定休日設定</h3>
                    <p className="mb-3 text-xs text-slate-500">毎週の定休日を設定します。設定した曜日はカレンダーと患者側の空き枠に反映されます。</p>
                    <div className="grid grid-cols-7 gap-2">
                      {regularHolidayLabels.map((day, index) => (
                        <button key={day} onClick={() => setRegularClosedDays((prev) => prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index])} className={`rounded-xl border px-3 py-3 text-sm font-bold ${regularClosedDays.includes(index) ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>{day}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div><h3 className="font-bold">臨時休診日・特別休診日</h3><p className="text-xs text-slate-500">祝日、研修、午後休診などを登録します。</p></div>
                      <button onClick={() => setSpecialClosedDates((prev) => [...prev, { id: Date.now(), date: '2026-06-10', reason: '臨時休診' }])} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 休診日を追加</button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-rose-50 text-left text-rose-700"><tr><th className="p-3">日付</th><th className="p-3">理由</th><th className="p-3">操作</th></tr></thead>
                        <tbody>{specialClosedDates.map((holiday) => (<tr key={holiday.id} className="border-t border-slate-100"><td className="p-3"><input type="date" value={holiday.date} onChange={(e) => setSpecialClosedDates((prev) => prev.map((h) => h.id === holiday.id ? { ...h, date: e.target.value } : h))} className="rounded-lg border border-slate-200 px-2 py-2" /></td><td className="p-3"><input value={holiday.reason} onChange={(e) => setSpecialClosedDates((prev) => prev.map((h) => h.id === holiday.id ? { ...h, reason: e.target.value } : h))} className="w-full rounded-lg border border-slate-200 px-2 py-2" /></td><td className="p-3"><button onClick={() => setSpecialClosedDates((prev) => prev.filter((h) => h.id !== holiday.id))} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">削除</button></td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">予約可能枠は、定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き、の順番で除外して患者側に表示します。</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
