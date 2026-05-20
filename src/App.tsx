import React, { useMemo, useState } from "react";
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
} from "lucide-react";

type AppointmentType = { id: number; name: string; duration: number; visible: boolean; web: boolean };
type Patient = { id: number; patientCode: string; name: string; kana: string; phone: string; status: string };
type Holiday = { id: number; date: string; reason: string };
type Staff = { id: number; name: string; am: boolean; pm: boolean };
type ChairAppointment = { chair: string; start: string; span: number; name: string; type: string; status: string; memo: string };

const initialTypes: AppointmentType[] = [
  { id: 1, name: "初診相談", duration: 60, visible: true, web: true },
  { id: 2, name: "検査", duration: 60, visible: true, web: true },
  { id: 3, name: "診断", duration: 30, visible: true, web: true },
  { id: 4, name: "調整", duration: 30, visible: true, web: true },
  { id: 5, name: "装置装着", duration: 60, visible: true, web: true },
  { id: 6, name: "装置除去", duration: 60, visible: true, web: true },
  { id: 7, name: "保定観察", duration: 30, visible: true, web: true },
  { id: 8, name: "急患", duration: 30, visible: true, web: true },
];

const chairs = ["チェア1", "チェア2", "初診", "SOS&初診小児用"];
const timeline = Array.from({ length: 37 }, (_, i) => {
  const total = 9 * 60 + i * 15;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
});

const chairAppointments: ChairAppointment[] = [
  { chair: "チェア1", start: "10:00", span: 4, name: "山田 花子", type: "調整", status: "予約確定", memo: "ワイヤー交換" },
  { chair: "チェア1", start: "11:30", span: 2, name: "佐藤 太郎", type: "保定観察", status: "来院済み", memo: "リテーナー確認" },
  { chair: "チェア2", start: "14:00", span: 4, name: "田中 美咲", type: "検査", status: "要連絡", memo: "資料採得" },
  { chair: "初診", start: "10:30", span: 4, name: "中村 葵", type: "初診相談", status: "予約確定", memo: "小児相談" },
  { chair: "SOS&初診小児用", start: "16:00", span: 4, name: "鈴木 一郎", type: "装置装着", status: "予約確定", memo: "上顎装置" },
];

const patients: Patient[] = [
  { id: 1, patientCode: "000123", name: "山田 花子", kana: "やまだ はなこ", phone: "090-1234-5678", status: "治療中" },
  { id: 2, patientCode: "000124", name: "佐藤 太郎", kana: "さとう たろう", phone: "080-2222-3333", status: "保定中" },
  { id: 3, patientCode: "000125", name: "田中 美咲", kana: "たなか みさき", phone: "090-9999-1111", status: "検査後" },
  { id: 4, patientCode: "000126", name: "中村 葵", kana: "なかむら あおい", phone: "070-5555-8888", status: "初診予定" },
];

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function normalize(text: string) {
  return text.toLowerCase().replace(/[\s\-ー−―‐]/g, "");
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function addDays(dateString: string, days: number) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekDates(offset: number) {
  const base = addDays("2026-05-18", offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(toDateString(base), i);
    return {
      date: toDateString(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: weekdays[d.getDay()],
      dayOfWeek: d.getDay(),
    };
  });
}

function getAvailableTimes(args: {
  date: string;
  dayOfWeek: number;
  durationMinutes: number;
  regularClosedDays: number[];
  specialHolidays: Holiday[];
}) {
  // 判定順：定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き
  if (args.regularClosedDays.includes(args.dayOfWeek)) return [];
  if (args.specialHolidays.some((h) => h.date === args.date)) return [];

  const open = timeToMinutes("9:00");
  const close = timeToMinutes("18:00");
  const unit = 15;
  const result: string[] = [];

  for (let start = open; start + args.durationMinutes <= close; start += unit) {
    const end = start + args.durationMinutes;
    const overlap = chairAppointments.some((a) => {
      const aStart = timeToMinutes(a.start);
      const aEnd = aStart + a.span * unit;
      return start < aEnd && end > aStart;
    });
    if (!overlap) result.push(minutesToTime(start));
  }
  return result;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>{children}</div>;
}

function MiniCalendar({ regularClosedDays, specialHolidays }: { regularClosedDays: number[]; specialHolidays: Holiday[] }) {
  const cells = getWeekDates(0).concat(getWeekDates(1), getWeekDates(2), getWeekDates(3), getWeekDates(4), getWeekDates(5)).slice(0, 42);
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2">
      <div className="mb-2 flex items-center justify-between text-sm font-bold"><span>«</span><span>2026年5月</span><span>»</span></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
        {weekdays.map((d) => <div key={d} className="py-1">{d}</div>)}
        {cells.map((cell) => {
          const closed = regularClosedDays.includes(cell.dayOfWeek) || specialHolidays.some((h) => h.date === cell.date);
          return <div key={cell.date} className={`h-8 rounded-sm pt-1 ${closed ? "bg-rose-100 text-rose-600" : "bg-sky-50 text-slate-700"}`}>{cell.label.split("/")[1]}</div>;
        })}
      </div>
    </div>
  );
}

