import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";

// TODO: 部署 Code.gs 後，將取得的網頁應用程式網址貼在這裡（與通報表單使用同一組網址）
const GAS_WEB_APP_URL = "https://script.google.com/macros/library/d/11Bj7lxRtVy4UGN4HHKaHrILm9m7VbkutRfYZJfLeGuk0dxX3C8U-IU6J/1";

const STATUS_FLOW = ["未處理", "處理中", "已結案"];

const STATUS_STYLE = {
  未處理: { bg: "bg-slate-100", text: "text-slate-700", icon: Circle },
  處理中: { bg: "bg-blue-50", text: "text-blue-700", icon: Loader2 },
  已結案: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
};

const SEVERITY_STYLE = {
  輕微: { text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  一般: { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  嚴重: { text: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-600" },
};

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function IncidentDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const isConfigured = !GAS_WEB_APP_URL.startsWith("PASTE_");

  const fetchIncidents = useCallback(async () => {
    if (!isConfigured) {
      setLoadError("尚未設定 GAS_WEB_APP_URL，請先部署 Code.gs 並將網址填入程式碼頂端。");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${GAS_WEB_APP_URL}?action=list`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "後端回傳失敗");
      setIncidents(result.data || []);
    } catch (err) {
      setLoadError(`讀取失敗：${err.message || "網路異常，請稍後重試"}`);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const cycleStatus = async (id) => {
    const target = incidents.find((i) => i.id === id);
    if (!target) return;
    const nextStatus = STATUS_FLOW[(STATUS_FLOW.indexOf(target.status) + 1) % STATUS_FLOW.length];

    // 樂觀更新畫面
    setIncidents((list) => list.map((inc) => (inc.id === id ? { ...inc, status: nextStatus } : inc)));
    setUpdatingId(id);

    try {
      const res = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateStatus", id, status: nextStatus }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "更新失敗");
    } catch (err) {
      // 寫回失敗則還原畫面狀態
      setIncidents((list) => list.map((inc) => (inc.id === id ? { ...inc, status: target.status } : inc)));
      setLoadError(`狀態更新失敗：${err.message || "網路異常"}，畫面已還原，請重試。`);
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const today = todayStr();
    return {
      todayCount: incidents.filter((i) => i.datetime && i.datetime.startsWith(today)).length,
      openCount: incidents.filter((i) => i.status === "未處理").length,
      severeCount: incidents.filter((i) => i.severity === "嚴重").length,
    };
  }, [incidents]);

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "'Noto Sans TC', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');`}</style>

      <div className="bg-slate-950 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loadError ? "bg-rose-400" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${loadError ? "bg-rose-500" : "bg-emerald-500"}`}></span>
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{loadError ? "連線異常" : "系統運作中"}</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>共 {incidents.length} 筆通報紀錄</div>
      </div>

      <header className="bg-slate-900 text-white px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-blue-400 text-xs font-medium tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            INCIDENT MANAGEMENT DASHBOARD
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="shrink-0 bg-blue-600 rounded-md p-2">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">通報事件管理後台</h1>
            </div>
            <button
              type="button"
              onClick={fetchIncidents}
              disabled={loading}
              className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-md transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              重新整理
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loadError && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{loadError}</div>
            <button type="button" onClick={fetchIncidents} className="text-xs font-semibold underline shrink-0">
              重試
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="今日通報數" value={stats.todayCount} unit="件" icon={FileText} accent="text-blue-600" accentBg="bg-blue-50" />
          <StatCard label="未處理案件數" value={stats.openCount} unit="件" icon={Clock} accent="text-amber-600" accentBg="bg-amber-50" />
          <StatCard label="嚴重級別案件數" value={stats.severeCount} unit="件" icon={AlertTriangle} accent="text-rose-600" accentBg="bg-rose-50" />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">通報事件列表</h2>
              <p className="text-xs text-slate-500 mt-0.5">點擊「處理狀態」按鈕可切換案件處理進度，並即時寫回試算表</p>
            </div>
            <button
              type="button"
              onClick={fetchIncidents}
              disabled={loading}
              className="sm:hidden flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 px-3 py-2 rounded-md transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              重新整理
            </button>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-rose-600 font-medium bg-rose-50 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              紅底列為嚴重事件
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">讀取通報資料中...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <FileText className="w-8 h-8" />
              <span className="text-sm">目前尚無通報紀錄</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "920px" }}>
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs">
                    <th className="text-left font-semibold px-4 py-3">通報編號</th>
                    <th className="text-left font-semibold px-4 py-3">日期時間</th>
                    <th className="text-left font-semibold px-4 py-3">地點</th>
                    <th className="text-left font-semibold px-4 py-3">類型</th>
                    <th className="text-left font-semibold px-4 py-3">嚴重程度</th>
                    <th className="text-left font-semibold px-4 py-3">事件描述</th>
                    <th className="text-left font-semibold px-4 py-3">處理狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc) => {
                    const isSevere = inc.severity === "嚴重";
                    const sevStyle = SEVERITY_STYLE[inc.severity] || SEVERITY_STYLE["一般"];
                    const statusStyle = STATUS_STYLE[inc.status] || STATUS_STYLE["未處理"];
                    const StatusIcon = statusStyle.icon;
                    const isUpdating = updatingId === inc.id;
                    return (
                      <tr key={inc.id} className={isSevere ? "bg-rose-50/70 border-l-4 border-rose-600" : "border-l-4 border-transparent"}>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{inc.id}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {(inc.datetime || "").replace("T", " ")}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {inc.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{inc.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${sevStyle.bg} ${sevStyle.text}`}>
                            {isSevere ? <AlertTriangle className="w-3.5 h-3.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`}></span>}
                            {inc.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">
                          <span className="line-clamp-1">{inc.description}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => cycleStatus(inc.id)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-transparent hover:border-slate-300 disabled:opacity-60 transition ${statusStyle.bg} ${statusStyle.text}`}
                            title="點擊切換處理狀態"
                          >
                            <StatusIcon className={`w-3.5 h-3.5 ${isUpdating || inc.status === "處理中" ? "animate-spin" : ""}`} />
                            {inc.status}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            嚴重事件已以紅色背景與左側標示條醒目提示，請優先處理。
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, unit, icon: Icon, accent, accentBg }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex items-center gap-4">
      <div className={`shrink-0 rounded-md p-3 ${accentBg}`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
          <span className="text-xs text-slate-400">{unit}</span>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  MapPin,
  AlertTriangle,
  FileText,
  Camera,
  CheckCircle2,
  X,
  Loader2,
  ChevronDown,
  ShieldAlert,
  Plus,
} from "lucide-react";

// TODO: 部署 Code.gs 後，將取得的網頁應用程式網址貼在這裡
const GAS_WEB_APP_URL = "https://script.google.com/macros/library/d/11Bj7lxRtVy4UGN4HHKaHrILm9m7VbkutRfYZJfLeGuk0dxX3C8U-IU6J/1";

const LOCATIONS = ["淡海線", "安坑線", "環狀線", "三鶯線"];
const LOCATION_CODE = { 淡海線: "TAM", 安坑線: "AK", 環狀線: "CG", 三鶯線: "SY" };
const EVENT_TYPES = ["異常事件", "延誤事件", "職安事件", "走動管理"];

const SEVERITIES = [
  { value: "輕微", ring: "ring-emerald-600", border: "border-emerald-600", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { value: "一般", ring: "ring-amber-600", border: "border-amber-600", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  { value: "嚴重", ring: "ring-rose-600", border: "border-rose-600", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
];

function nowForInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClock(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function IncidentReportSystem() {
  const [clock, setClock] = useState(new Date());
  const [form, setForm] = useState({
    datetime: nowForInput(),
    location: "",
    type: "",
    severity: "",
    description: "",
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((p) => [
          ...p,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, url: reader.result },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (id) => setPhotos((p) => p.filter((ph) => ph.id !== id));

  const validate = () => {
    const e = {};
    if (!form.datetime) e.datetime = "請選擇通報日期與時間";
    if (!form.location) e.location = "請選擇發生地點";
    if (!form.type) e.type = "請選擇事件類型";
    if (!form.severity) e.severity = "請選擇嚴重程度";
    if (!form.description.trim()) e.description = "請填寫事件描述";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildTicketId = () => {
    const d = new Date(form.datetime);
    const pad = (n) => String(n).padStart(2, "0");
    const code = LOCATION_CODE[form.location] || "GEN";
    return `${code}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(Math.floor(Math.random() * 60))}`;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    setSubmitting(true);

    const id = buildTicketId();
    const payload = {
      action: "create",
      data: {
        id,
        datetime: form.datetime,
        location: form.location,
        type: form.type,
        severity: form.severity,
        description: form.description,
        status: "未處理",
        photoCount: photos.length,
      },
    };

    try {
      const res = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避免觸發 CORS 預檢請求
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "後端回傳失敗");
      }

      setTicket({ id, submittedAt: new Date(), ...form, photos });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        GAS_WEB_APP_URL.startsWith("PASTE_")
          ? "尚未設定 GAS_WEB_APP_URL，請先部署 Code.gs 並將網址填入程式碼頂端。"
          : `送出失敗：${err.message || "網路異常，請稍後重試"}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ datetime: nowForInput(), location: "", type: "", severity: "", description: "" });
    setPhotos([]);
    setErrors({});
    setSubmitError(null);
    setTicket(null);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "'Noto Sans TC', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');`}</style>

      <div className="bg-slate-950 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>系統運作中</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatClock(clock)}</div>
      </div>

      <header className="bg-slate-900 text-white px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-blue-400 text-xs font-medium tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            RAIL SAFETY &amp; INCIDENT REPORTING
          </div>
          <div className="flex items-center gap-3">
            <div className="shrink-0 bg-blue-600 rounded-md p-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">安全與異常事件通報系統</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8">
        {!submitted ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">事件通報表單</h2>
              <p className="text-xs text-slate-500 mt-0.5">請如實填寫下列欄位，送出後將寫入雲端試算表並產生系統通報編號。</p>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  通報日期與時間<span className="text-rose-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.datetime}
                  onChange={(e) => setField("datetime", e.target.value)}
                  className={`w-full rounded-md border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.datetime ? "border-rose-500" : "border-slate-300"}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
                {errors.datetime && <p className="text-xs text-rose-600 mt-1">{errors.datetime}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    發生地點<span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      className={`w-full appearance-none rounded-md border px-3 py-2.5 pr-9 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.location ? "border-rose-500" : "border-slate-300"}`}
                    >
                      <option value="">請選擇路線</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.location && <p className="text-xs text-rose-600 mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <FileText className="w-4 h-4 text-slate-400" />
                    事件類型<span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setField("type", e.target.value)}
                      className={`w-full appearance-none rounded-md border px-3 py-2.5 pr-9 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.type ? "border-rose-500" : "border-slate-300"}`}
                    >
                      <option value="">請選擇類型</option>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.type && <p className="text-xs text-rose-600 mt-1">{errors.type}</p>}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  嚴重程度<span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map((s) => {
                    const active = form.severity === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setField("severity", s.value)}
                        className={`flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition ${active ? `${s.border} ${s.bg} ${s.text} ring-1 ${s.ring}` : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></span>
                        {s.value}
                      </button>
                    );
                  })}
                </div>
                {errors.severity && <p className="text-xs text-rose-600 mt-1">{errors.severity}</p>}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  事件描述<span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={5}
                  placeholder="請描述事件發生經過、影響範圍及初步處理情形..."
                  className={`w-full rounded-md border px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.description ? "border-rose-500" : "border-slate-300"}`}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description ? <p className="text-xs text-rose-600">{errors.description}</p> : <span></span>}
                  <span className="text-xs text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{form.description.length} 字</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                  <Camera className="w-4 h-4 text-slate-400" />
                  現場照片
                  <span className="text-xs font-normal text-slate-400">（選填）</span>
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  照片僅於本裝置預覽，後端會記錄照片數量；如需雲端保存原始檔案，需另行串接 Google Drive API。
                </p>

                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />

                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(p.id)} className="absolute top-0.5 right-0.5 bg-slate-900/70 rounded-full p-0.5">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-600 transition">
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] mt-0.5">上傳</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 sm:static sm:border-t-0 sm:pt-0 sm:px-5 sm:pb-5">
              {submitError && (
                <div className="mb-3 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-md py-3 flex items-center justify-center gap-2 transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    送出中...
                  </>
                ) : (
                  "送出通報"
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">本通報送出後將寫入雲端試算表，供後續稽核與追蹤。</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-emerald-600 px-5 py-6 text-center text-white">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
              <div className="font-bold text-lg">通報已送出</div>
              <div className="text-emerald-50 text-xs mt-1">Report submitted successfully</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">系統通報編號</div>
                <div className="text-xl font-bold text-slate-900 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ticket.id}</div>
              </div>

              <div className="border border-slate-200 rounded-md divide-y divide-slate-200 text-sm">
                <Row label="通報時間" value={new Date(ticket.datetime).toLocaleString("zh-TW")} mono />
                <Row label="發生地點" value={ticket.location} />
                <Row label="事件類型" value={ticket.type} />
                <Row
                  label="嚴重程度"
                  value={
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${severityBadge(ticket.severity)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${severityDot(ticket.severity)}`}></span>
                      {ticket.severity}
                    </span>
                  }
                />
                <Row label="事件描述" value={<span className="whitespace-pre-wrap">{ticket.description}</span>} block />
                {ticket.photos.length > 0 && (
                  <Row
                    label="現場照片"
                    value={
                      <div className="flex flex-wrap gap-2 mt-1">
                        {ticket.photos.map((p) => (
                          <img key={p.id} src={p.url} alt={p.name} className="w-14 h-14 object-cover rounded-md border border-slate-200" />
                        ))}
                      </div>
                    }
                    block
                  />
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-xs text-slate-500 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                此通報已寫入雲端試算表，如為嚴重事件將立即通知值班主管。
              </div>

              <button type="button" onClick={resetForm} className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-md py-3 transition">
                填寫新通報
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono, block }) {
  return (
    <div className={`px-4 py-3 ${block ? "" : "flex items-center justify-between gap-4"}`}>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="text-slate-800 font-medium" style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : {}}>{value}</div>
    </div>
  );
}

function severityBadge(v) {
  if (v === "輕微") return "bg-emerald-50 text-emerald-700";
  if (v === "一般") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}
function severityDot(v) {
  if (v === "輕微") return "bg-emerald-500";
  if (v === "一般") return "bg-amber-500";
  return "bg-rose-500";
}