function AppointmentBlock({ appt }: { appt: ChairAppointment }) {
  const color = appt.status === "来院済み" ? "bg-emerald-100 border-emerald-300" : appt.status === "要連絡" ? "bg-amber-100 border-amber-300" : "bg-sky-100 border-sky-300";
  return (
    <div className={`absolute left-1 right-1 z-10 rounded border px-2 py-1 text-[11px] shadow-sm ${color}`} style={{ height: `${appt.span * 40 - 6}px` }}>
      <div className="font-bold">{appt.name}</div>
      <div>{appt.type}</div>
      <div className="truncate text-[10px]">{appt.memo}</div>
    </div>
  );
}

function ChairGrid() {
  return (
    <div className="overflow-hidden border border-slate-400 bg-white">
      <div className="grid" style={{ gridTemplateColumns: `58px repeat(${chairs.length}, minmax(180px, 1fr))` }}>
        <div className="border-r border-slate-500 bg-slate-50" />
        {chairs.map((chair) => <div key={chair} className="border-r border-slate-500 bg-cyan-50 px-3 py-2 text-center text-sm font-bold">{chair}</div>)}
      </div>
      <div className="max-h-[680px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `58px repeat(${chairs.length}, minmax(180px, 1fr))` }}>
          {timeline.map((time, row) => (
            <React.Fragment key={time}>
              <div className={`h-10 border-r border-slate-500 pr-1 pt-1 text-right text-xs ${time.endsWith(":00") ? "font-bold" : "text-slate-500"}`}>{time}</div>
              {chairs.map((chair) => {
                const appt = chairAppointments.find((a) => a.chair === chair && a.start === time);
                const hidden = chairAppointments.some((a) => {
                  const s = timeline.indexOf(a.start);
                  return a.chair === chair && a.start !== time && row > s && row < s + a.span;
                });
                return (
                  <div key={`${chair}-${time}`} className={`relative h-10 border-r border-slate-500 ${time.endsWith(":00") ? "border-t border-t-slate-500" : "border-t border-dashed border-t-slate-400"} bg-zinc-200`}>
                    {!hidden && appt && <AppointmentBlock appt={appt} />}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"admin" | "patient">("admin");
  const [step, setStep] = useState(0);
  const [patientMode, setPatientMode] = useState<"new" | "existing" | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>(initialTypes);
  const [selectedType, setSelectedType] = useState<AppointmentType>(initialTypes[0]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState("2026-05-20");
  const [selectedTime, setSelectedTime] = useState("10:30");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [status, setStatus] = useState("予約確定");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("reservationTypes");
  const [webBookingEnabled, setWebBookingEnabled] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([{ id: 1, name: "院長", am: true, pm: true }, { id: 2, name: "スタッフA", am: true, pm: false }]);
  const [regularClosedDays, setRegularClosedDays] = useState<number[]>([0, 4]);
  const [specialHolidays, setSpecialHolidays] = useState<Holiday[]>([
    { id: 1, date: "2026-05-21", reason: "定休日" },
    { id: 2, date: "2026-05-28", reason: "午後休診" },
    { id: 3, date: "2026-06-03", reason: "臨時休診" },
  ]);

  const visibleTypes = useMemo(() => {
    const base = types.filter((t) => t.visible && t.web);
    if (patientMode === "new") return base.filter((t) => t.name === "初診相談");
    if (patientMode === "existing") return base.filter((t) => t.name !== "初診相談");
    return base;
  }, [types, patientMode]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const availableByDate = useMemo(() => weekDates.map((d) => ({
    ...d,
    times: getAvailableTimes({
      date: d.date,
      dayOfWeek: d.dayOfWeek,
      durationMinutes: selectedType.duration,
      regularClosedDays,
      specialHolidays,
    }),
  })), [weekDates, selectedType.duration, regularClosedDays, specialHolidays]);

  const searchResults = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];
    return patients.filter((p) => {
      const codeNoZero = p.patientCode.replace(/^0+/, "");
      const qNoZero = q.replace(/^0+/, "");
      return normalize(p.name).includes(q) || normalize(p.kana).includes(q) || normalize(p.phone).includes(q) || p.patientCode.includes(q) || codeNoZero.includes(qNoZero);
    });
  }, [search]);

  const addType = () => setTypes((prev) => [...prev, { id: Date.now(), name: "新しい予約項目", duration: 30, visible: true, web: true }]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-300 bg-white">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-bold text-slate-500">Apotool風 予約MVP</div>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {["診療カレンダー", "イベント", "来院状況", "患者管理", "クリニックデータ"].map((n) => <button key={n} className="border-l border-slate-200 px-4 py-3 hover:bg-slate-50">{n}</button>)}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setView("patient")} className={`rounded px-3 py-1 ${view === "patient" ? "bg-sky-100 text-sky-700" : "hover:bg-slate-100"}`}>患者側</button>
            <button onClick={() => setView("admin")} className={`rounded px-3 py-1 ${view === "admin" ? "bg-sky-100 text-sky-700" : "hover:bg-slate-100"}`}>管理画面</button>
            <button onClick={() => setSettingsOpen(true)} className="ml-2 flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 font-bold hover:bg-slate-50"><Settings size={16} /> 設定</button>
            <span className="font-bold">のばた矯正歯科</span>
          </div>
        </div>
      </header>

      {view === "patient" ? (
        <div className="mx-auto max-w-6xl p-4">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Card className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-xl font-bold">Web予約</h2><p className="text-sm text-slate-500">予約種別を選び、空き時間から予約できます。</p></div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{step === 0 ? "入口選択" : `Step ${step} / 5`}</span>
              </div>
              <div className="mb-6 grid grid-cols-6 gap-2">
                {["入口", "種別", "日時", "入力", "確認", "完了"].map((label, i) => <div key={label} className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${step >= i ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"}`}>{label}</div>)}
              </div>

              {step === 0 && (
                <div>
                  <h3 className="mb-2 text-lg font-bold">ご予約の入口を選択してください</h3>
                  <p className="mb-5 text-sm text-slate-500">初めての方と、すでに当院に通われている方で入口を分けています。</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button onClick={() => { setPatientMode("new"); setSelectedType(types.find((t) => t.name === "初診相談") || types[0]); setStep(1); }} className="rounded-3xl border-2 border-sky-100 bg-white p-6 text-left shadow-sm hover:border-sky-400 hover:bg-sky-50">
                      <UserPlus className="mb-4 text-sky-700" size={32} /><div className="text-xl font-bold">初めての方</div><p className="mt-2 text-sm text-slate-500">初診相談をご希望の方はこちら。</p>
                    </button>
                    <button onClick={() => { setPatientMode("existing"); setSelectedType(types.find((t) => t.name === "調整") || types[0]); setStep(1); }} className="rounded-3xl border-2 border-emerald-100 bg-white p-6 text-left shadow-sm hover:border-emerald-400 hover:bg-emerald-50">
                      <Users className="mb-4 text-emerald-700" size={32} /><div className="text-xl font-bold">当院に通われている方</div><p className="mt-2 text-sm text-slate-500">調整・保定観察・急患などはこちら。</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="text-lg font-bold">予約種別を選択してください</h3><p className="text-sm text-slate-500">{patientMode === "new" ? "初めての方は初診相談のみ選択できます。" : "当院に通われている方が選択できる予約内容です。"}</p></div>
                    <button onClick={() => { setPatientMode(null); setStep(0); }} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">入口を変更</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleTypes.map((type) => (
                      <button key={type.id} onClick={() => setSelectedType(type)} className={`rounded-2xl border p-4 text-left hover:border-sky-300 hover:bg-sky-50 ${selectedType.id === type.id ? "border-sky-400 bg-sky-50" : "border-slate-100 bg-white"}`}>
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
                        <button onClick={() => setWeekOffset((v) => v - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">前の週</button>
                        <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-slate-500">{weekDates[0].label}〜{weekDates[6].label}</span>
                        <button onClick={() => setWeekOffset((v) => v + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">次の週</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[760px] grid-cols-7 gap-2">
                        {availableByDate.map((day) => (
                          <div key={day.date} className={`rounded-2xl border p-2 ${day.times.length === 0 ? "border-rose-100 bg-rose-50" : "border-sky-100 bg-white"}`}>
                            <div className={`mb-2 rounded-xl px-2 py-2 text-center text-sm font-bold ${day.times.length === 0 ? "bg-rose-100 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
                              <div>{day.label}</div><div className="text-xs">{day.weekday}</div>
                            </div>
                            {day.times.length === 0 ? <div className="py-6 text-center text-xs font-bold text-rose-500">休診<br />または空きなし</div> : (
                              <div className="space-y-2">
                                {day.times.slice(0, 6).map((time) => <button key={`${day.date}-${time}`} onClick={() => { setSelectedDate(day.date); setSelectedTime(time); }} className={`w-full rounded-xl border px-2 py-2 text-xs font-bold ${selectedDate === day.date && selectedTime === time ? "border-sky-400 bg-sky-100 text-sky-700" : "border-slate-100 bg-slate-50 text-slate-700"}`}>{time}</button>)}
                                {day.times.length > 6 && <div className="text-center text-[11px] text-slate-400">ほか {day.times.length - 6} 件</div>}
                              </div>
                            )}
                          </div>
                        ))}
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
                    {["氏名", "ふりがな", "生年月日", "電話番号", "メールアドレス", "紹介者の有無"].map((label) => <label key={label} className="text-sm font-semibold">{label}<input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-sky-400" placeholder={label} /></label>)}
                    <label className="text-sm font-semibold md:col-span-2">相談内容・備考<textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-sky-400" rows={4} placeholder="気になることをご入力ください" /></label>
                  </div>
                  <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="mb-2 text-sm font-bold text-slate-800">個人情報の取り扱いについて</div>
                    <p className="text-xs leading-6 text-slate-600">ご入力いただいた個人情報は、予約受付、本人確認、診療に関するご連絡、予約内容の確認の目的で利用します。法令に基づく場合を除き、ご本人の同意なく第三者へ提供しません。</p>
                    <label className="mt-3 flex items-start gap-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="mt-1 h-4 w-4" />
                      <span>個人情報の取り扱いに同意して予約へ進みます</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 4 && <div><h3 className="mb-4 text-lg font-bold">予約内容の確認</h3><div className="space-y-3 rounded-2xl bg-slate-50 p-4"><div className="flex justify-between"><span className="text-slate-500">予約種別</span><b>{selectedType.name}</b></div><div className="flex justify-between"><span className="text-slate-500">処置時間</span><b>{selectedType.duration}分</b></div><div className="flex justify-between"><span className="text-slate-500">予約日時</span><b>{selectedDate} {selectedTime}</b></div><div className="flex justify-between"><span className="text-slate-500">個人情報同意</span><b className="text-emerald-600">確認済み</b></div></div></div>}
              {step === 5 && <div className="py-10 text-center"><CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={64} /><h3 className="text-2xl font-bold">予約が完了しました</h3><p className="mt-2 text-slate-500">{selectedDate} {selectedTime} / {selectedType.name}</p></div>}

              <div className="mt-8 flex justify-between">
                <button disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 disabled:opacity-40">戻る</button>
                <button disabled={step === 0 || (step === 3 && !privacyAgreed)} onClick={() => setStep(Math.min(5, step + 1))} className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-40">{step === 4 ? "予約を確定" : step === 5 ? "完了" : "次へ"}</button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Clock size={18} /> 予約判定イメージ</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-sky-50 p-3"><b>{selectedType.name}</b><br /><span className="text-slate-500">処置時間：{selectedType.duration}分</span></div>
                <div className="rounded-xl bg-emerald-50 p-3">表示条件：{selectedType.duration}分連続で空きがある枠のみ</div>
                <div className="rounded-xl bg-amber-50 p-3">除外順：定休日 → 臨時休診日 → 診療時間 → 既存予約 → 連続空き</div>
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-64 rounded border border-slate-300 px-2 text-sm" placeholder="患者検索：氏名・よみ・診察券番号・電話番号" />
              {searchResults.length > 0 && (
                <div className="absolute left-0 top-9 z-40 w-[420px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                  <div className="border-b bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">患者データベース検索結果</div>
                  {searchResults.map((p) => <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(`${p.patientCode} ${p.name}`); }} className="grid w-full grid-cols-[80px_1fr_120px] gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-sky-50"><div className="font-bold text-sky-700">{p.patientCode}</div><div><div className="font-bold">{p.name}</div><div className="text-slate-500">{p.kana}</div></div><div><div>{p.phone}</div><div className="text-slate-500">{p.status}</div></div></button>)}
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
            <button className={`rounded border px-3 py-1 text-sm font-bold ${webBookingEnabled ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"}`}>Web {webBookingEnabled ? "ON" : "OFF"}</button>
            <button className="rounded border bg-white px-2 py-1"><Menu size={16} /></button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "250px 1fr" }}>
            <aside className="min-h-[820px] border-r border-slate-400 bg-slate-50 p-1">
              <MiniCalendar regularClosedDays={regularClosedDays} specialHolidays={specialHolidays} />
              <div className="mt-3"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>日毎メモ</span><button className="rounded border bg-white px-1 text-xs">▾</button></div><textarea className="h-28 w-full resize-none border border-slate-300 bg-white p-2 text-sm" /></div>
              <div className="mt-4"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>シフト</span><button className="rounded border bg-white px-1 text-xs">▾</button></div><table className="w-full border border-slate-300 bg-white text-sm"><thead className="bg-cyan-50"><tr><th className="border p-2">名前</th><th className="border p-2">AM</th><th className="border p-2">PM</th></tr></thead><tbody>{staff.map((s) => <tr key={s.id}><td className="border px-1 py-1">{s.name}</td><td className="border text-center">{s.am ? "○" : "−"}</td><td className="border text-center">{s.pm ? "○" : "−"}</td></tr>)}</tbody></table></div>
              <div className="mt-4"><div className="mb-1 flex items-center justify-between text-sm font-bold"><span>イベント</span><button className="rounded border bg-white px-1 text-xs">▾</button></div><div className="border border-slate-300 bg-white p-1 text-sm">本日のイベントはありません</div></div>
            </aside>

            <main className="min-w-0 bg-white">
              <ChairGrid />
              <div className="grid gap-4 bg-slate-100 p-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><User size={18} /> 予約詳細・患者検索</h3>
                  <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-600">患者検索窓は、氏名・よみ・診察券番号・電話番号から検索します。電話番号はハイフンなしでも検索できます。</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">選択中の患者</p><p className="font-bold">{selectedPatient ? selectedPatient.name : "山田 花子"}</p><p className="text-xs text-slate-500">{selectedPatient ? `${selectedPatient.kana} / 診察券番号 ${selectedPatient.patientCode} / ${selectedPatient.phone}` : "やまだ はなこ / 診察券番号 000123 / 090-1234-5678"}</p><p className="mt-2 text-xs text-slate-500">予約</p><p className="font-bold">調整 / 30分 / チェア1</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="mb-1 text-xs text-slate-500">ステータス</p><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border px-3 py-2 font-bold">{["予約確定", "来院済み", "キャンセル", "無断キャンセル", "要連絡", "会計済み", "終了"].map((s) => <option key={s}>{s}</option>)}</select><p className="mt-2 text-xs text-slate-500">変更履歴を保存</p></div>
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
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-bold">設定</h2><p className="text-xs text-slate-500">予約種別・Web予約・スタッフシフト・休診日を管理します</p></div><button onClick={() => setSettingsOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold hover:bg-slate-200">閉じる</button></div>
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3">{[{ key: "reservationTypes", label: "予約種別" }, { key: "web", label: "Web予約" }, { key: "shift", label: "スタッフシフト" }, { key: "holidays", label: "休診日" }].map((tab) => <button key={tab.key} onClick={() => setSettingsTab(tab.key)} className={`rounded-t-xl px-4 py-3 text-sm font-bold ${settingsTab === tab.key ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{tab.label}</button>)}</div>
            <div className="max-h-[70vh] overflow-auto p-5">
              {settingsTab === "reservationTypes" && <div><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">予約種別管理</h3><p className="text-xs text-slate-500">項目名、処置時間、患者側表示、Web予約可否を管理します。</p></div><button onClick={addType} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 予約項目を追加</button></div><div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">項目名</th><th className="p-3">処置時間</th><th className="p-3">患者側表示</th><th className="p-3">Web予約</th></tr></thead><tbody>{types.map((type) => <tr key={type.id} className="border-t border-slate-100"><td className="p-3"><input value={type.name} onChange={(e) => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, name: e.target.value } : t))} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-bold outline-none" /></td><td className="p-3"><select value={type.duration} onChange={(e) => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, duration: Number(e.target.value) } : t))} className="rounded-lg border border-slate-200 px-2 py-2">{[15, 30, 45, 60, 90, 120].map((min) => <option key={min} value={min}>{min}分</option>)}</select></td><td className="p-3"><button onClick={() => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, visible: !t.visible } : t))} className={`rounded-full px-3 py-1 text-xs font-bold ${type.visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{type.visible ? "表示" : "非表示"}</button></td><td className="p-3"><button onClick={() => setTypes((prev) => prev.map((t) => t.id === type.id ? { ...t, web: !t.web } : t))} className={`rounded-full px-3 py-1 text-xs font-bold ${type.web ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"}`}>{type.web ? "可" : "不可"}</button></td></tr>)}</tbody></table></div></div>}
              {settingsTab === "web" && <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold">Web予約の受付</h3><p className="text-sm text-slate-500">OFFにすると患者側の新規Web予約を停止します。</p></div><button onClick={() => setWebBookingEnabled((v) => !v)} className={`rounded-xl px-5 py-3 text-sm font-bold ${webBookingEnabled ? "bg-sky-600 text-white" : "bg-rose-600 text-white"}`}>{webBookingEnabled ? "Web予約 ON" : "Web予約 OFF"}</button></div></div>}
              {settingsTab === "shift" && <div><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">スタッフシフト</h3><p className="text-xs text-slate-500">日別のAM/PM勤務を設定します。</p></div><button onClick={() => setStaff((prev) => [...prev, { id: Date.now(), name: "スタッフ", am: true, pm: true }])} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 追加</button></div><div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-cyan-50 text-left"><tr><th className="p-3">名前</th><th className="p-3 text-center">AM</th><th className="p-3 text-center">PM</th></tr></thead><tbody>{staff.map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="p-3"><input value={s.name} onChange={(e) => setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-bold" /></td><td className="p-3 text-center"><input type="checkbox" checked={s.am} onChange={(e) => setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, am: e.target.checked } : x))} /></td><td className="p-3 text-center"><input type="checkbox" checked={s.pm} onChange={(e) => setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, pm: e.target.checked } : x))} /></td></tr>)}</tbody></table></div></div>}
              {settingsTab === "holidays" && <div className="space-y-5"><div><h3 className="font-bold">定休日設定</h3><p className="mb-3 text-xs text-slate-500">毎週の定休日を設定します。</p><div className="grid grid-cols-7 gap-2">{weekdays.map((day, index) => <button key={day} onClick={() => setRegularClosedDays((prev) => prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index])} className={`rounded-xl border px-3 py-3 text-sm font-bold ${regularClosedDays.includes(index) ? "border-rose-300 bg-rose-100 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}>{day}</button>)}</div></div><div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">臨時休診日・特別休診日</h3><p className="text-xs text-slate-500">祝日、研修、午後休診などを登録します。</p></div><button onClick={() => setSpecialHolidays((prev) => [...prev, { id: Date.now(), date: "2026-06-10", reason: "臨時休診" }])} className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> 休診日を追加</button></div><div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-rose-50 text-left text-rose-700"><tr><th className="p-3">日付</th><th className="p-3">理由</th><th className="p-3">操作</th></tr></thead><tbody>{specialHolidays.map((h) => <tr key={h.id} className="border-t border-slate-100"><td className="p-3"><input type="date" value={h.date} onChange={(e) => setSpecialHolidays((prev) => prev.map((x) => x.id === h.id ? { ...x, date: e.target.value } : x))} className="rounded-lg border border-slate-200 px-2 py-2" /></td><td className="p-3"><input value={h.reason} onChange={(e) => setSpecialHolidays((prev) => prev.map((x) => x.id === h.id ? { ...x, reason: e.target.value } : x))} className="w-full rounded-lg border border-slate-200 px-2 py-2" /></td><td className="p-3"><button onClick={() => setSpecialHolidays((prev) => prev.filter((x) => x.id !== h.id))} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">削除</button></td></tr>)}</tbody></table></div></div><div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">予約可能枠は、定休日 → 臨時休診日 → 診療時間 → 既存予約 → 処置時間分の連続空き、の順番で除外して患者側に表示します。</div></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
