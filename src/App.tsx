/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  BarChart2, 
  Settings, 
  Droplets,
  Droplet,
  Wind, 
  Activity, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CloudRain,
  CloudLightning,
  CloudSun,
  Snowflake,
  Sun,
  Flame,
  Search,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Thermometer, 
  Target,
  Calendar,
  AlertCircle,
  PlusCircle,
  Stethoscope,
  LayoutDashboard,
  Clock,
  CheckCircle,
  CheckCircle2,
  Zap,
  Cpu,
  ShieldCheck,
  Database,
  Sparkles,
  Plus,
  Layers,
  Wallet,
  TrendingUp,
  TrendingDown,
  Banknote,
  Scale,
  Users,
  Download,
  Upload,
  HardDrive,
  Save,
  Cloud,
  History,
  Trash2,
  X,
  Moon,
  LogOut,
  FileText,
  Copy,
  Terminal,
  Info,
  Layout,
  Minus,
  Edit3,
  Check,
  Eye,
  EyeOff,
  Bird,
  LayoutGrid,
  Coins,
  Globe,
  Baby,
  Package,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Egg,
  Wheat,
  Gem,
  Box,
  Square,
  Lock,
  Sliders,
  ShieldAlert,
  Wrench,
  Hammer,
  Send,
  Facebook,
  MessageCircle,
  Headphones,
  PhoneCall,
  LifeBuoy,
  Bell,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { 
  Strain, 
  getDailyStats, 
  getTargetTemperature,
  getTargetHumidity,
  CLIMATE_FACTORS, 
  MEDICATIONS, 
  DailyData 
} from '@/src/lib/data';
import { EnvironmentalLoadService, EnvironmentalLoadResult } from '@/src/lib/environmentalLoad';
import { EXPERT_DATABASE, ExpertTip } from '@/src/lib/expertData';
import { cn } from '@/src/lib/utils';
import { 
  auth, 
  googleProvider, 
  facebookProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from '@/src/lib/firebase';
import { Preferences } from '@capacitor/preferences';

// --- Constants ---
/** 
 * تنبيه هام للمستخدم:
 * الرابط أدناه هو رابط "ملف الجدول"، وهذا لا يعمل كنقطة اتصال (API).
 * يجب عليك:
 * 1. فتح ملف جوجل شيت الخاص بك.
 * 2. الذهاب إلى Extensions -> Apps Script.
 * 3. لصق الكود الذي أرسلته لي هناك.
 * 4. الضغط على Deploy -> New Deployment -> Web App.
 * 5. جعل الـ Access: "Anyone".
 * 6. نسخ "Web App URL" ووضعه في ملف server.ts في مسار /api/auth/sheets.
 */
const SHEETS_AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbx0VJfftf57D0D4_RS5kfBqQ7RRxQyPTb6N7DfGr37Kz-kR2PPI73DpCv0NZy_estRz/exec'; 

// --- API Helpers ---
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx0VJfftf57D0D4_RS5kfBqQ7RRxQyPTb6N7DfGr37Kz-kR2PPI73DpCv0NZy_estRz/exec';

const smartFetch = async (url: string, options: any = {}) => {
  // Ensure we have a full URL
  let targetUrl = url;
  if (!url.startsWith('http')) {
    if (Capacitor.isNativePlatform()) {
      // On APK, we must use the hardcoded GAS URL because we don't have a local Express server
      targetUrl = API_BASE_URL;
      if (url !== SHEETS_AUTH_API_URL && url !== '/api/auth/sheets') {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}route=${encodeURIComponent(url)}`;
      }
    } else {
      // In the browser (Web Preview), use the local Express server directly
      // This is more reliable and avoids CORS issues with Google Script
      targetUrl = url.startsWith('/') ? url : `/${url}`;
    }
  }
  
  if (Capacitor.isNativePlatform()) {
    try {
      console.log(`SmartFetch (Native): fetching ${targetUrl}`);

      const response = await CapacitorHttp.request({
        url: targetUrl,
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json, text/plain, text/csv, */*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
          'Cache-Control': 'no-cache',
          ...(options.headers || {})
        },
        data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        connectTimeout: 30000,
        readTimeout: 30000
      });
      
      const resData = response.data;
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => {
          if (typeof resData === 'string') {
            try { 
              return JSON.parse(resData); 
            } catch (e) { 
              console.error("JSON Parse Error in smartFetch:", e, "Data snippet:", resData.substring(0, 100));
              throw new Error("استجابة السيرفر ليست بتنسيق JSON صحيح. ربما الرابط غير صحيح أو السيرفر يواجه مشكلة.");
            }
          }
          return resData;
        },
        text: async () => typeof resData === 'string' ? resData : JSON.stringify(resData),
        headers: {
          get: (name: string) => response.headers[name] || response.headers[name.toLowerCase()]
        }
      } as any;
    } catch (error: any) {
      console.error("CapacitorHttp error:", error);
      // Fallback to regular fetch if CapacitorHttp fails
      return fetch(targetUrl, options);
    }
  }
  return fetch(targetUrl, options);
};

if (Capacitor.isNativePlatform() && !API_BASE_URL) {
  console.warn("تنبيه: API_BASE_URL غير معرف! هذا قد يعطل الاتصال بالسيرفر في الـ APK.");
}

// --- Types ---
type Screen = 'gateway' | 'landing' | 'login' | 'dashboard' | 'medication' | 'climate' | 'ventilation' | 'humidity' | 'environmental_load' | 'charts' | 'setup' | 'battery' | 'heating' | 'finances' | 'management' | 'weather' | 'expert' | 'market' | 'workshop';

const STRAIN_NAMES: Record<Strain, string> = {
  Cobb: 'كوب',
  Ross: 'روس',
  Avian: 'إيفيان',
  Arbo: 'أربو',
  IR: 'أي آر',
  Hubbard: 'هبرد'
};

// --- Utils ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const WeatherScreen = ({ 
  age, 
  thi, 
  targetThi,
  weather,
  loading,
  error,
  locationName,
  onSearch,
  onRetry,
  onLocationSelect,
  onNavigate
}: { 
  age: number, 
  thi: number, 
  targetThi: number,
  weather: any,
  loading: boolean,
  error: string | null,
  locationName: string,
  onSearch: (query: string) => Promise<any[]>,
  onRetry: () => void,
  onLocationSelect: (lat: number, lon: number, name?: string) => void,
  onNavigate: (screen: Screen) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const getTargetTemp = (day: number) => {
    if (day <= 3) return 33;
    if (day <= 7) return 31;
    if (day <= 14) return 28;
    if (day <= 21) return 25;
    if (day <= 28) return 22;
    return 20;
  };

  const getPoultryAdvice = (temp: number, rh: number, wind: number, age: number) => {
    const advices = [];
    const targetT = getTargetTemp(age);

    if (temp > targetT + 3) advices.push(`الحرارة الحالية (${Math.round(temp)}°م) أعلى من المطلوب لعمر ${age} يوم (${targetT}°م). زد التهوية.`);
    if (temp < targetT - 3) advices.push(`الحرارة الحالية (${Math.round(temp)}°م) أقل من المطلوب لعمر ${age} يوم (${targetT}°م). تأكد من التدفئة.`);
    if (rh > 75) advices.push('الرطوبة الخارجية مرتفعة: اعتمد على زيادة سرعة الهواء.');
    if (wind > 25) advices.push('رياح قوية خارجية: تأكد من إحكام غلق الستائر لمنع التيارات الهوائية.');
    
    if (advices.length === 0) advices.push(`الجو الخارجي مثالي لاحتياجات الطيور في عمر ${age} يوم.`);
    return advices;
  };

  const searchLocations = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getWeatherIcon = (code: number, size = 32) => {
    if (code === 0) return <Sun className="text-amber-400" size={size} strokeWidth={1.5} />;
    if (code <= 3) return <CloudSun className="text-sky-400" size={size} strokeWidth={1.5} />;
    if (code <= 48) return <Cloud className="text-slate-400" size={size} strokeWidth={1.5} />;
    if (code <= 67) return <CloudRain className="text-blue-500" size={size} strokeWidth={1.5} />;
    if (code <= 77) return <Snowflake className="text-slate-200" size={size} strokeWidth={1.5} />;
    if (code <= 99) return <CloudLightning className="text-purple-500" size={size} strokeWidth={1.5} />;
    return <Cloud size={size} strokeWidth={1.5} />;
  };

  const getWeatherLabel = (code: number) => {
    if (code === 0) return 'صافي';
    if (code <= 3) return 'غائم جزئياً';
    if (code <= 48) return 'ضباب';
    if (code <= 67) return 'أمطال خفيفة';
    if (code <= 77) return 'ثلوج';
    if (code <= 99) return 'عواصف رعدية';
    return 'غير معروف';
  };

  if (loading && !weather) return (
    <div className="flex flex-col items-center justify-center p-12 gap-4">
      <RefreshCw size={32} className="text-blue-500 animate-spin" />
      <p className="text-white font-bold text-center">جاري رصد الطقس...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-24"
    >
      {/* Dynamic Header */}
      <div className="relative z-[100]">
        <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={onRetry}
            disabled={loading}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300 border shadow-lg bg-slate-900/60 text-blue-400 border-white/5 hover:bg-slate-900",
              loading && "opacity-50 cursor-not-allowed"
            )}
            title="تحديث البيانات"
          >
            <RefreshCw size={20} className={cn(loading && "animate-spin")} />
          </button>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300 border shadow-lg",
              showSearch ? "bg-white text-slate-900 border-white" : "bg-slate-900/60 text-blue-400 border-white/5 hover:bg-slate-900"
            )}
          >
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
          <div className="text-right">
            <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2 justify-end">
              {locationName}
              <MapPin size={22} className="text-blue-500" />
            </h2>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">بيانات طقس مباشرة</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 bg-slate-900/95 p-5 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4 z-[101]"
            >
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="ابحث عن مدينة أو منطقة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchLocations()}
                  className="bg-slate-950 border border-white/5 rounded-2xl w-full text-right px-12 py-4 text-white font-black text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  dir="rtl"
                />
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-blue-500 transition-colors" />
                {searchQuery && (
                  <button onClick={searchLocations} className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black text-xs hover:bg-blue-500 transition-colors">
                    بحث
                  </button>
                )}
              </div>
              
              {isSearching && (
                <div className="flex justify-center py-4">
                  <RefreshCw className="animate-spin text-blue-500" size={20} />
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {searchResults.map((res, i) => (
                    <button
                      key={`${res.latitude}-${res.longitude}-${i}`}
                      onClick={() => {
                        onLocationSelect(res.latitude, res.longitude, res.name);
                        setSearchResults([]);
                        setSearchQuery('');
                        setShowSearch(false);
                      }}
                      className="w-full text-right p-4 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-between group transition-all border border-transparent hover:border-white/5"
                    >
                      <ChevronLeft size={16} className="text-slate-700 group-hover:text-blue-500" />
                      <div className="text-right">
                        <p className="text-white font-black text-sm">{res.name}</p>
                        <p className="text-slate-500 text-[10px] font-bold mt-0.5">{res.admin1}, {res.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-10 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle size={32} />
          </div>
          <p className="text-white font-black text-center">{error}</p>
          <button 
            onClick={onRetry}
            className="bg-white px-8 py-3 rounded-2xl text-slate-900 font-black text-sm hover:scale-105 transition-transform"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* Main Weather Visual */}
          <div className="relative overflow-hidden group">
             {/* Dynamic Light Background */}
             <div className="absolute inset-0 bg-blue-600/10 blur-[120px] rounded-full translate-y-[-50%] animate-pulse" />
             
             <div className="relative bg-slate-900/60 backdrop-blur-md p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="text-center md:text-right flex flex-col items-center md:items-end">
                      <span className="text-blue-400 font-black tracking-widest text-[10px] uppercase mb-1 bg-blue-500/10 px-3 py-1 rounded-full">الحالة الراهنة</span>
                      <div className="flex items-center gap-6 mt-2">
                         <div className="flex flex-col items-center md:items-end order-2 md:order-1">
                            <span className="text-white font-black text-2xl tracking-tighter drop-shadow-md">{getWeatherLabel(weather?.current_weather?.weathercode)}</span>
                            <span className="text-slate-500 font-bold text-xs mt-1">سماء {getWeatherLabel(weather?.current_weather?.weathercode).includes('غائم') ? 'مغطاة' : 'صافية كلياً'}</span>
                         </div>
                         <h1 className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl order-1 md:order-2 tabular-nums">
                            {Math.round(weather?.current_weather?.temperature)}°
                         </h1>
                      </div>
                   </div>
                   
                   <div className="relative">
                      <div className="absolute inset-0 bg-blue-400/20 blur-3xl scale-150 animate-pulse rounded-full" />
                      <div className="relative transition-transform duration-700 hover:scale-110">
                         {getWeatherIcon(weather?.current_weather?.weathercode, 120)}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 rounded-[2rem] bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center gap-2 group/stat">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/stat:scale-110 transition-transform">
                        <Wind size={20} />
                      </div>
                      <div className="text-center">
                         <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest block mb-0.5">سرعة الرياح</span>
                         <span className="text-white font-black text-lg tabular-nums">{weather?.current_weather?.windspeed} <span className="text-[10px] text-slate-500">كم/س</span></span>
                      </div>
                   </div>
                   <div className="p-5 rounded-[2rem] bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center gap-2 group/stat">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover/stat:scale-110 transition-transform">
                        <Droplets size={20} />
                      </div>
                      <div className="text-center">
                         <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest block mb-0.5">رطوبة الجو</span>
                         <span className="text-white font-black text-lg tabular-nums">{weather?.daily?.relative_humidity_2m_max[0]} <span className="text-[10px] text-slate-500">%</span></span>
                      </div>
                   </div>
                </div>

                {/* Linked Internal THI Card */}
                <div className="pt-8 border-t border-white/5 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">مؤشر الإجهاد الداخلي (الحالي)</span>
                      </div>
                      <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-white/5 flex items-baseline gap-1.5 shadow-inner">
                         <span className={cn(
                           "text-2xl font-black tabular-nums tracking-tighter",
                           thi < targetThi - 2 ? "text-blue-400" : 
                           thi < (targetThi + 1.5) ? "text-emerald-400" : 
                           "text-red-400"
                         )}>{thi.toFixed(1)}</span>
                         <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">THI</span>
                      </div>
                   </div>

                   <div className={cn(
                     "p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group/status",
                     thi < targetThi - 2 ? "bg-blue-500/5 border-blue-500/10 shadow-[0_0_50px_-20px_rgba(59,130,246,0.3)]" :
                     thi < (targetThi + 1.5) ? "bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_50px_-20_rgba(16,185,129,0.3)]" :
                     "bg-red-500/5 border-red-500/10 shadow-[0_0_50px_-20_rgba(239,68,68,0.3)]"
                   )}>
                     <div className="flex items-center gap-5 relative z-10">
                       <div className={cn(
                         "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover/status:scale-105",
                         thi < targetThi - 2 ? "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10 shadow-xl" :
                         thi < (targetThi + 1.5) ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10 shadow-xl" :
                         "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/10 shadow-xl"
                       )}>
                         <Zap size={28} strokeWidth={2.5} />
                       </div>
                       <div className="flex-1 space-y-2">
                         <p className="text-xs text-white font-black leading-tight tracking-tight">
                             {thi < targetThi - 2 ? "تحذير: الوضع بارد جداً على الطيور بالداخل" :
                              thi < (targetThi + 1.5) ? "الوضع البيئي داخل العنبر مثالي ومستقر" :
                              "تنبيه: بدأ ظهور مؤشرات إجهاد حراري"}
                         </p>
                         <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-[90%]">
                             {thi > targetThi + 1.5 ? "الجو الخارجي الحار يرفع درجة حرارة العنبر، يرجى تفعيل أنظمة التبريد." : "تتحكم أنظمة التهوية بذكاء في استيعاب التغيرات الجوية الخارجية."}
                         </p>
                       </div>
                     </div>
                   </div>
                </div>
             </div>
          </div>

          {/* AI Advice Box */}
          <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-5 relative group overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] pointer-events-none" />
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 border border-blue-500/10">
                       <Cpu size={18} />
                   </div>
                   <div className="text-right">
                      <h3 className="text-white font-black text-sm tracking-tight">توصيات الخبير الذكية</h3>
                      <p className="text-slate-500 text-[10px] font-bold">بناءً على عمر {age} يوم والطقس الحالي</p>
                   </div>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-white/5">
                   <Sparkles size={14} className="text-blue-500 animate-pulse" />
                </div>
             </div>

             <div className="grid gap-3">
                {getPoultryAdvice(
                    weather.current_weather.temperature, 
                    weather.daily.relative_humidity_2m_max[0],
                    weather.current_weather.windspeed,
                    age
                ).map((advice, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="text-slate-300 text-[11px] font-black leading-relaxed text-right p-4 rounded-[1.5rem] bg-slate-950/60 border border-white/5 hover:border-blue-500/20 transition-colors flex items-start gap-3 justify-end"
                    >
                        <span className="flex-1">{advice}</span>
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                    </motion.div>
                ))}
             </div>
          </div>

          {/* Forecast Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 border border-white/5">
                     <Calendar size={20} />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tighter">التوقعات الأسبوعية</h3>
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">7 أيام</span>
            </div>

            <div className="grid gap-3">
              {weather?.daily?.time.map((date: string, i: number) => (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  key={`${date}-${i}`} 
                  className="bg-slate-900/60 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group transition-all hover:bg-slate-900/80 hover:border-blue-500/20"
                >
                  <div className="flex items-center gap-6 text-left shrink-0">
                    <div className="flex flex-col items-center">
                       <span className="text-white font-black text-lg tabular-nums drop-shadow-sm">{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                       <span className="text-slate-600 font-bold text-[10px] tracking-widest uppercase">عظمى</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-white/5 pl-6">
                       <span className="text-slate-500 font-bold text-lg tabular-nums">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                       <span className="text-slate-600 font-bold text-[10px] tracking-widest uppercase">صغرى</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right hidden sm:block">
                       <span className="text-blue-400 font-black text-[10px] uppercase tracking-widest block mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{getWeatherLabel(weather.daily.weathercode[i])}</span>
                       <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-slate-500">
                          <Droplets size={10} className="text-cyan-400" />
                          <span>رطوبة {weather.daily.relative_humidity_2m_max[i]}%</span>
                       </div>
                    </div>
                    
                    <div className="w-14 h-14 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                       {getWeatherIcon(weather.daily.weathercode[i], 32)}
                    </div>

                    <div className="text-right min-w-[100px]">
                        <p className="text-white font-black text-sm tracking-tight">
                            {i === 0 ? 'اليوم' : new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' })}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold mt-0.5">
                            {new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

const ExpertScreen = ({ age, onNavigate }: { age: number, onNavigate: (screen: Screen) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'جميع الأقسام' | ExpertTip['category']>('جميع الأقسام');

  const categories: ('جميع الأقسام' | ExpertTip['category'])[] = [
    'جميع الأقسام', 'حرارة', 'تهوية', 'تغذية', 'ماء', 'إضاءة', 'صحة', 'بطاريات', 'فرشة', 'عام'
  ];

  const filteredTips = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    // Enhanced Arabic normalization for more effective search
    const normalize = (text: string) => text.toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[\u064B-\u0652]/g, ''); // Remove Tashkeel

    const nQ = normalize(q);

    return EXPERT_DATABASE.filter(tip => {
      const matchesSearch = nQ === '' || 
        normalize(tip.title).includes(nQ) || 
        normalize(tip.content).includes(nQ);
      
      const matchesCategory = selectedCategory === 'جميع الأقسام' || tip.category === selectedCategory;
      const ageNum = toNum(age);
      const isAgeRelevant = ageNum >= tip.minAge && ageNum <= tip.maxAge;
      
      // The user wants displayed recommendations to be specific to current chick age.
      // We apply this strictly to keep the view focused.
      return matchesSearch && matchesCategory && isAgeRelevant;
    });
  }, [searchQuery, selectedCategory, age]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-24"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
           <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2 justify-end">
            اسأل الخبير
            <MessageSquare size={24} className="text-blue-500" />
           </h2>
        </div>
        <p className="text-slate-500 font-bold text-sm">قاعدة بيانات شاملة لتربية التسمين في البطاريات (1-35 يوم)</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative group">
          <input 
            type="text"
            placeholder="ابحث عن نصائح، مشاكل، أو حلول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/60 border border-white/5 rounded-2xl w-full text-right px-12 py-4 text-white font-black text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all backdrop-blur-md shadow-xl"
            dir="rtl"
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-blue-500 transition-colors" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                selectedCategory === cat 
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20" 
                  : "bg-slate-900/60 text-slate-500 border-white/5 hover:bg-slate-900"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Relevant Tips Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">توصيات مخصصة لعمر {age} يوم</span>
        </div>
      </div>

      {/* Tips List */}
      <div className="grid gap-4">
        {filteredTips.map((tip) => {
          const isAgeRelevant = age >= tip.minAge && age <= tip.maxAge;
          
          return (
            <motion.div 
              layout
              key={tip.id}
              className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group",
                isAgeRelevant 
                  ? "bg-slate-900/80 border-blue-500/20 shadow-xl" 
                  : "bg-slate-900/40 border-white/5 opacity-80 shadow-inner"
              )}
            >
              {isAgeRelevant && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[40px] -z-10" />
              )}
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="bg-slate-950/60 px-2 py-1 rounded-lg text-[8px] font-black text-slate-500 border border-white/5">يوم {tip.minAge}-{tip.maxAge}</span>
                    <span className="bg-blue-500/10 px-2 py-1 rounded-lg text-[8px] font-black text-blue-400 border border-blue-500/10">{tip.category}</span>
                  </div>
                  <h4 className="text-white font-black text-lg mb-3 leading-tight tracking-tight">{tip.title}</h4>
                  <p className="text-slate-400 font-bold text-xs leading-relaxed">{tip.content}</p>
                </div>
                
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                  isAgeRelevant ? "bg-blue-600/10 border-blue-500/20 text-blue-400 shadow-blue-500/10 shadow-xl" : "bg-slate-950 border-white/10 text-slate-600 shadow-inner"
                )}>
                  {isAgeRelevant ? <Sparkles size={24} /> : <Info size={24} />}
                </div>
              </div>

              {isAgeRelevant && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-end gap-2">
                  <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-widest">توصية حرجة لعمرك الحالي</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                </div>
              )}
            </motion.div>
          );
        })}

        {filteredTips.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-900/60 rounded-3xl flex items-center justify-center mx-auto text-slate-700 border border-white/5">
              <Search size={32} />
            </div>
            <div>
              <p className="text-white font-black">لا توجد نتائج بحث</p>
              <p className="text-slate-500 font-bold text-xs mt-1">حاول البحث بكلمات مختلفة أو تغيير القسم</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const WorkshopScreen = ({ onNavigate }: { onNavigate: (screen: Screen) => void }) => {
  const whatsappLink = `https://wa.me/201115127032?text=${encodeURIComponent('السلام عليكم ورحمة الله وبركاته، أود الاستفسار وطلب عرض سعر لتجهيزات وبطاريات دواجن ومستلزمات العنابر لمزرعتي.')}`;
  const telegramLink = `https://t.me/smartpoultrymanager`;
  const facebookLink = `https://www.facebook.com/profile.php?id=61589961329928`;

  return (
    <div className="space-y-6 text-right pb-24" dir="rtl">
      {/* Premium Header */}
      <header className="px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 justify-start">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <h2 className="text-2xl font-black text-white tracking-tight">مركز خدمة العملاء والدعم المباشر</h2>
          </div>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            تواصل مباشر وحصري للحصول على أفضل الحلول الهندسية لتصميم وتفصيل بطاريات الدواجن وتوفير جميع مستلزمات تجهيز العنابر بأعلى كفاءة وجودة.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-full self-start sm:self-auto shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black text-slate-300">ممثلو الدعم متصلون الآن (حالة نشطة)</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Quality Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: "استشارات فنية مجانية 🩺",
              desc: "مساعدتك في اختيار المقاس المناسب لحجم عنبرك وموقع مشروعك بأعلى كفاءة هندسية.",
              color: "border-indigo-500/10 hover:border-indigo-500/30",
              iconBg: "bg-indigo-500/10 text-indigo-400"
            },
            {
              title: "جميع مستلزمات تجهيز العنابر 📐",
              desc: "تأمين كامل خطوط النبل، السقايات والعلّافات الأوتوماتيكية، لوحات التحكم، والتهوية وأنظمة خلايا التبريد والبطاريات.",
              color: "border-amber-500/10 hover:border-amber-500/30",
              iconBg: "bg-amber-500/10 text-amber-400"
            },
            {
              title: "دعم ومتابعة مستمرة 🚀",
              desc: "شحن وتوريد لجميع المحافظات مع تقديم إرشادات التركيب والصيانة وبرامج الرعاية المتكاملة.",
              color: "border-teal-500/10 hover:border-teal-500/30",
              iconBg: "bg-teal-500/10 text-teal-400"
            }
          ].map((badge, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-4 rounded-2xl bg-slate-950/40 border transition-all duration-300 hover:bg-slate-900/40 text-right group shadow-lg",
                badge.color
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 font-bold shadow-inner", badge.iconBg)}>
                  <LifeBuoy size={15} className="group-hover:rotate-45 transition-transform duration-500" />
                </div>
                <h4 className="text-xs font-black text-white">{badge.title}</h4>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                {badge.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Social Links Connections Card */}
        <Card className="bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl space-y-6 text-right">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/10 shadow-inner">
              <Headphones size={22} className="animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black text-indigo-400 tracking-wider uppercase bg-indigo-400/5 px-2 py-0.5 rounded-full border border-indigo-400/10 inline-block mb-1">
                خدمة العملاء الشاملة
              </span>
              <h4 className="text-base font-black text-white">صناعة وتفصيل بطاريات الدواجن وجميع مستلزمات تجهيز العنابر 📐</h4>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">
                طلب وتفصيل التجهيزات الحديثة وتأمين كافة مستلزمات التهوية، التدفئة، بطاريات التسمين والبياض لزيادة كفاءة عنبرك.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-2">
              <h5 className="text-xs font-black text-white flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                <span>قنوات التواصل وطلب عروض الأسعار والدعم المباشر</span>
              </h5>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">
                اختر القناة المفضلة لديك للتواصل الفوري مع مهندسينا وتلقي تفاصيل الأسعار ومواصفات الشحن والتركيب لجميع مستلزمات التجهيز والبطاريات:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* WhatsApp Contact Button */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-emerald-950/10 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                    <MessageCircle size={22} />
                  </div>
                  <div className="text-right">
                    <h5 className="text-xs font-black text-white">تواصل مبيعات عبر واتس آب (WhatsApp)</h5>
                    <p className="text-[10px] text-emerald-400/80 font-bold mt-0.5">دردشة فورية لطلب البطاريات وعروض أسعار جميع مستلزمات تجهيز العنابر</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:translate-x-[-4px] transition-transform">
                  <Send size={14} />
                </div>
              </a>

              {/* Telegram Contact Button */}
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-blue-950/10 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
                    <Send size={22} />
                  </div>
                  <div className="text-right">
                    <h5 className="text-xs font-black text-white">تواصل وقناة العروض عبر تلجرام (Telegram Channel)</h5>
                    <p className="text-[10px] text-blue-400/80 font-bold mt-0.5">انضم لقناتنا لمشاهدة خطوط الإنتاج والبطاريات وتجهيزات العنابر كاملة بالفيديو</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:translate-x-[-4px] transition-transform">
                  <Send size={14} />
                </div>
              </a>

              {/* Facebook Contact Button */}
              <a
                href={facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-indigo-950/10 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                    <Facebook size={22} />
                  </div>
                  <div className="text-right">
                    <h5 className="text-xs font-black text-white">تواصل ومتابعة عبر الفيسبوك (Facebook Page)</h5>
                    <p className="text-[10px] text-indigo-400/80 font-bold mt-0.5">الصفحة الرسمية لمتابعة عروض تصنيع البطاريات ومعارض مستلزمات العنابر</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:translate-x-[-4px] transition-transform">
                  <Send size={14} />
                </div>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MarketScreen = ({ 
  sellingPrice, 
  prevSellingPrice,
  lastPriceUpdateAt, 
  priceSource,
  exchangeRates,
  prevExchangeRates,
  goldPrices,
  prevGoldPrices,
  eggPrices,
  prevEggPrices,
  feedPrices,
  prevFeedPrices,
  chickPrices,
  prevChickPrices,
  loading,
  error,
  onRefresh,
  onNavigate
}: { 
  sellingPrice: number | string, 
  prevSellingPrice: number | string | null,
  lastPriceUpdateAt: string | null, 
  priceSource?: string,
  exchangeRates: any,
  prevExchangeRates: any,
  goldPrices: any,
  prevGoldPrices: any,
  eggPrices: any[],
  prevEggPrices: any[],
  feedPrices: any[],
  prevFeedPrices: any[],
  chickPrices: any[],
  prevChickPrices: any[],
  loading: boolean,
  error: string | null,
  onRefresh: () => void,
  onNavigate: (screen: Screen) => void
}) => {
  const [activeTab, setActiveTab] = useState<'chicken' | 'eggs' | 'chicks' | 'feed' | 'gold' | 'currency'>('chicken');

  const tabs = [
    { id: 'chicken', label: 'الفراخ', icon: Bird, color: 'text-amber-200', bg: 'bg-amber-500/10', img: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800' },
    { id: 'eggs', label: 'البيض', icon: Egg, color: 'text-orange-200', bg: 'bg-orange-500/10', img: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800' },
    { id: 'chicks', label: 'كتاكيت بيضاء', icon: Bird, color: 'text-yellow-200', bg: 'bg-yellow-500/10', img: 'https://images.unsplash.com/photo-1627916607164-fa951b760731?auto=format&fit=crop&q=80&w=800' },
    { id: 'feed', label: 'الأعلاف', icon: Wheat, color: 'text-emerald-200', bg: 'bg-emerald-500/10', img: 'https://images.unsplash.com/photo-1543257580-7269da7816ce?auto=format&fit=crop&q=80&w=1200' },
    { id: 'gold', label: 'الذهب', icon: Gem, color: 'text-amber-100', bg: 'bg-amber-500/20', img: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=1200' },
    { id: 'currency', label: 'العملات', icon: Banknote, color: 'text-blue-100', bg: 'bg-blue-500/20', img: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&q=80&w=800' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32">
      <div className="flex items-center justify-end px-2">
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/10 disabled:opacity-50 shadow-lg backdrop-blur-xl group"
        >
          <div className={cn("p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20", loading ? 'animate-spin' : '')}>
            <RefreshCw size={18} />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-500 uppercase block leading-none">تحديث البورصة</span>
            <span className="text-sm font-bold block mt-0.5">تحديث فوري للأسعار</span>
          </div>
        </button>
      </div>

      <div className="relative h-64 sm:h-80 rounded-[3rem] overflow-hidden shadow-2xl group border border-white/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img 
              src={activeTabData?.img} 
              alt={activeTabData?.label}
              className="w-full h-full object-cover grayscale-[30%] group-hover:scale-110 transition-transform duration-[3s]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40" />
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute inset-0 flex flex-col items-center justify-end p-10 text-center gap-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={activeTab + "-label"}
            className="space-y-1"
          >
            <span className="text-amber-400/80 text-[10px] font-black uppercase tracking-[0.4em] block mb-2">قطاع التداول والبورصة</span>
            <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-none drop-shadow-2xl">
              {activeTabData?.label}
            </h2>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-full border border-white/5 backdrop-blur-3xl mx-auto w-full max-w-full overflow-x-auto no-scrollbar shadow-2xl px-4 justify-start sm:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "relative px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs font-black transition-all duration-500 overflow-hidden group whitespace-nowrap flex-shrink-0",
              activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={14} className={cn("transition-transform duration-500 group-hover:rotate-12", activeTab === tab.id ? "text-white" : "text-slate-600")} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="relative min-h-[440px]">
        <AnimatePresence mode="wait">
          {activeTab === 'chicken' && (
            <motion.div
              key="chicken"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white p-10 sm:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 opacity-[0.03] rotate-12">
                <Bird size={400} className="text-white" />
              </div>
              
              <div className="flex flex-col items-center justify-center text-center space-y-8 relative z-10">
                <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 shadow-xl group">
                  <Bird size={64} className="text-amber-400 drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" />
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.4em]">سعر التنفيذ اليوم - أرض المزرعة</h4>
                  <div className="flex flex-col sm:flex-row items-baseline justify-center gap-2">
                    <h1 className={cn(
                       "text-[8rem] sm:text-[12rem] font-bold tabular-nums leading-none tracking-tighter transition-all duration-1000",
                       prevSellingPrice && toNum(sellingPrice) > toNum(prevSellingPrice) ? "text-emerald-400" : (prevSellingPrice && toNum(sellingPrice) < toNum(prevSellingPrice) ? "text-red-500" : "text-white")
                    )}>
                      {sellingPrice}
                    </h1>
                    <div className="flex flex-row sm:flex-col items-center gap-1">
                      <span className="text-xl sm:text-2xl font-bold text-slate-500 italic">ج.م</span>
                    </div>
                  </div>
                  
                  {prevSellingPrice && toNum(sellingPrice) !== toNum(prevSellingPrice) && (
                    <div className={cn(
                      "flex items-center gap-2 justify-center py-2 px-4 rounded-full border text-xs font-black mx-auto w-fit",
                      toNum(sellingPrice) > toNum(prevSellingPrice) ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {toNum(sellingPrice) > toNum(prevSellingPrice) ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{Math.abs(toNum(sellingPrice) - toNum(prevSellingPrice)).toFixed(2)} ج.م عن سعر الأمس</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'eggs' && (
            <motion.div
              key="eggs"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px]" />
               <div className="flex items-center justify-between flex-row-reverse relative z-10 px-4 mb-8">
                  <div className="text-right">
                    <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tight">بورصة البيض</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1">تحديث أسعار كراتين البيض اليومي</p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 border border-orange-500/20">
                    <Egg size={28} />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 gap-4 relative z-10">
                  {eggPrices.map((egg, idx) => {
                    const prev = prevEggPrices[idx];
                    const diff = prev ? toNum(egg.price) - toNum(prev.price) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white hover:border-orange-500/60 transition-all duration-500 group shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-4 flex-row-reverse">
                          <div className="p-3 sm:p-4 bg-orange-500/5 rounded-xl text-orange-500/40 group-hover:text-orange-500 transition-colors">
                            <Layers size={20} />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-600 font-black tracking-widest uppercase block mb-1">كرتونة بيض</span>
                            <h4 className="text-slate-200 font-bold text-lg sm:text-xl group-hover:text-white transition-colors">{egg.label}</h4>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-3xl sm:text-4xl font-bold font-black tabular-nums transition-all duration-500",
                              diff > 0 ? "text-emerald-400" : (diff < 0 ? "text-red-500" : "text-white")
                            )}>{egg.price || '--'}</span>
                            <span className="text-xs font-bold text-slate-600 self-end mb-1">ج.م</span>
                          </div>
                          {diff !== 0 && (
                            <div className={cn("text-[10px] font-black flex items-center gap-1", diff > 0 ? "text-emerald-500/60" : "text-red-500/60")}>
                              {diff > 0 ? '+' : ''}{diff} {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          )}
                   {activeTab === 'chicks' && (
            <motion.div
              key="chicks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-neutral-900 border border-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden group/card"
            >
               {/* Cinematic Background Image for Chicks */}
               <div className="absolute inset-0 opacity-20 transition-opacity duration-700 group-hover/card:opacity-30">
                  <img 
                    src="https://images.unsplash.com/photo-1627916607164-fa951b760731?auto=format&fit=crop&q=80&w=1200" 
                    alt="Baby Chicks" 
                    className="w-full h-full object-cover transition-transform duration-10000 group-hover/card:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent" />
               </div>

               <div className="flex items-center justify-between flex-row-reverse relative z-10 px-4 mb-8">
                  <div className="text-right">
                    <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tight">بورصة الكتاكيت البيضاء</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1">أسعار كتاكيت أبيض عمر يوم - كبرى الشركات</p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 backdrop-blur-md rounded-2xl text-yellow-500 border border-yellow-500/10">
                    <Bird size={28} />
                  </div>
               </div>
               
               <div className="bg-black/40 backdrop-blur-xl rounded-[2rem] overflow-y-auto max-h-[600px] custom-scrollbar border border-white relative z-10 shadow-2xl">
                  <div className="grid grid-cols-2 bg-white/[0.05] border-b border-white sticky top-0 z-20">
                    <div className="p-4 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-widest text-right border-l border-white">الشركة المنتجة</div>
                    <div className="p-4 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-widest text-center">السعر (ج.م)</div>
                  </div>
                  <div className="divide-y divide-white">
                    {chickPrices.map((chick, idx) => {
                      const prev = prevChickPrices[idx];
                      const diff = prev ? toNum(chick.price) - toNum(prev.price) : 0;
                      return (
                        <div key={idx} className="grid grid-cols-2 hover:bg-white/[0.08] transition-all duration-300 group">
                          <div className="p-5 sm:p-6 text-right border-l border-white">
                            <span className="text-white font-bold text-base sm:text-xl group-hover:text-yellow-400 transition-colors duration-500 font-bold">{chick.company}</span>
                          </div>
                          <div className="p-5 sm:p-6 flex items-center justify-center gap-4 bg-white/[0.02]">
                            <span className={cn(
                              "font-black text-2xl sm:text-3xl font-bold tabular-nums transition-all duration-500",
                              diff > 0 ? "text-emerald-400" : (diff < 0 ? "text-red-500" : "text-white")
                            )}>{chick.price || '--'}</span>
                            {diff !== 0 && (
                              <div className={cn("p-1.5 rounded-lg border", diff > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                                {diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-neutral-900 border border-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden group/card"
            >
               {/* Cinematic Background Image for Feed */}
               <div className="absolute inset-0 opacity-25 transition-opacity duration-700 group-hover/card:opacity-40">
                  <img 
                    src="https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1200" 
                    alt="Agricultural Grain" 
                    className="w-full h-full object-cover transition-transform duration-10000 group-hover/card:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
               </div>

               <div className="flex items-center justify-between flex-row-reverse relative z-10 px-4 mb-8">
                  <div className="text-right">
                    <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tight">بورصة الأعلاف</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1">أسعار قناديل الذرة والقمح (سعر الطن اليومي)</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 backdrop-blur-md rounded-2xl text-emerald-400 border border-emerald-500/10">
                    <Wheat size={28} />
                  </div>
               </div>
               
               <div className="max-w-4xl mx-auto relative z-10">
                  {/* Desktop Table View */}
                  <div className="hidden sm:block bg-black/40 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-right min-w-[600px] border-collapse">
                        <thead className="bg-white/[0.05] border-b border-white">
                            <tr className="text-emerald-400 text-[11px] font-black uppercase tracking-[0.2em] text-center">
                              <th className="py-6 pr-8 text-right bg-white/[0.02] border-l border-white">الشركة المصنعة</th>
                              <th className="py-6 border-l border-white">بادي 23%</th>
                              <th className="py-6 border-l border-white">نامي 21%</th>
                              <th className="py-6">ناهي 19%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white">
                            {feedPrices.map((feed, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.08] transition-all duration-300 group">
                                <td className="py-7 pl-2 pr-8 text-white font-bold text-xl font-bold bg-white/[0.01] group-hover:text-emerald-400 transition-colors border-l border-white">{feed.company}</td>
                                <td className="py-7 px-2 text-center text-emerald-400 font-black tabular-nums font-bold text-xl bg-white/[0.02] border-l border-white">{feed.starter?.toLocaleString() || '--'}</td>
                                <td className="py-7 px-2 text-center text-emerald-300 font-black tabular-nums font-bold text-xl bg-white/[0.01] border-l border-white">{feed.grower?.toLocaleString() || '--'}</td>
                                <td className="py-7 px-2 text-center text-emerald-200 font-black tabular-nums font-bold text-xl">{feed.finisher?.toLocaleString() || '--'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Mobile-First Card View */}
                  <div className="sm:hidden space-y-4">
                    {feedPrices.map((feed, idx) => (
                      <div key={idx} className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl" />
                        <div className="flex items-center justify-between flex-row-reverse border-b border-white pb-4">
                           <h4 className="text-white font-bold text-xl font-black">{feed.company}</h4>
                           <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                             <Wheat size={16} />
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-black uppercase mb-2">بادي 23%</span>
                              <span className="text-lg font-bold font-black text-emerald-400 tabular-nums">{feed.starter?.toLocaleString() || '--'}</span>
                           </div>
                           <div className="flex flex-col items-center border-x border-white px-1">
                              <span className="text-[10px] text-slate-500 font-black uppercase mb-2">نامي 21%</span>
                              <span className="text-lg font-bold font-black text-emerald-300 tabular-nums">{feed.grower?.toLocaleString() || '--'}</span>
                           </div>
                           <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-black uppercase mb-2">ناهي 19%</span>
                              <span className="text-lg font-bold font-black text-emerald-200 tabular-nums">{feed.finisher?.toLocaleString() || '--'}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'gold' && (
            <motion.div
              key="gold"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neutral-900 border border-white/20 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] via-transparent to-transparent" />
               <div className="flex items-center justify-between flex-row-reverse relative z-10 px-4 mb-10">
                  <div className="text-right">
                    <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tight">بورصة الذهب</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1">أسعار الذهب والسبائك محلياً</p>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
                    <Gem size={28} />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {goldPrices && Object.entries(goldPrices).map(([key, data]: [string, any], idx) => {
                    const prevData = prevGoldPrices ? prevGoldPrices[key] : null;
                    const sellDiff = prevData ? toNum(data.sell) - toNum(prevData.sell) : 0;
                    return (
                      <div key={key} className="p-6 rounded-3xl bg-white/[0.02] border border-white hover:border-amber-500/60 transition-all duration-500 group group-hover:translate-y-[-4px]">
                        <div className="flex items-center justify-between flex-row-reverse mb-6">
                          <span className="text-[10px] text-slate-600 font-black tracking-widest uppercase">{key === 'unit' ? 'العيار' : 'الوزن'}</span>
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] font-black",
                            sellDiff > 0 ? "text-emerald-400" : (sellDiff < 0 ? "text-red-500" : "text-slate-500")
                          )}>
                            {sellDiff !== 0 && (sellDiff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
                            {sellDiff !== 0 ? Math.abs(sellDiff).toFixed(1) : ''}
                          </div>
                        </div>
                        
                        <h4 className="text-slate-200 font-bold text-xl mb-4 group-hover:text-amber-400 transition-colors text-right">{data.label || key}</h4>
                        
                        <div className="flex items-center justify-between gap-4 border-t border-white pt-4">
                          <div className="text-center group-hover:scale-110 transition-transform flex-1">
                            <span className="text-[9px] text-slate-700 font-black uppercase block mb-1">شراء</span>
                            <span className="text-xl font-bold font-bold text-white tabular-nums">{Number(data.buy).toLocaleString()}</span>
                          </div>
                          <div className="w-[1px] h-8 bg-white" />
                          <div className="text-center group-hover:scale-110 transition-transform flex-1">
                            <span className="text-[9px] text-slate-700 font-black uppercase block mb-1">بيع</span>
                            <span className="text-xl font-bold font-bold text-amber-400 tabular-nums">{Number(data.sell).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          )}

          {activeTab === 'currency' && (
            <motion.div
              key="currency"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              className="bg-neutral-900 border border-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px]" />
               <div className="flex items-center justify-between flex-row-reverse relative z-10 px-4 mb-10">
                  <div className="text-right">
                    <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tight">أسعار الصرف</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1">تحديث لحظي لأسعار العملات مقابل الجنيه</p>
                  </div>
                  <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <Banknote size={28} />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                  {[
                    { label: 'دولار / جنيه', pair: 'USD / EGP', value: exchangeRates?.EGP_USD ? Number(exchangeRates.EGP_USD).toFixed(2) : (exchangeRates?.EGP ? Number(exchangeRates.EGP).toFixed(2) : '--.--'), prev: prevExchangeRates?.EGP_USD || prevExchangeRates?.EGP, icon: <Globe size={24} /> },
                    { label: 'ريال / جنيه', pair: 'SAR / EGP', value: exchangeRates?.EGP_SAR ? Number(exchangeRates.EGP_SAR).toFixed(2) : (exchangeRates?.EGP && exchangeRates?.SAR ? (exchangeRates.EGP / exchangeRates.SAR).toFixed(2) : '--.--'), prev: prevExchangeRates?.EGP_SAR, icon: <MapPin size={24} /> },
                    { label: 'ريال / دولار', pair: 'SAR / USD', value: exchangeRates?.SAR_USD ? Number(exchangeRates.SAR_USD).toFixed(4) : (exchangeRates?.SAR ? Number(exchangeRates.SAR).toFixed(4) : '--.--'), prev: prevExchangeRates?.SAR_USD, icon: <RefreshCw size={24} /> },
                  ].map((rate, i) => {
                    const priceDiff = rate.prev ? toNum(rate.value) - toNum(rate.prev) : 0;
                    return (
                      <div key={i} className="flex flex-col p-6 sm:p-8 rounded-[2rem] bg-white/[0.02] border border-white hover:border-indigo-500/60 transition-all duration-500 group shadow-lg backdrop-blur-xl hover:translate-y-[-4px]">
                         <div className="flex items-center justify-between flex-row-reverse mb-6">
                            <div className="p-3 bg-white/5 rounded-xl text-slate-700 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all duration-700">
                               {rate.icon}
                            </div>
                            <span className="text-[10px] text-slate-600 font-black tracking-widest uppercase">{rate.pair}</span>
                         </div>
                         
                         <div className="text-right mb-4">
                            <h4 className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">{rate.label}</h4>
                         </div>
                         
                         <div className="flex items-center justify-between flex-row-reverse border-t border-white/[0.03] pt-4">
                            <span className={cn(
                              "text-3xl sm:text-4xl font-bold font-black tabular-nums",
                              priceDiff !== 0 ? "text-red-500" : "text-white"
                            )}>
                              {rate.value}
                            </span>
                            {priceDiff !== 0 && (
                              <div className={cn("text-[10px] font-black", priceDiff > 0 ? "text-emerald-500/60" : "text-red-500/60")}>
                                {priceDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              </div>
                            )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warning/Source Info */}
      <div className="p-6 bg-slate-900/60 rounded-[3rem] border border-white/5 flex gap-4 items-start backdrop-blur-xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[60px]" />
         <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 relative z-10">
           <Info size={20} />
         </div>
         <div className="flex-1 text-right relative z-10">
            <h4 className="text-white font-black text-sm mb-1">توضيح هام</h4>
            <p className="text-slate-500 text-xs font-bold leading-relaxed">
              جميع الأسعار المعروضة هي أسعار استرشادية يتم تحديثها دورياً من كبرى شركات التداول، وقد تختلف الأسعار التنفيذية في أرض الواقع قليلاً حسب المنطقة وتكلفة النقل وحجم العرض والطلب.
            </p>
          </div>
       </div>
    </div>
  );
};

const CUSTOM_MED_LIST = [
  { name: 'محلول معالجة جفاف', dose: 5, unit: 'جرام/لتر', duration: 8 },
  { name: 'أملاح معدنية (اليكتروليت)', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'أحماض أمينية', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'أحماض عضوية', dose: 0.5, unit: 'سم³/لتر', duration: 8 },
  { name: 'فيتامين C', dose: 1, unit: 'جرام/لتر', duration: 4 },
  { name: 'فيتامين أد3هـ (AD3E)', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'فيتامين هـ + سيلينيوم (E+Se)', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'فيتامين ب.ك كولين (B-K)', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'غسيل كلوي + منشط كبد', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'غسيل كلوي', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'منشط كبد', dose: 1, unit: 'سم³/لتر', duration: 8 },
  { name: 'مضاد حيوي (معوي+تنفسي)', dose: 1, unit: 'جرام/لتر', duration: 12 },
  { name: 'مضاد كوكسيديا', dose: 1, unit: 'جرام/لتر', duration: 12 },
  { name: 'مضاد كلوستريديا', dose: 1, unit: 'جرام/لتر', duration: 12 },
  { name: 'تحصين جمبورو', dose: 1, unit: 'سم³/لتر', duration: 2 },
  { name: 'تحصين هيتشنر ب1+أي بي (Hitchner B1+IB)', dose: 1, unit: 'سم³/لتر', duration: 2 },
  { name: 'تحصين لاسوتا', dose: 1, unit: 'سم³/لتر', duration: 4 },
  { name: 'مضاد سموم فطرية', dose: 1, unit: 'سم³/لتر', duration: 12 },
  { name: 'بروبيوتك (بكتيريا نافعة)', dose: 1, unit: 'جرام/لتر', duration: 8 },
  { name: 'مثبت لقاح (حليب)', dose: 1, unit: 'جرام/لتر', duration: 2 },
  { name: 'ماء نقي', dose: 0, unit: 'لتر', duration: 2 },
  { name: 'تعطيش', dose: 0, unit: 'ساعة', duration: 2 },
];

interface Bill { id: string; label: string; amount: number | string; startDay: number | string; endDay: number | string; entryDate: string; }

interface FeedBill {
  id: string;
  company: string;
  weight: number | string;
  amount: number | string;
  quantity: number | string;
  proteinPercentage: number | string;
  entryDate: string;
}

interface Fan {
  id: string;
  name: string;
  capacity: number | string;
  count: number | string;
  isActive: boolean;
}

interface CoolingPad {
  id: string;
  name: string;
  area: number | string;
}

interface BatteryGroup {
  id: string;
  name: string;
  length: number | string;
  width: number | string;
  tiers: number | string;
  count: number | string;
}

interface AppState {
  id: string;
  name: string;
  strain: Strain;
  totalChicks: number | string;
  age: number | string;
  climate: keyof typeof CLIMATE_FACTORS;
  breedingSystem: 'Battery-3' | 'Floor';
  medDuration: 6 | 8 | 12 | 24;
  fanCapacity: number | string; // m3/hr
  fans?: Fan[];
  cyclesPerHour: number | string;
  // Humidity/Cooling props
  externalTemp: number | string;
  internalTemp: number | string;
  currentHumidity: number | string;
  darknessStart: string;
  darknessHours: number | string;
  isCustomDarkness: boolean;
  isDarknessLinkedToTemp: boolean;
  isDarknessLinkedToMed: boolean;
  coolingPadArea: number | string; // m2
  pumpOnTime: number | string; // mins
  pumpOffTime: number | string; // mins
  medicationLogs: Record<string, string>; // age-medName -> startTime
  ventilationOffset: number;
  manualTimerSeconds: number;
  isManualTimerRunning: boolean;
  coolingPadsCount: number;
  coolingPads: CoolingPad[];
  emergencyMeds: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: number | string;
    age: number | string;
    doseValue?: number | string;
    unit?: string;
  }[];
  barnLength: number | string;
  barnWidth: number | string;
  barnHeight: number | string;
  tungstenBulbCount?: number | string;
  tungstenBulbPower?: number | string;
  tungstenBulbColor?: string;
  heaterCount?: number | string;
  heaterPower?: number | string;
  heatingMethod?: 'bulb' | 'heater' | 'both';
  bulbsPerTier?: Record<number, number | string>;
  batteryGroups: BatteryGroup[];
  batteryLength: number | string; // Deprecated - for backward compatibility
  batteryWidth: number | string; // Deprecated
  batteryTiers: number | string; // Deprecated
  batteriesCount: number | string; // Deprecated
  externalEquipment: boolean;
  distributionMode: 'equal' | 'sequential';
  manuallyActivatedBatteries: Record<string, boolean>; // groupId_bIdx -> boolean
  batteryTierCounts?: (number | string)[]; // Deprecated
  dailyBatteryTierCounts?: Record<string, (number | string)[]>; // Deprecated
  dailyBatteryTierFeed?: Record<string, (number | string)[]>; // Deprecated
  dailyBatteryGroupTierCounts?: Record<string, Record<string, (number | string)[]>>; // age -> groupId -> tiers
  dailyBatteryGroupTierFeed?: Record<string, Record<string, (number | string)[]>>; // age -> groupId -> tiers
  // Finance
  chickPrice: number | string;
  feedPrice: number | string;
  sellingPrice: number | string;
  mortalityBills: { id: string, label: string, count: number | string, ageAtDeath: number | string, amount: number | string }[];
  salesRecords: { 
    id: string, 
    label: string, 
    amount: number | string, 
    price: number | string, 
    weight: number | string,
    date?: string,
    customerName?: string,
    customerPhone?: string,
    amountPaid?: number | string
  }[];
  electricityBills: Bill[];
  waterBills: Bill[];
  medicationBills: Bill[];
  otherBills: Bill[];
  laborBills?: Bill[];
  feedBillsBady: FeedBill[];
  feedBillsNamy: FeedBill[];
  feedBillsNahy: FeedBill[];
  targetCycleDays: number | string;
  lastPriceUpdateAt?: string;
  priceSource?: string;
  isManualPriceMode?: boolean;
  dailyLogs?: any[]; // Added to fix discrepancy in exportCSV
  chickCount?: number;
  totalFeedConsumed?: number;
  totalMortality?: number;
  otherExpenses?: any[];
  cycleName?: string;
  startDate?: string;
  isManualOverride?: boolean;
  manualWeight?: number | string;
  isManualWeight?: boolean;
  weightLogs?: Record<string, number | string>;
  createdAt?: string;
  version?: number;
  medDataOverrides?: Record<string, { name?: string, doseValue?: number | string, unit?: string, duration?: number | string, order?: number }>;
  dailyInternalTemp?: Record<string, number | string>;
  dailyHumidity?: Record<string, number | string>;
  environmentalLoadDeltaT?: number | string;
  environmentalLoadDensity?: number | string;
  environmentalLoadInsulation?: boolean;
}

// --- Components ---
const Logo = ({ className, size = 32, iconSize = 20 }: { className?: string, size?: number, iconSize?: number }) => (
  <div className={cn("rounded-2xl bg-gradient-to-tr from-[#02b881] via-[#108ff4] to-[#1e6ffd] flex items-center justify-center shadow-[0_0_25px_rgba(30,111,253,0.35)] border border-white/20 flex-shrink-0 relative overflow-hidden group transition-all", className)} style={{ width: size, height: size }}>
    <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
    <Bird size={iconSize} className="text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in duration-1000" />
  </div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className, id, onClick }) => (
  <div id={id} className={cn("bento-card group relative overflow-hidden", className)} onClick={onClick}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </div>
);

const Stat = ({ label, value, unit, icon: Icon, color, subLabel, subValue, onClick }: { label: string, value: string | number, unit?: React.ReactNode, icon?: any, color?: string, subLabel?: string, subValue?: string | number, onClick?: () => void }) => (
  <Card className={cn("flex flex-col gap-1", onClick && "cursor-pointer active:scale-95")} onClick={onClick}>
    <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-2">
      {Icon && <Icon size={14} className={color} />}
      {label}
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-black text-white tabular-nums">{value}</span>
      {unit && <span className="text-slate-500 text-[10px] font-bold">{unit}</span>}
    </div>
    {subValue !== undefined && (
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-[9px] font-bold text-slate-500">{subLabel}</span>
        <span className={cn("text-xs font-black", color)}>{subValue}</span>
      </div>
    )}
  </Card>
);

// Safe numeric conversion
const toNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 
    ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const INITIAL_STATE: AppState = {
  id: '',
  name: 'دورة افتراضية',
  strain: 'Cobb',
  totalChicks: 150,
  age: 1,
  climate: 'معتدل',
  breedingSystem: 'Battery-3',
  medDuration: 8,
  fanCapacity: 5000,
  fans: [
    { id: 'fan-1', name: 'شفاط رئيسي 1', capacity: 5000, count: 1, isActive: true }
  ],
  cyclesPerHour: 4,
  externalTemp: 25,
  internalTemp: 28,
  currentHumidity: 65,
  darknessStart: '23:00',
  darknessHours: 0,
  isCustomDarkness: false,
  isDarknessLinkedToTemp: true,
  isDarknessLinkedToMed: true,
  coolingPadArea: 25,
  pumpOnTime: 2,
  pumpOffTime: 8,
  medicationLogs: {},
  ventilationOffset: 0,
  manualTimerSeconds: 0,
  isManualTimerRunning: false,
  coolingPadsCount: 4,
  coolingPads: [
    { id: 'cp-1', name: 'خلية يمين 1', area: 5 },
    { id: 'cp-2', name: 'خلية يمين 2', area: 5 },
    { id: 'cp-3', name: 'خلية يسار 1', area: 5 },
    { id: 'cp-4', name: 'خلية يسار 2', area: 5 },
    { id: 'cp-5', name: 'خلية مقدمة', area: 5 }
  ],
  emergencyMeds: [],
  barnLength: 100,
  barnWidth: 12,
  barnHeight: 3,
  tungstenBulbCount: 20,
  tungstenBulbPower: 200,
  tungstenBulbColor: 'أصفر داكن',
  heaterCount: 2,
  heaterPower: 15000,
  heatingMethod: 'both',
  bulbsPerTier: {},
  batteryGroups: [
    { id: 'bg-1', name: 'البطارية رقم 1', length: 0.6, width: 0.5, tiers: 3, count: 1 }
  ],
  batteryLength: 0.6,
  batteryWidth: 0.5,
  batteryTiers: 3,
  batteriesCount: 1,
  batteryTierCounts: [50, 50, 50],
  dailyBatteryGroupTierCounts: {},
  dailyBatteryGroupTierFeed: {},
  dailyBatteryTierCounts: { "1": [50, 50, 50] },
  dailyBatteryTierFeed: {},
  externalEquipment: true,
  distributionMode: 'sequential',
  manuallyActivatedBatteries: {},
  lastPriceUpdateAt: '',
  priceSource: '',
  isManualPriceMode: false,
  chickPrice: 20,
  feedPrice: 22,
  sellingPrice: 75,
  mortalityBills: [],
  salesRecords: [],
  electricityBills: [{ id: 'default-elec', label: 'كهرباء وسكن', amount: 1500, startDay: 35, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }],
  waterBills: [],
  medicationBills: [],
  otherBills: [],
  laborBills: [],
  feedBillsBady: [],
  feedBillsNamy: [],
  feedBillsNahy: [],
  targetCycleDays: 35,
  dailyLogs: [],
  dailyInternalTemp: {},
  dailyHumidity: {},
  otherExpenses: [],
  environmentalLoadDeltaT: 3,
  environmentalLoadDensity: 30,
  environmentalLoadInsulation: false,
  cycleName: '',
  startDate: new Date().toISOString().split('T')[0],
  isManualOverride: false,
  manualWeight: 0,
  isManualWeight: false,
  weightLogs: {},
  createdAt: '',
  version: 5,
  medDataOverrides: {}
};

/**
 * دالة فيزيائية دقيقة لحساب الزيادة في الرطوبة النسبية بناءً على حجم الهواء والحرارة
 * @param currentTempC درجة حرارة العنبر الحالية بالمئوية (مثال: 33)
 * @param currentRH الرطوبة النسبية الحالية كنسبة مئوية (مثال: 50)
 * @param moistureAddedMlPerHour كمية الماء المتبخرة من القطيع في الساعة (مل)
 * @param roomVolumeCubicMeters حجم هواء العنبر بالمتر المكعب (الطول × العرض × الارتفاع)
 * @returns الرطوبة النسبية الجديدة بعد ساعة (%)
 */
const calculateExactNewRH = (
  currentTempC: number,
  currentRH: number,
  moistureAddedMlPerHour: number,
  roomVolumeCubicMeters: number
): number => {
  if (roomVolumeCubicMeters <= 0) return currentRH;
  const temp = currentTempC <= 0 ? 28 : currentTempC;

  // 1. حساب أقصى كمية بخار ماء يمكن أن يحملها المتر المكعب عند هذه الحرارة (جرام/متر مكعب)
  const saturationVaporPressure = 6.112 * Math.exp((17.67 * temp) / (temp + 243.5)); // hPa
  const maxWaterPerCubicMeter = (2.16679 * saturationVaporPressure * 100) / (temp + 273.15); 

  if (maxWaterPerCubicMeter <= 0) return currentRH;

  // 2. حساب كمية الماء الحالية الموجودة فعلياً في هواء العنبر (بالمللتر)
  const currentWaterInRoom = (currentRH / 100) * maxWaterPerCubicMeter * roomVolumeCubicMeters;

  // 3. إضافة الماء الجديد الذي تبخر من الفراخ خلال ساعة
  const newTotalWaterInRoom = currentWaterInRoom + moistureAddedMlPerHour;

  // 4. تحويل الكمية الجديدة لنسبة مئوية (الرطوبة النسبية الجديدة)
  const newRH = (newTotalWaterInRoom / (maxWaterPerCubicMeter * roomVolumeCubicMeters)) * 100;

  // 5. السقف الفيزيائي (لا يمكن أن تتجاوز 100%)
  return newRH > 100 ? 100 : parseFloat(newRH.toFixed(1));
};

export default function App() {
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { value: isAuth } = await Preferences.get({ key: 'poultry_sheets_authenticated' });
        if (isAuth === 'true') {
          localStorage.setItem('poultry_gateway_passed', 'true');
          setScreen('landing');
        }
      } catch (e) {
        console.warn("Session check failed:", e);
      }
    };
    checkSession();
  }, []);

  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('poultry_app_screen');
    // If user has already passed the gateway check, we can restore.
    const isBypassed = localStorage.getItem('poultry_gateway_passed');
    if (!isBypassed) return 'gateway';
    
    if (saved === 'setup' || !saved) return 'landing';
    return (saved as Screen) || 'landing';
  });
  const [gatewayEmail, setGatewayEmail] = useState('');
  const [gatewayPassword, setGatewayPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('poultry_remember_me') === 'true');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('poultry_remember_me') === 'true') {
      const savedEmail = localStorage.getItem('poultry_saved_email');
      if (savedEmail) {
        setLoginEmail(savedEmail);
        setGatewayEmail(savedEmail);
      }
    }
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [flipDirection, setFlipDirection] = useState(0);

  const [isAutoSave, setIsAutoSave] = useState(() => {
    const saved = localStorage.getItem('poultry_app_autosave');
    return saved === null ? true : saved === 'true';
  });

  const [inAppNotifications, setInAppNotifications] = useState<{ id: string, title: string, body: string, time: string, type: 'temp' | 'humidity' | 'medication' | 'change' | 'general' }[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('poultry_notification_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      tempAlerts: true,
      humidityAlerts: true,
      medicationAlerts: true,
      feedWaterAlerts: true,
      systemChanges: true
    };
  });

  useEffect(() => {
    localStorage.setItem('poultry_notification_settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [editTimerTime, setEditTimerTime] = useState({ h: 0, m: 0, s: 0 });

  const [billToDelete, setBillToDelete] = useState<{ id: string, section: string, label: string } | null>(null);
  const [padToDelete, setPadToDelete] = useState<CoolingPad | null>(null);

  useEffect(() => {
    if (billToDelete) {
      const timer = setTimeout(() => {
        setBillToDelete(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [billToDelete]);

  const [allCycles, setAllCycles] = useState<AppState[]>(() => {
    const saved = localStorage.getItem('poultry_app_all_cycles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0]?.version || 0) >= 4) {
          return parsed.map(c => ({ ...INITIAL_STATE, ...c, version: 5 }));
        }
      } catch (e) {
        console.error("Error parsing cycles", e);
      }
    }
    return [{ ...INITIAL_STATE, id: 'cycle-1' }];
  });

  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('poultry_app_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if ((parsed.version || 0) >= 4) {
            return { ...INITIAL_STATE, ...parsed, version: 5 };
          }
        } catch (e) {
          console.error("Error parsing state", e);
        }
      }
    } catch (e) {
      console.error("localStorage access failed", e);
    }
    return { ...INITIAL_STATE, id: Math.random().toString(36).substring(2, 9) };
  });

  const [activeBatteryGroup, setActiveBatteryGroup] = useState<string | null>(null);
  const [activeBatteryIdx, setActiveBatteryIdx] = useState<number | null>(null);
  const [activationCandidate, setActivationCandidate] = useState<{groupId: string, bIdx: number} | null>(null);

  const [isNamingNewCycle, setIsNamingNewCycle] = useState(false);
  const [newCycleNameInput, setNewCycleNameInput] = useState('');
  const [prevSellingPrice, setPrevSellingPrice] = useState<number | string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [prevExchangeRates, setPrevExchangeRates] = useState<any>(null);
  const [goldPrices, setGoldPrices] = useState<any>(null);
  const [prevGoldPrices, setPrevGoldPrices] = useState<any>(null);
  const [eggPrices, setEggPrices] = useState<any[]>([]);
  const [prevEggPrices, setPrevEggPrices] = useState<any[]>([]);
  const [feedPrices, setFeedPrices] = useState<any[]>([]);
  const [prevFeedPrices, setPrevFeedPrices] = useState<any[]>([]);
  const [chickPrices, setChickPrices] = useState<any[]>([]);
  const [prevChickPrices, setPrevChickPrices] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);

  const [weather, setWeather] = useState<any>(null);

  const totalBatteryCount = (state.batteryGroups || []).reduce((acc, g) => acc + toNum(g.count), 0);
  const totalFloorArea = (state.batteryGroups || []).reduce((acc, g) => acc + (toNum(g.length) * toNum(g.width) * toNum(g.count)), 0);
  const totalBatteryArea = (state.batteryGroups || []).reduce((acc, g) => acc + (toNum(g.length) * toNum(g.width) * toNum(g.tiers) * toNum(g.count)), 0);
  const maxBatteryTiers = (state.batteryGroups || []).reduce((acc, g) => Math.max(acc, toNum(g.tiers)), 0);

  const totalDistributedBirds = useMemo(() => {
    const currentAge = String(state.age);
    const dayData = state.dailyBatteryGroupTierCounts?.[currentAge] || {};
    return Object.values(dayData).reduce((acc: number, counts: any) => {
      const tierSum = (counts || []).reduce((sum: number, c: any) => sum + toNum(c), 0);
      return acc + tierSum;
    }, 0);
  }, [state.dailyBatteryGroupTierCounts, state.age]);

  const densityPerM2At = useCallback((age: number) => {
    return age <= 7 ? 45 :
           age <= 14 ? 32 :
           age <= 21 ? 22 :
           age <= 28 ? 17 :
           age <= 35 ? 14 : 12;
  }, []);

  const getRecPerTierAcrossGroups = useCallback((tierIdx: number, age: number, external: boolean) => {
    const density = densityPerM2At(age);
    return (state.batteryGroups || []).reduce((acc, g) => {
      if (toNum(g.tiers) > tierIdx) {
        const perTier = Math.floor(toNum(g.length) * toNum(g.width) * density * (external ? 1.15 : 1));
        return acc + (perTier * toNum(g.count));
      }
      return acc;
    }, 0);
  }, [state.batteryGroups, densityPerM2At]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('جاري التحديد...');
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);

  const fetchMarketData = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    
    // Save current prices as previous before updating
    setPrevGoldPrices(goldPrices);
    setPrevExchangeRates(exchangeRates);
    setPrevSellingPrice(state.sellingPrice);
    setPrevEggPrices(eggPrices);
    setPrevFeedPrices(feedPrices);
    setPrevChickPrices(chickPrices);

    try {
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sa3dTT3ID0PmRVyfy2B-JA4F7-m3cW8HhTX0JBspzKg/export?format=csv&gid=0';
      let sheetRes: any = null;
      let lastError: string = '';
      
      // On native, prioritizing direct Sheet access might be more reliable
      if (Capacitor.isNativePlatform()) {
        try {
          console.log("Native: Attempting direct Google Sheets fetch...");
          sheetRes = await smartFetch(SHEET_URL);
          if (!sheetRes.ok) lastError = `Google Sheet direct failed (${sheetRes.status})`;
        } catch (e) {
          lastError = `Google Sheet exception: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      if (!sheetRes || !sheetRes.ok) {
        try {
          const proxyUrl = '/api/market-sheet';
          console.log("Attempting proxy fetch...");
          sheetRes = await smartFetch(proxyUrl);
          if (!sheetRes.ok) lastError += ` | Proxy failed (${sheetRes.status})`;
        } catch (e) {
          lastError += ` | Proxy exception: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      // Final fallback if proxy also failed or was skipped
      if (!sheetRes || !sheetRes.ok) {
        if (!Capacitor.isNativePlatform()) {
          try {
            console.log("Web: Attempting direct Google Sheets fallback...");
            sheetRes = await smartFetch(SHEET_URL);
          } catch (e) {
             lastError += ` | Web fallback exception: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
      }

      if (!sheetRes || !sheetRes.ok) {
        let errorMsg = `فشل جلب البيانات. المنصة: ${Capacitor.getPlatform()}`;
        if (Capacitor.isNativePlatform() && !API_BASE_URL) {
          errorMsg += " | تنبيه: API_BASE_URL غير معرف (مهم للـ APK)";
        }
        errorMsg += ` | التفاصيل: ${lastError}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      let sheetGoldPrices: any = {};

      if (sheetRes.ok) {
        const csvText = await sheetRes.text();
        
        if (!csvText || csvText.length < 10) {
          throw new Error("ملف البيانات فارغ أو غير متاح حالياً");
        }

        const rows = csvText.split(/\r?\n/).filter(line => line.trim()).map(line => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });
        
        const findPrices = (keyword: string) => {
          const lowerKeyword = keyword.toLowerCase().trim();
          const isChicken = lowerKeyword === 'الفراخ البيضاء';
          
          let targetRow: string[] | undefined;

          // Priority for White Chicken: Exact cell A3 (Row index 2, Col 0)
          if (isChicken && rows[2] && rows[2][0]) {
            const val = parseFloat(rows[2][0].replace(/[^\d.]/g, ''));
            if (!isNaN(val) && val > 30 && val < 500) {
              return { sell: val, buy: val };
            }
          }

          targetRow = rows.find(r => 
            r.some(cell => {
              const c = (cell || '').toLowerCase().trim();
              if (isChicken) {
                const hasPoultry = c.includes('لحم') || c.includes('فراخ') || c.includes('بدري') || c.includes('تنفيذ');
                return (hasPoultry || (c === 'أبيض')) && !c.includes('بيض');
              }
              if (lowerKeyword === '24c' && (c === '24' || c.includes('عيار 24') || c.includes('24k'))) return true;
              if (lowerKeyword === '21c' && (c === '21' || c.includes('عيار 21') || c.includes('21k'))) return true;
              if (lowerKeyword === '18c' && (c === '18' || c.includes('عيار 18') || c.includes('18k'))) return true;
              if (lowerKeyword === 'أوقية' && (c.includes('أوقية') || c.includes('ounce'))) return true;
              if (lowerKeyword === 'جنيه ذهب' && (c.includes('جنيه ذهب') || c.includes('gold pound'))) return true;
              return c.includes(lowerKeyword);
            })
          );

          if (targetRow) {
            let numbers = targetRow.map(c => {
               const cleanVal = (c || '').replace(/[^\d.]/g, '');
               return parseFloat(cleanVal);
            }).filter(val => !isNaN(val) && val > 0);

            // Filter out dates (like 2026) for chicken and eggs
            if (isChicken || lowerKeyword.includes('بيض')) {
              numbers = numbers.filter(n => n > 20 && n < 500);
            }

            if (numbers.length >= 2) {
              if (lowerKeyword.includes('عيار') || lowerKeyword.includes('جنيه') || lowerKeyword.includes('أوقية') || lowerKeyword.includes('c')) {
                const sorted = [...numbers].sort((a, b) => b - a);
                return { sell: sorted[0], buy: sorted[1] };
              }
              return { sell: numbers[0], buy: numbers[1] };
            } else if (numbers.length === 1) {
              return { sell: numbers[0], buy: numbers[0] };
            }
          }
          return { sell: 0, buy: 0 };
        };

        sheetGoldPrices = {
          'ounce': { ...findPrices('أوقية'), label: 'أوقية الذهب $', currency: '$' },
          'pound': { ...findPrices('جنيه ذهب'), label: 'الجنيه الذهب', currency: 'ج.م' },
          '24k': { ...findPrices('24c'), label: 'عيار 24', currency: 'ج.م' },
          '21k': { ...findPrices('21c'), label: 'عيار 21', currency: 'ج.م' },
          '18k': { ...findPrices('18c'), label: 'عيار 18', currency: 'ج.م' },
        };
        setGoldPrices(sheetGoldPrices);

        // Also update main chicken price from sheet if found
        const chickenPrices = findPrices('الفراخ البيضاء');
        if (chickenPrices.sell > 0) {
          setState(prev => ({ ...prev, sellingPrice: chickenPrices.sell }));
        }

        // 4. Parse Eggs
        const eggTypes = [
          { key: 'white', keyword: 'بيض أبيض', label: 'بيض أبيض' },
          { key: 'red', keyword: 'بيض أحمر', label: 'بيض أحمر' },
          { key: 'baladi', keyword: 'بيض بلدي', label: 'بيض بلدي' }
        ];
        const parsedEggs = eggTypes.map(type => ({
          ...type,
          price: findPrices(type.keyword).sell
        }));
        setEggPrices(parsedEggs);

        // 5. Parse Feed
        const requestedFeedBrands = ["هيدا", "نيوهوب", "الإيمان", "نوفافيد", "سامي عايد", "الدقهلية", "الوادي"];
        const parsedFeed: any[] = [];
        
        // Priority Search for requested brands
        requestedFeedBrands.forEach(brand => {
          const row = rows.find(r => r.some(cell => (cell || '').includes(brand)) && 
                                  r.some(cell => parseFloat((cell || '').replace(/[^\d.]/g, '')) > 10000));
          if (row) {
            const nums = row.map(c => parseFloat((c || '').replace(/[^\d.]/g, ''))).filter(n => !isNaN(n) && n > 10000);
            if (nums.length > 0) {
              // Usually the order is Starter, Grower, Finisher. 
              // If user says they are swapped, we reverse common logic or specific indices.
              // Assuming nums[0] was thought to be starter but is finisher, and nums[2] is starter.
              parsedFeed.push({
                company: brand,
                starter: nums[nums.length - 1] || 0, // Swapped: Last is Badi as per user correction
                grower: nums.length > 2 ? nums[1] : (nums[0] || 0),
                finisher: nums[0] || 0 // Swapped: First is Nahy as per user correction
              });
            }
          }
        });

        // Suppplement with discovery for other feed rows
        rows.forEach(row => {
          const rowText = row.join(' ');
          if ((rowText.includes('علف') || rowText.includes('شركة')) && 
              (rowText.includes('بادي') || rowText.includes('نامي') || rowText.includes('ناهي'))) {
            const nums = row.map(c => parseFloat((c || '').replace(/[^\d.]/g, ''))).filter(n => !isNaN(n) && n > 10000);
            if (nums.length >= 2) {
              const companyCell = row.find(c => (c || '').length > 2 && !/^\d/.test(c || '') && !c?.includes('علف') && !c?.includes('أعلاف')) || 'شركة أعلاف';
              if (!parsedFeed.some(p => companyCell.includes(p.company) || p.company.includes(companyCell))) {
                parsedFeed.push({
                  company: companyCell,
                  starter: nums[nums.length - 1] || 0,
                  grower: nums.length > 2 ? nums[1] : (nums[0] || 0),
                  finisher: nums[0] || 0
                });
              }
            }
          }
        });
        setFeedPrices(parsedFeed);

        // 6. Parse Chicks
        const requestedChicks = [
          "القاهرة", "كايرو 3 إي", "نيوهوب", "الوطنية", "الوادي", "الدقهلية"
        ];
        const parsedChicks: any[] = requestedChicks.map(name => ({
          company: name,
          price: findPrices(name).sell
        })).filter(c => c.price > 0);

        // Add others if not already there
        rows.forEach(row => {
          const rowText = row.join(' ');
          if (rowText.includes('كتكوت') && !rowText.includes('بيض')) {
            const price = parseFloat(row.find(c => !isNaN(parseFloat((c || '').replace(/[^\d.]/g, ''))) && parseFloat((c || '').replace(/[^\d.]/g, '')) < 100)?.replace(/[^\d.]/g, '') || '0');
            const company = row.find(c => (c || '').length > 3 && !c?.includes('كتكوت')) || 'شركة كتاكيت';
            if (price > 0 && !parsedChicks.some(p => company.includes(p.company) || p.company.includes(company))) {
              parsedChicks.push({ company, price });
            }
          }
        });
        setChickPrices(parsedChicks);

        const findRate = (keyword: string) => {
          const row = rows.find(r => r.some(cell => (cell || '').includes(keyword)));
          if (row) {
            for (const cell of row) {
              const val = parseFloat((cell || '').replace(/[^\d.]/g, ''));
              if (!isNaN(val) && val > 0) return val;
            }
          }
          return null;
        };

        const usdEgp = findRate('الدولار/الجنيه');
        const sarEgp = findRate('الريال/الجنيه');
        const usdSar = findRate('الدولار/الريال');

        if (usdEgp !== null || sarEgp !== null || usdSar !== null) {
          const cleanRates: any = {};
          if (usdEgp !== null) { cleanRates.EGP = usdEgp; cleanRates.EGP_USD = usdEgp; }
          if (sarEgp !== null) cleanRates.EGP_SAR = sarEgp;
          if (usdSar !== null) cleanRates.SAR_USD = usdSar;
          if (Object.keys(cleanRates).length > 0) {
            setExchangeRates((prev: any) => ({ ...prev, ...cleanRates }));
          }
        }
      }

      try {
        const curRes = await smartFetch('/api/currency-rates');
        if (curRes.ok) {
          const curData = await curRes.json();
          setExchangeRates((prev: any) => ({ ...curData.rates, ...prev }));
        }
      } catch (e) { console.warn("Currency API failed"); }

      if (Object.keys(sheetGoldPrices).length === 0 || Object.values(sheetGoldPrices).every((v: any) => v.sell === 0)) {
        const goldRes = await smartFetch('/api/gold-price');
        if (goldRes.ok) {
          const goldData = await goldRes.json();
          const p = goldData.prices || {};
          const fallback: any = {
            'ounce': { sell: p.ounce || 0, buy: p.ounce || 0, label: 'أوقية الذهب $', currency: '$' },
            'pound': { sell: p.pound || 0, buy: p.pound || 0, label: 'الجنيه الذهب', currency: 'ج.م' },
            '24k': { sell: p['24k'] || 0, buy: p['24k'] || 0, label: 'عيار 24', currency: 'ج.م' },
            '21k': { sell: p['21k'] || 0, buy: p['21k'] || 0, label: 'عيار 21', currency: 'ج.م' },
            '18k': { sell: (p['21k'] * 18/21) || 0, buy: (p['21k'] * 18/21) || 0, label: 'عيار 18', currency: 'ج.م' }
          };
          setGoldPrices(fallback);
        }
      }
    } catch (err) { setMarketError('فشل في جلب بعض بيانات السوق'); }
    finally { setMarketLoading(false); }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number, name?: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    setCoords({ lat, lon });
    try {
      const weatherRes = await smartFetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&relative_humidity_2m=true&wind_speed_10m=true&daily=weathercode,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max&timezone=auto`
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        setWeather(weatherData);

        if (!name) {
          const geoRes = await smartFetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ar`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            setLocationName(geoData.address.city || geoData.address.town || geoData.address.village || geoData.display_name.split(',')[0]);
          }
        } else {
          setLocationName(name);
        }
      }
    } catch (err) {
      setWeatherError('فشل في جلب بيانات الطقس');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const handleWeatherSearch = useCallback(async (query: string) => {
    try {
      const res = await smartFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ar&format=json`);
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
      return [];
    } catch (e) {
      console.error("Geocoding failed", e);
      return [];
    }
  }, []);

  const handleWeatherRetry = useCallback(() => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    if (coords) {
      fetchWeather(coords.lat, coords.lon, locationName);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          setWeatherError('يرجى تفعيل الموقع (GPS) للحصول على طقس دقيق');
          setWeatherLoading(false);
        }
      );
    } else {
      setWeatherError('المتصفح لا يدعم تحديد الموقع');
      setWeatherLoading(false);
    }
  }, [fetchWeather, coords, locationName]);

  const [isLogoutConfirming, setIsLogoutConfirming] = useState(false);
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);
  const [fanToDeleteId, setFanToDeleteId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(0); // 0: none, 1: warning, 2: final confirm
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const [selectedMedInfo, setSelectedMedInfo] = useState<{ title: string, text: string } | null>(null);

  useEffect(() => {
    const savedGateway = localStorage.getItem('poultry_gateway_credentials');
    if (savedGateway) {
      try {
        const { email, password } = JSON.parse(savedGateway);
        setGatewayEmail(email);
        setGatewayPassword(password);
      } catch (e) {
        localStorage.removeItem('poultry_gateway_credentials');
      }
    } else {
      setGatewayEmail('');
      setGatewayPassword('');
    }

    const savedLogin = localStorage.getItem('poultry_login_credentials');
    if (savedLogin) {
      try {
        const { email, password } = JSON.parse(savedLogin);
        setLoginEmail(email);
        setLoginPassword(password);
      } catch (e) {
        localStorage.removeItem('poultry_login_credentials');
      }
    } else {
      setLoginEmail('');
      setLoginPassword('');
    }
  }, [screen]); // Re-sync when returning to login screens

  // Scroll to top when switching screens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // --- Auto-hide Nav Logic ---
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [humidityTotalBirds, setHumidityTotalBirds] = useState('360');
  const [humidityAvgWeight, setHumidityAvgWeight] = useState('180');
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Day Navigation Logic ---
  const goToNextDay = () => {
    setFlipDirection(1);
    setState(prev => ({ ...prev, age: Math.min(toNum(prev.age) + 1, 60), isManualOverride: true }));
    setIsNavVisible(true);
  };

  const goToPrevDay = () => {
    setFlipDirection(-1);
    setState(prev => ({ ...prev, age: Math.max(toNum(prev.age) - 1, 1), isManualOverride: true }));
    setIsNavVisible(true);
  };

  const fetchChickenPrice = async (force = false) => {
    setIsFetchingPrice(true);
    let success = false;
    let price = 0;
    let source = "";

    try {
      // 1. Try Google Sheet (via proxy or direct fallback)
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sa3dTT3ID0PmRVyfy2B-JA4F7-m3cW8HhTX0JBspzKg/export?format=csv&gid=0';
      let response: any = null;
      let lastError: string = '';
      
      if (Capacitor.isNativePlatform()) {
        try {
          response = await smartFetch(SHEET_URL);
          if (!response.ok) lastError = `Direct fetch failed (${response.status})`;
        } catch (e) {
          lastError = `Direct fetch exception: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      if (!response || !response.ok) {
        try {
          const proxyUrl = '/api/market-sheet';
          response = await smartFetch(proxyUrl);
          if (!response.ok) lastError += ` | Proxy failed (${response.status})`;
        } catch (e) {
          lastError += ` | Proxy exception: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      if (!response || !response.ok) {
        if (!Capacitor.isNativePlatform()) {
          try {
            response = await smartFetch(SHEET_URL);
          } catch (e) {
            lastError += ` | Web fallback exception: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
      }
      
      if (response && response.ok) {
        const csvText = await response.text();
        if (!csvText || csvText.length < 10) {
          throw new Error("CSV text too short or empty");
        }
        const rows = csvText.split(/\r?\n/).filter(line => line.trim()).map(line => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });

        // Priority for White Chicken: Exact cell A3 (Row index 2, Col 0)
        if (rows[2] && rows[2][0]) {
          const val = parseFloat(rows[2][0].replace(/[^\d.]/g, ''));
          if (!isNaN(val) && val > 30 && val < 500) {
            price = val;
            source = "جوجل شيت (الخلية A3)";
            success = true;
          }
        }

        if (!success) {
          const poultryRow = rows.find(row => 
            row.some(cell => {
              const c = (cell || '').toLowerCase().trim();
              const hasPoultry = c.includes('لحم') || c.includes('فراخ') || c.includes('بدري') || c.includes('تنفيذ');
              return (hasPoultry || (c === 'أبيض')) && !c.includes('بيض');
            })
          );
          
          if (poultryRow) {
            let numbers = poultryRow.map(c => {
               const cleanVal = (c || '').replace(/[^\d.]/g, '');
               return parseFloat(cleanVal);
            }).filter(val => !isNaN(val) && val > 30 && val < 500);

            if (numbers.length > 0) {
              price = numbers[0]; // Take first valid price (usually execution or bourse)
              source = "جوجل شيت (بحث)";
              success = true;
            }
          }
        }
      }
    } catch (error) {
      console.error("Sheet fetch proxy failed:", error);
    }

    // 2. Direct Web Scrape on Native Platforms (Capacitor) as a direct backup bypass
    if (!success && Capacitor.isNativePlatform()) {
      try {
        console.log("Attempting direct client-side scrape on native platform...");
        const sourcesWeb = [
          'https://www.biltafsil.com/poultry/',
          'https://www.biltafsil.com/poultry/chickens/',
          'https://misr365.com/price/chickens-price-today/',
          'https://sarery.com/bourse-poultry/'
        ];
        const patternsWeb = [
          /البيضاء.*?<td>(\d+)/i,
          /اللحم الأبيض.*?<td>(\d+)/i,
          /البيضاء اليوم.*?(\d+)/,
          /سعر الفراخ البيضاء اليوم.*?(\d+)/,
          /لحم الفراخ البيضاء\s*<\/td>\s*<td>\s*(\d+)/i,
          /الفراخ البيضاء\s*<\/td>\s*<td>\s*(\d+)/i,
          /اللحم الأبيض\s*<\/td>\s*<td>\s*(\d+)/i,
          /الفراخ البيضاء\s*:\s*(\d+)/,
          /البيضاء\s*:\s*(\d+)/,
          /الفراخ البيضاء [^<]{0,100}? (\d+)/i,
          /(\d+)\s*جنيه\s*<\/td>/,
          /(\d+)\s*<\/span>\s*جنيه/
        ];
        for (const url of sourcesWeb) {
          try {
            const res = await CapacitorHttp.request({
              url: url,
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              },
              connectTimeout: 4000,
              readTimeout: 4000
            });
            if (res.status === 200 && typeof res.data === 'string') {
              const html = res.data;
              for (const pattern of patternsWeb) {
                const match = html.match(pattern);
                if (match && match[1]) {
                  const parsed = parseInt(match[1]);
                  if (parsed >= 50 && parsed <= 150) {
                    price = parsed;
                    source = `رصد مباشر (بورصة)`;
                    success = true;
                    break;
                  }
                }
              }
            }
            if (success) break;
          } catch (scrapeErr) {
            console.warn(`Direct native scrape failed for ${url}:`, scrapeErr);
          }
        }
      } catch (err) {
        console.warn("Direct native scrape handler failed:", err);
      }
    }

    // 3. Fallback if sheet and direct scrape fails (using the server API if present)
    if (!success) {
      try {
        const response = await smartFetch('/api/poultry-price', {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('<')) {
            console.warn("Server returned HTML instead of JSON for poultry price. Falling back to default.");
          } else {
            let data;
            try {
              data = JSON.parse(text);
              if (data && data.price) {
                price = data.price;
                source = data.source || "بورصة الدواجن (احتياطي)";
                success = true;
              }
            } catch (e) {
              console.warn("Invalid JSON format in price response. Falling back to default.");
            }
          }
        } else {
          console.warn("Poultry price API failed with status:", response.status);
        }
      } catch (error) {
        console.warn("Fallback poultry price fetch failed:", error);
      }
    }

    // 4. Graceful default fallback price so the app always functions smoothly
    if (!success) {
      price = state?.sellingPrice && toNum(state.sellingPrice) >= 50 && toNum(state.sellingPrice) <= 180 
        ? toNum(state.sellingPrice) 
        : 78; // 78 EGP as a realistic standard price fallback
      source = "سعر تقديري (احتياطي)";
      success = true;
    }

    if (success) {
      const now = new Date();
      const formattedDate = now.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      setState(prev => ({ 
        ...prev, 
        sellingPrice: price,
        lastPriceUpdateAt: formattedDate,
        priceSource: source,
        isManualPriceMode: false
      }));
    } else {
      if (force) {
        alert("فشل تحديث السعر من جميع المصادر. يرجى التحقق من الاتصال أو استخدام الإدخال اليدوي.");
      }
    }
    
    setIsFetchingPrice(false);
  };

  useEffect(() => {
    // 1. Initial fetch of everything
    fetchChickenPrice();
    fetchMarketData();
    
    // Geolocation trigger
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          setWeatherError('يرجى تفعيل الموقع (GPS) للحصول على طقس دقيق');
          setWeatherLoading(false);
        }
      );
    }

    // 2. Refresh everything every hour (3600000ms)
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing app data (Hourly)...");
      fetchChickenPrice();
      fetchMarketData();
      if (coords) {
        fetchWeather(coords.lat, coords.lon, locationName);
      }
    }, 3600000);

    return () => clearInterval(refreshInterval);
  }, []);

  // مزامنة الحرارة الخارجية مع شاشة الطقس تلقائياً
  useEffect(() => {
    if (weather?.current_weather?.temperature !== undefined) {
      const wTemp = Math.round(weather.current_weather.temperature);
      setState(prev => {
        if (Number(prev.externalTemp) !== wTemp) {
          return { ...prev, externalTemp: wTemp };
        }
        return prev;
      });
    }
  }, [weather?.current_weather?.temperature]);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav on scroll
      setIsNavVisible(true);
      
      // Clear existing timeout
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
      
      // Set behavior: Auto-hide after 5 seconds of no activity
      const isKeyboardOpen = window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.8 : false;
      
      if (!isKeyboardOpen) {
        navTimeoutRef.current = setTimeout(() => {
          setIsNavVisible(false);
        }, 5000);
      }
    };

    const handleTouchStart = () => {
      setIsNavVisible(true);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('mousemove', handleScroll, { passive: true }); // Also show on mouse move for desktop
    
    // Initial auto-hide timer
    navTimeoutRef.current = setTimeout(() => {
      setIsNavVisible(false);
    }, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('mousemove', handleScroll);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (deleteStep > 0) {
      timer = setTimeout(() => {
        setDeleteStep(0);
        setDeletingCycleId(null);
      }, 15000); // 15 seconds auto-dismiss as requested
    }
    return () => clearTimeout(timer);
  }, [deleteStep]);

  const formatDateToDMY = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString();
    return `${d}/${m}/${y}`;
  };

  const startNewCycle = () => {
    setNewCycleNameInput(`دورة ${formatDateToDMY(new Date())}`);
    setIsNamingNewCycle(true);
  };

  const confirmNewCycle = (name: string) => {
    // 1. Save current one to allCycles BEFORE clearing it
    if (state.id) {
      setAllCycles(prev => {
        const exists = prev.find(c => c.id === state.id);
        if (exists) return prev.map(c => c.id === state.id ? state : c);
        return [...prev, state];
      });
    }

    // 2. Create fresh state
    const newState: AppState = { 
      ...INITIAL_STATE, 
      id: Math.random().toString(36).substring(2, 9), 
      name: name || 'دورة غير مسمى',
      startDate: new Date().toISOString().split('T')[0],
      isManualOverride: false,
      createdAt: formatDateToDMY(new Date())
    };
    setState(newState);
    setIsNamingNewCycle(false);
    setScreen('setup');
  };

  const switchCycle = (id: string) => {
    // Save current before switching
    if (state.id) {
      setAllCycles(prev => {
        const exists = prev.find(c => c.id === state.id);
        if (exists) return prev.map(c => c.id === state.id ? state : c);
        return [...prev, state];
      });
    }

    const target = allCycles.find(c => c.id === id);
    if (target) {
      setState(target);
      setScreen('dashboard');
    }
  };

  const initiateDeleteCycle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingCycleId(id);
    setDeleteStep(1);
  };

  const confirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const finalDeleteCycle = () => {
    if (deletingCycleId) {
      setAllCycles(prev => prev.filter(c => c.id !== deletingCycleId));
      if (state.id === deletingCycleId) {
        // If we are deleting the currently active cycle, reset to landing after creating a new ID
        setState({ ...INITIAL_STATE, id: Math.random().toString(36).substring(2, 9) });
      }
      setDeletingCycleId(null);
      setDeleteStep(0);
    }
  };

  const cancelDelete = () => {
    setDeletingCycleId(null);
    setDeleteStep(0);
  };

  const saveCurrentCycle = () => {
    localStorage.setItem('poultry_app_state', JSON.stringify(state));
    localStorage.setItem('poultry_app_all_cycles', JSON.stringify(allCycles));
    alert('تم حفظ كافة بيانات البرنامج بنجاح');
  };

  // Scroll to top on screen change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const exportCSV = () => {
    const headers = ['Day', 'Weight (g)', 'Daily Feed (g)', 'Mortality', 'Notes', 'Meds Used'];
    const rows = state.dailyLogs.map(log => [
      log.day,
      log.weight,
      log.feed,
      log.mortality,
      `"${log.notes || ''}"`,
      `"${log.meds || ''}"`
    ]);

    const financialHeaders = ['Category', 'Amount', 'Description'];
    const financialRows = [
      ['Total Chicks Cost', toNum(state.chickCount) * toNum(state.chickPrice), ''],
      ['Total Feed Cost', toNum(state.totalFeedConsumed) * toNum(state.feedPrice), ''],
      ['Total Expenses', (state.otherExpenses || []).reduce((sum: number, e: any) => sum + toNum(e.amount), 0), ''],
      ['Mortality Rate', `${((toNum(state.totalMortality) / Math.max(toNum(state.chickCount), 1)) * 100).toFixed(2)}%`, '']
    ];

    let csvContent = "\ufeff"; // BOM for Arabic support in Excel
    csvContent += "تقرير دورة الإنتاج\n";
    csvContent += `اسم الدورة: ${state.cycleName}\n`;
    csvContent += `تاريخ البدء: ${state.startDate ? formatDateToDMY(new Date(state.startDate)) : '-'}\n\n`;
    
    csvContent += headers.join(',') + "\n";
    rows.forEach(row => { csvContent += row.join(',') + "\n"; });
    
    csvContent += "\nالبيانات المالية\n";
    csvContent += financialHeaders.join(',') + "\n";
    financialRows.forEach(row => { csvContent += row.join(',') + "\n"; });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_دورة_${state.cycleName || 'دواجن'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBackup = async () => {
    const backupData = {
      app: 'poultry_manager',
      version: 4,
      timestamp: new Date().toISOString(),
      activeCycle: state,
      archive: allCycles,
      settings: {
        isAutoSave
      }
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `poultry_backup_${timestamp}.json`;

    // 1. Check if running on Native Platform (standalone native Android/iOS Capacitor wrapper)
    if (Capacitor.isNativePlatform()) {
      try {
        // Save file to private Cache directory where no special runtime permissions are needed.
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        // Open Native Share sheet allowing user to save file in any folder, Drive, Files, or chat apps.
        // We do not wait for the share sheets full user lifecycle to claim success, 
        // because writing the file locally succeeded perfectly! This mimics your requested RN structure.
        try {
          // Trigger the native share sheet
          await Share.share({
            title: 'نسخة احتياطية - مدير الدواجن',
            text: 'ملف البيانات الكامل لبرنامج إدارة الدواجن',
            url: writeResult.uri,
            dialogTitle: 'حفظ أو مشاركة ملف النسخة الاحتياطية'
          });
          
          alert("نجحت العملية: تم حفظ وتجهيز ملف النسخة الاحتياطية بنجاح! ✅");
        } catch (shareErr: any) {
          const errMsg = (shareErr.message || '').toLowerCase();
          // Check if error is simply because user cancelled window or closed sheet without sharing
          if (errMsg.includes('cancel') || errMsg.includes('canceled') || errMsg.includes('share') || errMsg.includes('dismissed')) {
            alert("نجحت العملية: تم حفظ ملف النسخة الاحتياطية بنجاح! ✅");
          } else {
            console.warn('Share issue:', shareErr);
            alert("نجحت العملية: تم حفظ ملف النسخة الاحتياطية بنجاح! ✅");
          }
        }
      } catch (err: any) {
        console.error('Backup Native Error:', err);
        alert(`فشل الحفظ التلقائي: ${err.message || 'خطأ غير معروف'}.\nسنقوم بنسخ الكود الاحتياطي ليمكنك حفظه يدوياً.`);
        copyBackupCode();
      }
      return;
    }

    // 2. Browser/Mobile Web Fallback:
    // To ensure mobile web browsers (Safari on iOS, Chrome on Android) do NOT block the download,
    // we perform the traditional anchor click flow synchronously. In async contexts with 'await',
    // browser popup and download blockers mark the click stack trace as untrusted and block files.
    try {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poultry_backup_${timestamp}.json`;
      
      // Append to DOM to comply with old browser standards, then click
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // Show toast if available
      try {
        if (Toast) {
          Toast.show({
            text: 'تم تنزيل النسخة الاحتياطية بنجاح!',
            duration: 'short'
          });
        }
      } catch (_) {}
    } catch (browserErr) {
      console.error('Browser backup fallback error:', browserErr);
      // Last-resort fallback to web share if everything else failed
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (navigator.share && !isIframe) {
        try {
          const file = new File([dataStr], fileName, { type: 'application/json' });
          await navigator.share({
            files: [file],
            title: 'نسخة احتياطية - مدير الدواجن',
            text: 'ملف البيانات الكامل لبرنامج إدارة الدواجن'
          });
        } catch (shareErr) {
          console.error('Web share fallback also failed:', shareErr);
          alert('تعذر تحميل الملف تلقائياً. يرجى تكرار المحاولة أو نسخ كود البيانات يدوياً.');
        }
      } else {
        alert('تعذر تحميل الملف تلقائياً. يرجى تكرار المحاولة أو نسخ كود البيانات يدوياً.');
      }
    }
  };

  const copyBackupCode = async () => {
    try {
      const backupData = {
        app: 'poultry_manager',
        version: 4,
        timestamp: new Date().toISOString(),
        activeCycle: state,
        archive: allCycles,
        settings: {
          isAutoSave
        }
      };
      const dataStr = JSON.stringify(backupData);
      // Use Base64 to make it more "code-like" and avoid JSON formatting issues when pasting
      const base64Code = btoa(unescape(encodeURIComponent(dataStr)));
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(base64Code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = base64Code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      alert('تم نسخ كود النسخة الاحتياطية بنجاح! يمكنك حفظه في أي مكان واستعادته لاحقاً. 📋');
    } catch (err) {
      alert('فشل في نسخ الكود، يرجى المحاولة مرة أخرى أو تنزيل الملف كـ JSON.');
    }
  };

  const importFromCode = async () => {
    const code = prompt('يرجى لصق كود النسخة الاحتياطية هنا:');
    if (!code) return;

    try {
      const decodedData = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(decodedData);
      
      if (data.app === 'poultry_manager' && data.activeCycle) {
        if (confirm('سيتم استبدال البيانات الحالية بالكامل، هل أنت متأكد؟')) {
          setState({ ...INITIAL_STATE, ...data.activeCycle });
          if (Array.isArray(data.archive)) setAllCycles(data.archive);
          if (data.settings?.isAutoSave !== undefined) setIsAutoSave(data.settings.isAutoSave);
          alert('تم استيراد نسخة البرنامج الكاملة من الكود بنجاح');
        }
      } else {
        alert('كود النسخة الاحتياطية غير صالح');
      }
    } catch (err) {
      alert('حدث خطأ في قراءة الكود، تأكد من نسخه بشكل صحيح');
    }
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Handle legacy format (just state) or new format (full program)
        if (data.app === 'poultry_manager' && data.activeCycle) {
          setState({ ...INITIAL_STATE, ...data.activeCycle });
          if (Array.isArray(data.archive)) setAllCycles(data.archive);
          if (data.settings?.isAutoSave !== undefined) setIsAutoSave(data.settings.isAutoSave);
          alert('تم استيراد نسخة البرنامج الكاملة بنجاح');
        } else {
          // Legacy or single cycle import
          setState({ ...INITIAL_STATE, ...data, id: data.id || Math.random().toString(36).substring(2, 9) });
          alert('تم استيراد بيانات الدورة بنجاح');
        }
      } catch (err) {
        alert('فشل في قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
  };

  // Removed Google Drive Backup Logic to make room for Firebase Auth

  const confirmActivation = () => {
    if (activationCandidate) {
      const { groupId, bIdx } = activationCandidate;
      const bKey = `${groupId}_${bIdx}`;
      setState(prev => ({
        ...prev,
        manuallyActivatedBatteries: {
          ...prev.manuallyActivatedBatteries,
          [bKey]: true
        }
      }));
      setActiveBatteryIdx(bIdx);
      setActivationCandidate(null);
    }
  };

  useEffect(() => {
    if (isAutoSave) {
      localStorage.setItem('poultry_app_all_cycles', JSON.stringify(allCycles));
      localStorage.setItem('poultry_app_state', JSON.stringify(state));
    }
    localStorage.setItem('poultry_app_screen', screen);
    localStorage.setItem('poultry_app_autosave', String(isAutoSave));
  }, [allCycles, state, screen, isAutoSave]);

  const [currentTime, setCurrentTime] = React.useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isManualTimerRunning) {
      interval = setInterval(() => {
        setState(prev => ({ ...prev, manualTimerSeconds: prev.manualTimerSeconds + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.isManualTimerRunning]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setScreen('landing');
    } catch (error: any) {
      alert(`حدث خطأ أثناء تسجيل الدخول بجوجل: ${error.message}`);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
      setScreen('landing');
    } catch (error: any) {
      alert(`حدث خطأ أثناء تسجيل الدخول بفيسبوك: ${error.message}`);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      // 🌟 الرابط الجديد المباشر بعد التحديث الأخير لـ Apps Script
      const response = await smartFetch("https://script.google.com/macros/s/AKfycbx0VJfftf57D0D4_RS5kfBqQ7RRxQyPTb6N7DfGr37Kz-kR2PPI73DpCv0NZy_estRz/exec", {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // لتجاوز الـ CORS بنجاح
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      if (!response.ok) {
        throw new Error(`خطأ في السيرفر: ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e: any) {
        throw new Error(`تعذر قراءة بيانات السيرفر (Error: ${e.message}). تأكد من أن السيرفر يعمل بشكل صحيح وأن الرابط صالح.`);
      }

      if (result.status === 'success') {
        // حفظ خيارات تذكرني
        if (rememberMe) {
          localStorage.setItem('poultry_remember_me', 'true');
          localStorage.setItem('poultry_saved_email', loginEmail);
        } else {
          localStorage.removeItem('poultry_remember_me');
          localStorage.removeItem('poultry_saved_email');
        }

        // حفظ جلسة الدخول في الهاتف
        await Preferences.set({
          key: 'poultry_sheets_authenticated',
          value: 'true'
        });

        localStorage.setItem('poultry_gateway_passed', 'true');
        setScreen('landing');
        alert("تم تسجيل الدخول بنجاح!");
      } else {
        alert(result.message || "فشل تسجيل الدخول. تأكد من البيانات.");
      }
    } catch (error: any) {
      console.error("Sheets Login Error:", error);
      alert(`حدث خطأ أثناء الاتصال بنظام الأمان: ${error.message}`);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleGatewayLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsLoginLoading(true);
    try {
      // 🌟 الرابط الجديد المباشر بعد التحديث الأخير لـ Apps Script
      const response = await smartFetch("https://script.google.com/macros/s/AKfycbx0VJfftf57D0D4_RS5kfBqQ7RRxQyPTb6N7DfGr37Kz-kR2PPI73DpCv0NZy_estRz/exec", {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // لتجاوز الـ CORS بنجاح
        },
        body: JSON.stringify({
          email: gatewayEmail,
          password: gatewayPassword
        })
      });

      if (!response.ok) {
        throw new Error(`خطأ في السيرفر: ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e: any) {
        throw new Error(`تعذر قراءة بيانات السيرفر (Error: ${e.message}). تأكد من أن السيرفر يعمل بشكل صحيح وأن الرابط صالح.`);
      }

      if (result.status === 'success') {
        // حفظ خيارات تذكرني للمدخلين
        if (rememberMe) {
          localStorage.setItem('poultry_remember_me', 'true');
          localStorage.setItem('poultry_saved_email', gatewayEmail);
        } else {
          localStorage.removeItem('poultry_remember_me');
          localStorage.removeItem('poultry_saved_email');
        }

        // حفظ جلسة الدخول في الهاتف
        await Preferences.set({
          key: 'poultry_sheets_authenticated',
          value: 'true'
        });

        localStorage.setItem('poultry_gateway_passed', 'true');
        setScreen('landing');
        alert("تم التصريح بالدخول بنجاح!");
      } else {
        alert(result.message || "فشل التصريح. تأكد من البيانات.");
      }
    } catch (error: any) {
      console.error("Sheets Gateway Error:", error);
      alert(`حدث خطأ أثناء الاتصال بنظام الأمان: ${error.message}`);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleAppLogout = () => {
    setIsLogoutConfirming(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('poultry_gateway_passed');
    localStorage.removeItem('poultry_app_screen');
    Preferences.remove({ key: 'poultry_sheets_authenticated' });
    signOut(auth).catch(() => {});
    
    setGatewayEmail('');
    setGatewayPassword('');
    setLoginEmail('');
    setLoginPassword('');

    setScreen('gateway');
    setIsLogoutConfirming(false);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as any).email.value;
    const password = (e.target as any).password.value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setScreen('landing');
    } catch (error: any) {
      alert(`حدث خطأ أثناء إنشاء الحساب: ${error.message}`);
    }
  };

  const autoDistributeTiers = useCallback((total: number, tiers: number, length: number, width: number, age: number, external: boolean) => {
    const n = toNum(tiers);
    if (n <= 0) return [];

    const mid = Math.floor((n - 1) / 2);
    const sequence: number[] = [mid];
    for (let i = 1; i < n; i++) {
      const left = mid - i;
      const right = mid + i;
      if (left >= 0 && !sequence.includes(left)) sequence.push(left);
      if (right < n && !sequence.includes(right)) sequence.push(right);
    }

    let remaining = toNum(total);
    const counts: (number | string)[] = new Array(n).fill(0);
    
    // Fill up to recommendation starting from middle
    for (const idx of sequence) {
      const rec = getRecPerTierAcrossGroups(idx, age, external);
      const space = Math.min(remaining, rec);
      counts[idx] = space;
      remaining -= space;
    }
    
    // Distribute any leftovers equally
    if (remaining > 0) {
      let i = 0;
      while (remaining > 0) {
        const idx = sequence[i % n];
        counts[idx] = toNum(counts[idx]) + 1;
        remaining -= 1;
        i++;
      }
    }
    
    return counts;
  }, [getRecPerTierAcrossGroups]);

  const autoDistributeByGroup = useCallback((totalToDistribute: number, age: number, external: boolean) => {
    const groups = state.batteryGroups || [];
    if (groups.length === 0) return {};

    const density = 
      age <= 7 ? 45 :
      age <= 14 ? 32 :
      age <= 21 ? 22 :
      age <= 28 ? 17 :
      age <= 35 ? 14 : 12;

    const multiplier = external ? 1.15 : 1;
    
    interface TierCap {
      groupId: string;
      batteryIdx: number;
      tierIdx: number;
      capacity: number;
    }

    const tierCapacities: TierCap[] = [];
    groups.forEach(group => {
      const gCap = toNum(group.length) * toNum(group.width) * density * multiplier;
      const count = toNum(group.count);
      const tiers = toNum(group.tiers);
      for (let b = 0; b < count; b++) {
        for (let t = 0; t < tiers; t++) {
          tierCapacities.push({ groupId: group.id, batteryIdx: b, tierIdx: t, capacity: gCap });
        }
      }
    });

    const totalCapacity = tierCapacities.reduce((acc, tc) => acc + tc.capacity, 0);
    const newGroupTierCounts: Record<string, (number | string)[]> = {};

    // Initialize all buckets
    tierCapacities.forEach(tc => {
      const key = `${tc.groupId}_${tc.batteryIdx}`;
      if (!newGroupTierCounts[key]) {
        const tiers = toNum(groups.find(g => g.id === tc.groupId)?.tiers || 0);
        newGroupTierCounts[key] = new Array(tiers).fill(0);
      }
    });

    let remaining = toNum(totalToDistribute);
    
    if (state.distributionMode === 'sequential') {
      // Sequential distribution: Fill each tier completely before moving to the next
      for (let i = 0; i < tierCapacities.length && remaining > 0; i++) {
        const tc = tierCapacities[i];
        const key = `${tc.groupId}_${tc.batteryIdx}`;
        const amount = Math.min(remaining, Math.floor(tc.capacity));
        newGroupTierCounts[key][tc.tierIdx] = amount;
        remaining -= amount;
      }
    } else {
      // Equal distribution logic (as requested before)
      if (totalCapacity > 0) {
         tierCapacities.forEach(tc => {
           const proportion = tc.capacity / totalCapacity;
           const share = Math.min(tc.capacity, Math.floor(toNum(totalToDistribute) * proportion));
           const key = `${tc.groupId}_${tc.batteryIdx}`;
           newGroupTierCounts[key][tc.tierIdx] = share;
           remaining -= share;
         });
      }

      if (remaining > 0 && tierCapacities.length > 0) {
        for (let i = 0; i < tierCapacities.length && remaining > 0; i++) {
          const tc = tierCapacities[i];
          const key = `${tc.groupId}_${tc.batteryIdx}`;
          const currentCount = toNum(newGroupTierCounts[key][tc.tierIdx]);
          const available = tc.capacity - currentCount;
          const toAdd = Math.min(remaining, available);
          if (toAdd > 0) {
            newGroupTierCounts[key][tc.tierIdx] = currentCount + toAdd;
            remaining -= toAdd;
          }
        }
      }
    }

    return newGroupTierCounts;
  }, [state.batteryGroups, state.distributionMode]);

  // Auto-fill distribution if missing for current age
  useEffect(() => {
    const chicksNum = toNum(state.totalChicks);
    const distributed = autoDistributeByGroup(chicksNum, toNum(state.age), state.externalEquipment);
    const currentDay = String(state.age);
    const currentDist = state.dailyBatteryGroupTierCounts?.[currentDay];

    if (JSON.stringify(currentDist) !== JSON.stringify(distributed)) {
      setState(prev => ({
        ...prev,
        dailyBatteryGroupTierCounts: {
          ...(prev.dailyBatteryGroupTierCounts || {}),
          [currentDay]: distributed
        }
      }));
    }
  }, [state.totalChicks, state.distributionMode, state.batteryGroups, state.age, state.externalEquipment, autoDistributeByGroup]);

  const [openMedDropdown, setOpenMedDropdown] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Age Tracking Logic ---
  useEffect(() => {
    if (!state.startDate || state.isManualOverride) return;

    const start = new Date(state.startDate);
    const today = new Date(currentTime); // Use the live currentTime
    
    // Normalize to midnight for calculation
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.max(0, today.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays !== toNum(state.age)) {
      setState(prev => ({ ...prev, age: diffDays }));
      // Notification is handled in a separate effect
    }
  }, [state.startDate, state.isManualOverride, currentTime.toDateString()]);

  // Show notification when age updates
  const [lastNotifiedAge, setLastNotifiedAge] = useState<number | null>(null);
  useEffect(() => {
    const currentAge = toNum(state.age);
    if (lastNotifiedAge !== null && currentAge > lastNotifiedAge && !state.isManualOverride) {
      // Small visual indicator or alert
      // We'll use a simpler approach since we don't have a toast system yet
      console.log(`تم تحديث عمر القطيع تلقائياً إلى ${currentAge} يوم`);
    }
    setLastNotifiedAge(currentAge);
  }, [state.age, state.isManualOverride]);

  const getClimateFromTemp = (temp: number): keyof typeof CLIMATE_FACTORS => {
    if (temp <= 10) return 'بارد جدا';
    if (temp <= 22) return 'بارد';
    if (temp <= 30) return 'معتدل';
    if (temp <= 38) return 'حار';
    return 'حار جدا';
  };

  React.useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      climate: getClimateFromTemp(toNum(prev.externalTemp)) 
    }));
  }, [state.externalTemp]);

  const dailyStats = useMemo(() => {
    const currentAge = toNum(state.age);
    const standardStats = getDailyStats(state.strain, currentAge);
    
    const weightLogs = state.weightLogs || {};
    const manualWeight = toNum(weightLogs[String(currentAge)]);

    // If we have an exact entry for TODAY, that is our "Actual" weight
    if (manualWeight > 0) {
      return { 
        ...standardStats, 
        weight: manualWeight,
        standardWeight: standardStats.weight,
        isScientific: false,
        status: manualWeight >= standardStats.weight ? 'excellent' : 'behind'
      };
    }

    // Find previous manual entries to calculate a performance factor
    const manualDays = Object.keys(weightLogs)
      .map(Number)
      .filter(day => day > 0 && toNum(weightLogs[String(day)]) > 0)
      .sort((a, b) => a - b);

    if (manualDays.length > 0) {
      const pastManualDays = manualDays.filter(day => day < currentAge);
      if (pastManualDays.length > 0) {
        const lastManualDay = Math.max(...pastManualDays);
        const lastManualWeight = toNum(weightLogs[String(lastManualDay)]);
        const standardWeightAtThatDay = getDailyStats(state.strain, lastManualDay).weight;
        
        const performanceFactor = lastManualWeight / standardWeightAtThatDay;
        const projectedWeight = Math.round(standardStats.weight * performanceFactor);
        
        return { 
          ...standardStats, 
          weight: projectedWeight,
          standardWeight: standardStats.weight,
          isProjected: true,
          isScientific: false,
          status: projectedWeight >= standardStats.weight ? 'excellent' : 'behind'
        };
      }
    }
    
    // Default: Pure Scientific Standard
    return { 
      ...standardStats, 
      standardWeight: standardStats.weight,
      isScientific: true 
    };
  }, [state.strain, state.age, state.weightLogs]);

  const yesterdayStats = useMemo(() => {
    const prevAge = Math.max(0, toNum(state.age) - 1);
    if (prevAge === 0) return { age: 0, weight: 42, dailyFeed: 0, cumFeed: 0, dailyWater: 0 };
    
    const standardStats = getDailyStats(state.strain, prevAge);
    const weightLogs = state.weightLogs || {};
    const manualWeight = toNum(weightLogs[String(prevAge)]);

    if (manualWeight > 0) {
      return { ...standardStats, weight: manualWeight };
    }

    const manualDays = Object.keys(weightLogs)
      .map(Number)
      .filter(day => day > 0 && toNum(weightLogs[String(day)]) > 0)
      .sort((a, b) => a - b);

    if (manualDays.length > 0) {
      const pastManualDays = manualDays.filter(day => day < prevAge);
      if (pastManualDays.length > 0) {
        const lastManualDay = Math.max(...pastManualDays);
        const lastManualWeight = toNum(weightLogs[String(lastManualDay)]);
        const standardWeightAtThatDay = getDailyStats(state.strain, lastManualDay).weight;
        const performanceFactor = lastManualWeight / standardWeightAtThatDay;
        return { ...standardStats, weight: Math.round(standardStats.weight * performanceFactor) };
      }
    }
    
    return standardStats;
  }, [state.strain, state.age, state.weightLogs]);

  const kpis = useMemo(() => {
    const age = toNum(state.age);
    const weightToday = dailyStats.weight;
    const weightYesterday = yesterdayStats.weight;
    
    // ADG (Average Daily Gain since day 0)
    const adgSinceStart = age > 0 ? (weightToday / age).toFixed(1) : '0';
    // Daily Gain (Last 24h)
    const dailyGain = weightToday - weightYesterday;
    
    // FCR (Feed Conversion Ratio)
    const fcr = weightToday > 0 ? (dailyStats.cumFeed / weightToday).toFixed(3) : '0.000';
    
    // Standard comparison
    const standardStats = getDailyStats(state.strain, age);
    const standardFcr = standardStats.weight > 0 ? (standardStats.cumFeed / standardStats.weight).toFixed(3) : '0.000';
    const standardAdg = age > 0 ? (standardStats.weight / age).toFixed(1) : '0';

    return { 
      adg: adgSinceStart, 
      dailyGain,
      standardAdg,
      fcr, 
      standardFcr,
      fcrDiff: (parseFloat(fcr) - parseFloat(standardFcr)).toFixed(3)
    };
  }, [dailyStats, yesterdayStats, state.strain, state.age]);

  // --- Mortality Calculation Helpers ---
  const allBills = useMemo(() => [
    ...state.electricityBills, 
    ...state.waterBills, 
    ...state.medicationBills, 
    ...state.otherBills,
    ...(state.laborBills || [])
  ], [state.electricityBills, state.waterBills, state.medicationBills, state.otherBills, state.laborBills]);
  
  const getBirdDaysInRange = (start: number, end: number) => {
    let totalBirdDays = 0;
    const totalChicks = toNum(state.totalChicks);
    for (let day = start; day <= end; day++) {
      const birdsDiedUntilToday = state.mortalityBills.reduce((acc, m) => {
        if (toNum(m.ageAtDeath) < day) return acc + toNum(m.count);
        return acc;
      }, 0);
      const survivors = Math.max(0, totalChicks - birdsDiedUntilToday);
      totalBirdDays += survivors;
    }
    return totalBirdDays || 1;
  };

  const calculateMortalityOverhead = (ageAtDeath: number) => {
    let birdShare = 0;
    allBills.forEach(bill => {
      const bStart = Math.max(1, toNum(bill.endDay));
      const bEnd = Math.max(bStart, toNum(bill.startDay));
      const overlapStart = Math.max(1, bStart);
      const overlapEnd = Math.min(ageAtDeath, bEnd);
      if (overlapEnd >= overlapStart) {
        const daysLivedInBillPeriod = (overlapEnd - overlapStart) + 1;
        const totalBirdDaysInBillPeriod = getBirdDaysInRange(bStart, bEnd);
        birdShare += (toNum(bill.amount) / totalBirdDaysInBillPeriod) * daysLivedInBillPeriod;
      }
    });
    return birdShare;
  };

  const finances = useMemo(() => {
    // 1. Inputs & Census
    const birdsDied = state.mortalityBills.reduce((acc, m) => acc + toNum(m.count), 0);
    const birdsAlive = Math.max(0, toNum(state.totalChicks) - birdsDied);
    const birdsBought = toNum(state.totalChicks);
    
    // 2. Direct Costs (COGS Components)
    const totalChickPurchaseCost = birdsBought * toNum(state.chickPrice);
    
    // Precision Feed Calculation
    const feedConsumedDead = state.mortalityBills.reduce((acc, m) => 
      acc + (toNum(m.count) * getDailyStats(state.strain, toNum(m.ageAtDeath)).cumFeed), 0);
    const feedConsumedAlive = birdsAlive * dailyStats.cumFeed;
    const totalFeedKg = (feedConsumedAlive + feedConsumedDead) / 1000;
    const modelFeedCost = totalFeedKg * toNum(state.feedPrice);

    // Manual Feed Bills (Actual Purchases)
    const manualFeedBillSum = [
      ...(state.feedBillsBady || []),
      ...(state.feedBillsNamy || []),
      ...(state.feedBillsNahy || [])
    ].reduce((acc, b) => acc + (toNum(b.amount) * toNum(b.quantity || 1)), 0);

    const totalFeedCost = manualFeedBillSum > 0 ? manualFeedBillSum : modelFeedCost;
    
    // 3. Operating Expenses (OpEx)
    const generalBillSum = allBills.reduce((acc, b) => acc + toNum(b.amount), 0);
    
    // 4. Total Expenditure (Total Cash Outflow)
    const totalSpending = totalChickPurchaseCost + totalFeedCost + generalBillSum;
    
    // 5. Revenue Analysis
    const actualSalesRevenue = state.salesRecords.reduce((acc, s) => acc + toNum(s.amount), 0);
    const totalWeightSoldKg = state.salesRecords.reduce((acc, s) => acc + toNum(s.weight), 0);
    
    // Inventory Valuation (Pro-forma)
    const avgWeightKg = dailyStats.weight / 1000 || 1;
    const birdsSoldEstimate = totalWeightSoldKg / (avgWeightKg || 1);
    const birdsRemaining = Math.max(0, birdsAlive - birdsSoldEstimate);
    const estimatedRemainingRevenue = (birdsRemaining * avgWeightKg) * toNum(state.sellingPrice);
    
    const totalRevenueProjected = actualSalesRevenue + estimatedRemainingRevenue;
    
    // 6. Net Performance
    const netProfit = totalRevenueProjected - totalSpending;
    const roiPercentage = totalSpending > 0 ? (netProfit / totalSpending) * 100 : 0;
    
    // 7. Sensitivity & Unit Economics
    const totalYieldKg = totalWeightSoldKg + (birdsRemaining * avgWeightKg);
    const costPerKg = totalYieldKg > 0 ? totalSpending / totalYieldKg : 0;
    const breakEvenPrice = costPerKg; // The inflection point for profitability

    // 8. Mortality Sunk-Cost Analysis (for internal audit)
    const mortalityLossTotal = state.mortalityBills.reduce((acc, mort) => {
      const age = toNum(mort.ageAtDeath);
      const stats = getDailyStats(state.strain, age);
      const individualLoss = toNum(state.chickPrice) + 
                             ((stats.cumFeed / 1000) * toNum(state.feedPrice)) + 
                             calculateMortalityOverhead(age);
      return acc + (individualLoss * toNum(mort.count));
    }, 0);

    return {
      totalSpending,
      totalRevenue: totalRevenueProjected,
      netProfit,
      roiPercentage,
      costPerKg,
      breakEvenPrice,
      mortalityLossTotal,
      birdsAlive,
      birdsDied,
      totalFeedCost,
      generalBillSum,
      totalChickPurchaseCost,
      actualSalesRevenue,
      estimatedRemainingRevenue,
      totalYieldKg,
      avgWeightAtDeath: birdsDied > 0 ? (feedConsumedDead / (birdsDied * 1000)) : 0
    };
  }, [state.mortalityBills, state.totalChicks, state.strain, dailyStats.cumFeed, dailyStats.weight, state.feedPrice, state.chickPrice, state.sellingPrice, state.salesRecords, allBills, calculateMortalityOverhead]);

  const currentAgeStr = String(state.age);
  const targetTemp = getTargetTemperature(toNum(state.age));

  const environmentalLoad = useMemo(() => {
    return EnvironmentalLoadService.calculate({
      weightKg: dailyStats.weight / 1000,
      birdsCount: finances.birdsAlive,
      temperatureC: toNum(state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp),
      deltaT: toNum(state.environmentalLoadDeltaT || 3),
      targetTemp: targetTemp,
      densityKgM2: toNum(state.environmentalLoadDensity || 30),
      poorInsulation: state.environmentalLoadInsulation || false,
    });
  }, [dailyStats.weight, finances.birdsAlive, state.dailyInternalTemp, currentAgeStr, state.internalTemp, state.environmentalLoadDeltaT, targetTemp, state.environmentalLoadDensity, state.environmentalLoadInsulation]);

  const climateInfo = CLIMATE_FACTORS[state.climate];

  // Derived Calculations
  const herdBiomass = (toNum(state.totalChicks) * dailyStats.weight) / 1000; // in kg
  const dailyFeedTotal = Math.ceil((toNum(state.totalChicks) * dailyStats.dailyFeed) / 1000); // in kg
  const dailyWaterTotal = (dailyFeedTotal * (climateInfo?.waterFactor || 1.8)); // Standard water/feed ratio
  const dailyWaterTotalLiters = Math.ceil((toNum(state.totalChicks) * dailyStats.dailyWater * ((climateInfo?.waterFactor || 1.8) / 1.8)) / 1000); // Adjusted for climate
  
  const totalBatteries = state.batteryGroups.reduce((acc, g) => acc + toNum(g.count), 0);
  const waterPerBattery = totalBatteries > 0 ? (dailyWaterTotalLiters / totalBatteries).toFixed(1) : dailyWaterTotalLiters;

  const batteryWaterDistribution = useMemo(() => {
    const currentAge = String(state.age);
    const dayData = state.dailyBatteryGroupTierCounts?.[currentAge] || {};
    const totalChicksNum = toNum(state.totalChicks);

    const units: {
      groupId: string;
      groupName: string;
      unitIndex: number;
      unitName: string;
      birdsCount: number;
      waterLiters: number;
      percentage: number;
    }[] = [];

    let totalBirdsAcrossAllBatteries = 0;
    
    (state.batteryGroups || []).forEach(group => {
      const groupCount = toNum(group.count);
      for (let i = 0; i < groupCount; i++) {
        const bKey = `${group.id}_${i}`;
        const tierCounts = dayData[bKey] || [];
        const birdsInThisBattery = toNum(tierCounts.reduce((sum: number, c: any) => sum + toNum(c), 0));
        totalBirdsAcrossAllBatteries += birdsInThisBattery;

        units.push({
          groupId: group.id,
          groupName: group.name || 'مجموعة بطاريات',
          unitIndex: i,
          unitName: `${group.name || 'البطارية'} - وحدة ${i + 1}`,
          birdsCount: birdsInThisBattery,
          waterLiters: 0,
          percentage: 0
        });
      }
    });

    if (totalBirdsAcrossAllBatteries === 0) {
      const unitsCount = units.length;
      if (unitsCount > 0) {
        const equalBirds = Math.floor(totalChicksNum / unitsCount);
        const remainder = totalChicksNum % unitsCount;
        units.forEach((unit, idx) => {
          unit.birdsCount = equalBirds + (idx < remainder ? 1 : 0);
        });
        totalBirdsAcrossAllBatteries = totalChicksNum;
      }
    }

    if (totalBirdsAcrossAllBatteries > 0) {
      units.forEach(unit => {
        unit.percentage = (unit.birdsCount / totalBirdsAcrossAllBatteries) * 100;
        unit.waterLiters = parseFloat(((unit.birdsCount / totalBirdsAcrossAllBatteries) * dailyWaterTotalLiters).toFixed(1));
      });
    } else {
      const unitsCount = units.length;
      if (unitsCount > 0) {
        units.forEach(unit => {
          unit.percentage = 100 / unitsCount;
          unit.waterLiters = parseFloat((dailyWaterTotalLiters / unitsCount).toFixed(1));
        });
      }
    }

    return {
      units,
      totalBirdsAcrossAllBatteries
    };
  }, [state.batteryGroups, state.dailyBatteryGroupTierCounts, state.age, state.totalChicks, dailyWaterTotalLiters]);

  const activeBatteriesCount = useMemo(() => {
    return batteryWaterDistribution.units.filter(u => u.birdsCount > 0).length;
  }, [batteryWaterDistribution]);

  const waterPerActiveBattery = activeBatteriesCount > 0 
    ? (dailyWaterTotalLiters / activeBatteriesCount).toFixed(1) 
    : dailyWaterTotalLiters;
  
  const formatArabicTime = (date: Date, referenceDate?: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const period = h >= 12 ? 'م' : 'ص';
    const displayH = h % 12 || 12;
    
    let suffix = "";
    if (referenceDate) {
      // Check if it's a different calendar day
      const d1 = new Date(referenceDate);
      d1.setHours(0, 0, 0, 0);
      const d2 = new Date(date);
      d2.setHours(0, 0, 0, 0);
      
      if (d2.getTime() > d1.getTime()) {
        suffix = " (اليوم التالي)";
      }
    }
    
    return `${displayH}:${m} ${period}${suffix}`;
  };

  // Sync moisture calculator inputs with setup total chicks and dashboard weight
  useEffect(() => {
    if (state.totalChicks) {
      setHumidityTotalBirds(String(state.totalChicks));
    }
  }, [state.totalChicks]);

  useEffect(() => {
    if (dailyStats?.weight) {
      setHumidityAvgWeight(String(dailyStats.weight));
    }
  }, [dailyStats?.weight]);

  const getNextTime = (startTimeStr: string, currentMed: any, nextMed: any, isNextDay: boolean = false) => {
    if (!startTimeStr || !currentMed || !nextMed) return null;

    const [h, m] = startTimeStr.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const duration = toNum(currentMed.recommendedHours || currentMed.duration);
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    let gapHours = isNextDay ? 0 : 1;
    if (currentMed.category === 'راحة' || nextMed.category === 'راحة' || currentMed.isAntibiotic) {
       gapHours = 0;
    }
    
    const nextStartDate = new Date(endDate.getTime() + gapHours * 60 * 60 * 1000);
    
    return {
      endTimeStr: formatArabicTime(endDate, startDate),
      nextStartTimeStr: formatArabicTime(nextStartDate, startDate),
      label: gapHours === 0 ? "تليها مباشرة" : "الموعد القادم"
    };
  };

  const getCategoryColorClasses = (category: string, name: string = '') => {
    const cat = category?.trim() || '';
    const nm = name?.trim() || '';

    // 1. White Group (Specific Supplements/Rehydration)
    if (cat === 'أملاح معدنية' || cat === 'محلول معالجة الجفاف' || 
        nm.includes('أملاح') || nm.includes('جفاف') || 
        nm.includes('مثبت لقاح') || nm.includes('أحماض أمينية')) {
      return {
        border: 'border-s-white',
        bg: 'bg-white/10',
        text: 'text-white',
        dot: 'bg-white',
        dotShadow: 'shadow-[0_0_8px_rgba(255,255,255,0.5)]',
        accent: 'text-slate-200'
      };
    }

    // 2. Light Red Group (Antibiotics & Specific Vaccines)
    if (cat === 'مضاد حيوي' || nm.includes('مضاد حيوي') || 
        nm.includes('كوكسيديا') || nm.includes('كلوستريديا') || 
        nm.includes('جمبورو') || nm.includes('هيتشنر')) {
      return {
        border: 'border-s-red-400',
        bg: 'bg-red-400/10',
        text: 'text-red-400',
        dot: 'bg-red-400',
        dotShadow: 'shadow-[0_0_8px_rgba(248,113,113,0.5)]',
        accent: 'text-red-300'
      };
    }

    // 3. Vitamins & Probiotics: Emerald/Green
    if (cat === 'فيتامينات' || cat === 'بكتيريا نافعة' || 
        nm.includes('فيتامين') || nm.includes('بكتيريا') || nm.includes('بروبيوتك')) {
      return {
        border: 'border-s-emerald-500',
        bg: 'bg-emerald-600/10',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500',
        dotShadow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
        accent: 'text-emerald-300'
      };
    }

    // 4. Vaccines & Emergency (Remaining): Pure Red
    if (cat === 'تحصين' || cat === 'طوارئ' || nm.includes('تحصين') || nm.includes('طوارئ')) {
      return {
        border: 'border-s-red-600',
        bg: 'bg-red-600/10',
        text: 'text-red-400',
        dot: 'bg-red-600',
        dotShadow: 'shadow-[0_0_8px_rgba(220,38,38,0.5)]',
        accent: 'text-red-300'
      };
    }

    // 5. Yellow Group (Kidney Wash & Liver Tonic) - Solar Yellow
    if (cat === 'كلوي/كبد' || nm.includes('غسيل') || nm.includes('كلوي') || nm.includes('منشط') || nm.includes('كبد')) {
      return {
        border: 'border-s-yellow-400',
        bg: 'bg-yellow-400/10',
        text: 'text-yellow-400',
        dot: 'bg-yellow-400',
        dotShadow: 'shadow-[0_0_8px_rgba(250,204,21,0.5)]',
        accent: 'text-yellow-300'
      };
    }

    // 6. Beige Group (Antitoxin/Antifungal) - Amber/Beige vibe
    if (cat === 'سموم' || nm.includes('سموم') || nm.includes('فطرية')) {
      return {
        border: 'border-s-[#d2b48c]', // Tan/Beige
        bg: 'bg-[#d2b48c]/10',
        text: 'text-[#d2b48c]',
        dot: 'bg-[#d2b48c]',
        dotShadow: 'shadow-[0_0_8px_rgba(210,180,140,0.5)]',
        accent: 'text-[#e5d3b3]'
      };
    }

    // 7. Pure Water: Sky Blue
    if (cat === 'ماء نقي' || nm.includes('ماء نقي') || nm.includes('مياه')) {
      return {
        border: 'border-s-sky-400',
        bg: 'bg-sky-400/10',
        text: 'text-sky-400',
        dot: 'bg-sky-400',
        dotShadow: 'shadow-[0_0_8px_rgba(56,189,248,0.5)]',
        accent: 'text-sky-300'
      };
    }

    // 6. Rest/Darkness: Slate
    if (cat === 'راحة' || cat === 'إظلام' || nm.includes('راحة') || nm.includes('إظلام')) {
      return {
        border: 'border-s-slate-500',
        bg: 'bg-slate-600/10',
        text: 'text-slate-400',
        dot: 'bg-slate-500',
        dotShadow: 'shadow-[0_0_8px_rgba(100,116,139,0.5)]',
        accent: 'text-slate-300'
      };
    }

    // Default: Blue
    return {
      border: 'border-s-blue-500',
      bg: 'bg-blue-600/10',
      text: 'text-blue-400',
      dot: 'bg-blue-500',
      dotShadow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
      accent: 'text-blue-300'
    };
  };

  const prevDayMeds = useMemo(() => {
    if (toNum(state.age) <= 1) return [];
    
    // Calculate dailyMeds logic for the previous day
    const prevAge = toNum(state.age) - 1;
    const rawMeds = MEDICATIONS.filter((m: any) => m.targetDays.includes(prevAge) && m.climates.includes(state.climate));
    
    // Scientific Sorting
    const categoryWeights: Record<string, number> = {
      'تأسيس': 1,
      'فيتامينات': 2,
      'داعم': 3,
      'تحصين': 4,
      'راحة': 5,
      'وقائي': 6,
      'أمان': 7
    };
    rawMeds.sort((a: any, b: any) => (categoryWeights[a.category] || 99) - (categoryWeights[b.category] || 99));

    const uniqueMeds: any[] = [];
    
    // Day 3 & 4 Special Sequence: Antibiotic -> Water -> Vitamin -> Water
    if (prevAge === 3 || prevAge === 4) {
      const antibiotic = rawMeds.find(m => m.isAntibiotic || m.name.includes('حيوي') || m.category === 'وقائي');
      const vitamin = rawMeds.find(m => m.category === 'فيتامينات' && m.name.includes('أد3هـ'));
      const water = rawMeds.find(m => m.category === 'راحة' || m.name.includes('ماء نقي'));
      
      if (antibiotic || vitamin || water) {
        if (antibiotic) uniqueMeds.push({ ...antibiotic, id: `${antibiotic.id || antibiotic.name}-1`, recommendedHours: 6 });
        if (water) uniqueMeds.push({ ...water, id: `${water.id || water.name}-1`, recommendedHours: 2 });
        if (vitamin) uniqueMeds.push({ ...vitamin, id: `${vitamin.id || vitamin.name}-1`, recommendedHours: 6 });
        if (water) uniqueMeds.push({ ...water, id: `${water.id || water.name}-2`, recommendedHours: 2 });
      }
    }

    if (uniqueMeds.length === 0) {
      const unique = rawMeds.filter((m: any, i: number) => i === 0 || m.name !== rawMeds[i-1].name);
      uniqueMeds.push(...unique);
    }
    
    const structuredMeds = uniqueMeds.map(m => {
      const stableId = m.id || m.name;
      const logKey = `${prevAge}-${stableId}`;
      const override = state.medDataOverrides?.[logKey];
      
      let duration = toNum(override?.duration !== undefined ? override.duration : (m.recommendedHours || 0));
      let name = override?.name || m.name;
      let doseValue = override?.doseValue !== undefined ? override.doseValue : (m.doseValue || 0);

      if (uniqueMeds.length > 1 && duration >= 12 && override?.duration === undefined) duration = 10;
      return { ...m, id: stableId, name, recommendedHours: duration, doseValue };
    });

    const meds: any[] = [];
    for (let i = 0; i < structuredMeds.length; i++) {
        meds.push(structuredMeds[i]);
        const current = structuredMeds[i] as any;
        const next = structuredMeds[i+1] as any;
        if (i < structuredMeds.length - 1) {
            const isCurrentWater = current.category === 'راحة' || current.name === 'ماء نقي';
            const isNextWater = next && (next.category === 'راحة' || next.name === 'ماء نقي');
            if (!isCurrentWater && !isNextWater) {
                meds.push({
                    name: 'ماء نقي',
                    unit: 'لتر',
                    doseValue: 0,
                    recommendedHours: 2, // Updated to 2h gap
                    isRest: true,
                    category: 'راحة',
                    id: `water-gap-prev-${prevAge}-${i}`
                });
            }
        }
    }

    const currentTotalHours = meds.reduce((acc, m) => acc + (m.recommendedHours || 0), 0);
    if (currentTotalHours < 24) {
        meds.push({
            name: 'ماء نقي (ختام اليوم)',
            unit: 'لتر',
            recommendedHours: 24 - currentTotalHours,
            isRest: true,
            category: 'راحة',
            id: `day-end-water-prev-${prevAge}`
        });
    }

    return meds;
  }, [state.age, state.climate, state.medDataOverrides]);

  const lastMedPrevDay = prevDayMeds.length > 0 ? prevDayMeds[prevDayMeds.length - 1] : null;
  const lastMedPrevDayKey = lastMedPrevDay ? `${toNum(state.age) - 1}-${lastMedPrevDay.id || lastMedPrevDay.name}` : null;
  const lastMedStartTime = lastMedPrevDayKey ? state.medicationLogs[lastMedPrevDayKey] : null;

  const dailyMeds = useMemo(() => {
    const rawMeds = MEDICATIONS.filter((m: any) => m.targetDays.includes(toNum(state.age)) && m.climates.includes(state.climate));
    
    // We respect the original order in MEDICATIONS as provided by the user
    let uniqueMeds = rawMeds.filter((m, i) => i === 0 || m.name !== rawMeds[i-1].name || (m.id && m.id !== rawMeds[i-1].id));
    
    // Check boundary with previous day to avoid consecutive Pure Water if requested, 
    // but mostly we should follow the plan. 
    // We'll keep the boundary check as it helps clean up transitions.
    const yesterdayEndedWithWater = lastMedPrevDay && (lastMedPrevDay.name.includes('ماء نقي') || lastMedPrevDay.category === 'راحة');
    
    if (yesterdayEndedWithWater && uniqueMeds.length > 0 && (uniqueMeds[0].name === 'ماء نقي' || uniqueMeds[0].category === 'راحة')) {
        // uniqueMeds = uniqueMeds.slice(1); // Removed to strictly follow user's day-start plan
    }

    const structuredMeds = uniqueMeds.map(m => {
      const stableId = m.id || m.name;
      const logKey = `${toNum(state.age)}-${stableId}`;
      const override = state.medDataOverrides?.[logKey];
      
      let duration = toNum(override?.duration !== undefined ? override.duration : (m.recommendedHours || 0));
      let doseValue = override?.doseValue !== undefined ? override.doseValue : (m.doseValue || 0);
      let name = override?.name || m.name;
      let unit = override?.unit || m.unit;

      // If we have multiple meds and this one is 12h+, cap it to 10h to allow gaps/rest
      if (uniqueMeds.length > 1 && duration >= 12 && override?.duration === undefined) {
        duration = 10;
      }
      return { 
        ...m, 
        id: stableId,
        name,
        duration, 
        recommendedHours: duration, 
        doseValue,
        unit
      };
    });

    // Inject Pure Water gaps (Rule like Day 1)
    const meds: any[] = [];
    for (let i = 0; i < structuredMeds.length; i++) {
        meds.push(structuredMeds[i]);
        const current = structuredMeds[i] as any;
        const next = structuredMeds[i+1] as any;
        
        // Add 1h gap between different treatment types
        if (i < structuredMeds.length - 1) {
            const isCurrentWater = current.category === 'راحة' || current.name === 'ماء نقي';
            const isNextWater = next && (next.category === 'راحة' || next.name === 'ماء نقي');
            
            if (!isCurrentWater && !isNextWater) {
                meds.push({
                    name: 'ماء نقي',
                    unit: 'لتر',
                    doseValue: 0,
                    recommendedHours: 2, // Updated to 2h gap
                    isRest: true,
                    category: 'راحة',
                    id: `water-gap-${state.age}-${i}`
                });
            }
        }
    }

    // Scaling logic if exceeded 24 hours (strictly enforcing integers)
    let currentTotalHours = meds.reduce((acc, m) => acc + (m.recommendedHours || 0), 0);
    if (currentTotalHours > 24) {
        const scale = 24 / currentTotalHours;
        meds.forEach(m => {
            m.recommendedHours = Math.round((m.recommendedHours || 0) * scale);
        });
        
        let newTotal = meds.reduce((acc, m) => acc + (m.recommendedHours || 0), 0);
        if (newTotal !== 24 && meds.length > 0) {
            meds[meds.length - 1].recommendedHours += (24 - newTotal);
        }
    }

    // Distribute water
    let remainingWater = dailyWaterTotalLiters;
    const processedMeds = [];
    for (let i = 0; i < meds.length; i++) {
       const m = meds[i];
       let medWater = 0;
       const hours = m.recommendedHours || 0;

       if (hours >= 24) medWater = dailyWaterTotalLiters;
       else if (hours >= 12) medWater = Math.round(dailyWaterTotalLiters * 0.65);
       else if (hours >= 8) medWater = Math.round(dailyWaterTotalLiters * 0.45);
       else if (hours <= 2) medWater = Math.round(dailyWaterTotalLiters * 0.20);
       else medWater = Math.round(dailyWaterTotalLiters * (hours / 24));

       medWater = Math.min(medWater, remainingWater);
       remainingWater -= medWater;
       processedMeds.push({ ...m, calculatedWater: medWater });
    }

    if (remainingWater > 0 && processedMeds.length > 0) {
        processedMeds[processedMeds.length - 1].calculatedWater += remainingWater;
    }

    return processedMeds;
  }, [state.age, state.climate, dailyWaterTotalLiters, state.medDataOverrides]);

  const nextDayFirstMed = useMemo(() => {
    const meds = MEDICATIONS.filter((m: any) => m.targetDays.includes(toNum(state.age) + 1) && m.climates.includes(state.climate));
    return meds.length > 0 ? meds[0] : null;
  }, [state.age, state.climate]);

  const addEmergencyMed = (startTime?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const waterId = Math.random().toString(36).substr(2, 9);
    
    const defaultStartTime = startTime || '';
    let waterStartTime = '';

    if (defaultStartTime && defaultStartTime.includes(':')) {
      const [h, m] = defaultStartTime.split(':').map(Number);
      let newH = (h + 8) % 24;
      waterStartTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    setState(prev => ({
      ...prev,
      emergencyMeds: [
        ...prev.emergencyMeds,
        {
          id,
          name: 'مضاد حيوي / فيتامينات', 
          startTime: defaultStartTime,
          duration: 8,
          endTime: '',
          age: prev.age,
          doseValue: 1,
          unit: 'سم³/لتر'
        }
      ]
    }));
  };

  const updateEmergencyMed = (id: string, updates: any) => {
    setState(prev => ({
      ...prev,
      emergencyMeds: prev.emergencyMeds.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const updateMedOverride = (logKey: string, updates: any) => {
    setState(prev => ({
      ...prev,
      medDataOverrides: {
        ...(prev.medDataOverrides || {}),
        [logKey]: {
          ...(prev.medDataOverrides?.[logKey] || {}),
          ...updates
        }
      }
    }));
  };

  const removeEmergencyMed = (id: string) => {
    setState(prev => ({
      ...prev,
      emergencyMeds: prev.emergencyMeds.filter(m => m.id !== id)
    }));
  };

  const getLightingScheduleForAge = useCallback((age: number) => {
    let baseHours = 1;
    let ageReason = "ساعة واحدة إظلام.";
    
    if (age >= 1 && age <= 3) {
      baseHours = 0;
      ageReason = "اليوم 1-3: إضاءة 24 ساعة (إظلام 0 ساعة).";
    } else if (age >= 4 && age <= 6) {
      baseHours = 1;
      ageReason = "اليوم 4-6: إضاءة 23 ساعة (إظلام ساعة واحدة).";
    } else if (age >= 7 && age <= 15) {
      baseHours = 4;
      ageReason = "اليوم 7-15: إضاءة 20 ساعة (إظلام 4 ساعات).";
    } else if (age >= 16 && age <= 28) {
      baseHours = 6;
      ageReason = "اليوم 16-28: إضاءة 18 ساعة (إظلام 6 ساعات).";
    } else if (age === 29) {
      baseHours = 4;
      ageReason = "اليوم 29: إضاءة 20 ساعة (إظلام 4 ساعات).";
    } else if (age === 30) {
      baseHours = 3;
      ageReason = "اليوم 30: إضاءة 21 ساعة (إظلام 3 ساعات).";
    } else if (age === 31) {
      baseHours = 2;
      ageReason = "اليوم 31: إضاءة 22 ساعة (إظلام ساعتان).";
    } else if (age >= 32 && age <= 34) {
      baseHours = 1;
      ageReason = "اليوم 32-34: إضاءة 23 ساعة (إظلام ساعة واحدة).";
    } else {
      baseHours = 1;
      ageReason = "اليوم 35 فما فوق: إضاءة 23 ساعة (إظلام ساعة واحدة).";
    }

    const darknessHours = (age === toNum(state.age) && state.isCustomDarkness) ? toNum(state.darknessHours) : baseHours;
    const darknessStart = (age === toNum(state.age)) ? (state.darknessStart || "23:00") : "23:00"; 
    
    const [startH, startM] = darknessStart.split(':').map(Number);
    const totalEndMinutes = (startH * 60 + startM + toNum(darknessHours) * 60) % 1440;
    const endH = Math.floor(totalEndMinutes / 60);
    const endM = Math.round(totalEndMinutes % 60);
    const darknessEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const formatToArabicTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const p = h < 12 ? 'ص' : 'م';
      const displayH = h % 12 || 12;
      return `${displayH}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''} ${p}`;
    };

    const timeRange = `${formatToArabicTime(darknessStart)} - ${formatToArabicTime(darknessEnd)}`;
    const fullAgeReason = `(${timeRange}) : ${ageReason}`;

    let recommendedHours = darknessHours;
    let tempReason = "";
    let medReason = "";
    const triggers = [
      { type: 'age', label: 'العمر', icon: Calendar, color: 'text-blue-400' }
    ];

    if (age === toNum(state.age) && state.isDarknessLinkedToTemp) {
      const tempDelta = toNum(state.internalTemp) - targetTemp;
      if (tempDelta > 3) {
        recommendedHours = Math.min(8, recommendedHours + 1);
        tempReason = "حرارة مرتفعة: زيادة ساعة إظلام لتقليل التمثيل الغذائي.";
        triggers.push({ type: 'temp', label: 'الحرارة', icon: Thermometer, color: 'text-red-400' });
      } else if (tempDelta < -3 && recommendedHours > 1) {
        recommendedHours = Math.max(1, recommendedHours - 1);
        tempReason = "حرارة منخفضة: تقليل ساعة إظلام لتشجيع الحركة واستهلاك العلف.";
        triggers.push({ type: 'temp', label: 'الحرارة', icon: Thermometer, color: 'text-red-400' });
      }
    }

    if (age === toNum(state.age) && state.isDarknessLinkedToMed) {
      const dailyMeds = MEDICATIONS.filter(m => m.targetDays.includes(age) && m.climates.includes(state.climate));
      const hasStressfulMed = dailyMeds.some(m => m.category === 'تحصين' || m.usageType === 'ضروري');
      if (hasStressfulMed && recommendedHours > 1) {
        // Reduced darkness slightly sometimes requested for observation but often just need consistency
        // medReason = "علاج نشط: مراقبة مستمرة مع إضاءة.";
      }
    }

    return {
      darknessHours: recommendedHours,
      recommendedHours,
      totalLight: 24 - toNum(recommendedHours),
      darknessStart,
      darknessEnd,
      ageReason: fullAgeReason,
      tempReason,
      medReason,
      triggers
    };
  }, [state.age, state.isCustomDarkness, state.darknessHours, state.darknessStart, state.isDarknessLinkedToTemp, state.internalTemp, targetTemp]);

  const getUnifiedTimelineForAge = useCallback((age: number) => {
    const isOverlappingDarkness = (startStr: string | null | undefined, duration: number, darkStart: string, darkHours: number) => {
      if (!startStr) return false;
      const [h, m] = startStr.split(':').map(Number);
      const startMins = h * 60 + m;
      const [darkH, darkM] = darkStart.split(':').map(Number);
      const darkStartMins = darkH * 60 + darkM;
      const darkEndMins = (darkStartMins + darkHours * 60) % 1440;

      for (let i = 0; i < duration * 60; i++) {
        const currentMin = (startMins + i) % 1440;
        if (darkEndMins < darkStartMins) {
          if (currentMin >= darkStartMins || currentMin < darkEndMins) return true;
        } else {
          if (currentMin >= darkStartMins && currentMin < darkEndMins) return true;
        }
      }
      return false;
    };

    let ageMeds = MEDICATIONS.filter(med => med.targetDays.includes(age) && med.climates.includes(state.climate));
    const ageEmergencyMeds = state.emergencyMeds.filter(m => toNum(m.age) === age);
    const schedule = getLightingScheduleForAge(age);

    const scheduledData = ageMeds.map((m, i) => {
        const logKey = `${age}-${m.id || m.name}`;
        const override = state.medDataOverrides?.[logKey];
        const currentDuration = override?.duration !== undefined ? toNum(override.duration) : m.recommendedHours;
        const currentDoseValue = override?.doseValue !== undefined ? toNum(override.doseValue) : m.doseValue;
        const currentUnit = override?.unit !== undefined ? override.unit : m.unit;
        const currentName = override?.name || m.name;
        const water = Math.round((dailyWaterTotalLiters / 24) * currentDuration);
        const startTime = state.medicationLogs[logKey];
        
        return {
          ...m,
          name: currentName,
          duration: currentDuration,
          recommendedHours: currentDuration,
          doseValue: currentDoseValue,
          unit: currentUnit,
          type: 'scheduled' as const,
          originalIndex: i, 
          calculatedWater: water,
          isRest: (currentName || '').includes('ماء') || (currentName || '').includes('مياه') || (currentName || '').includes('راحة'),
          startTime,
          logKey,
          originalAge: age,
          resolvedStartTime: startTime || null,
          isSuggestedStartTime: false,
          overlapsDarkness: startTime ? isOverlappingDarkness(startTime, currentDuration, schedule.darknessStart, schedule.darknessHours) : false
        };
    });

    const emergencyData = ageEmergencyMeds.map((m, i) => {
      const logKey = `${age}-${m.id || m.name}`;
      const override = state.medDataOverrides?.[logKey];
      const currentDuration = override?.duration !== undefined ? toNum(override.duration) : (toNum(m.duration) || 0);
      const water = Math.round((dailyWaterTotalLiters / 24) * currentDuration);
      
      return {
        ...m,
        type: 'emergency' as const,
        recommendedHours: currentDuration,
        originalIndex: 100 + i, 
        calculatedWater: water,
        doseValue: toNum(m.doseValue),
        isRest: (m.name || '').includes('ماء') || (m.name || '').includes('مياه') || (m.name || '').includes('راحة'),
        startTime: m.startTime,
        logKey,
        originalAge: age,
        resolvedStartTime: m.startTime || null,
        isSuggestedStartTime: false,
        overlapsDarkness: m.startTime ? isOverlappingDarkness(m.startTime, currentDuration, schedule.darknessStart, schedule.darknessHours) : false
      };
    });

    const darknessKey = `${age}-darkness`;
    const durationOverride = state.medDataOverrides?.[darknessKey]?.duration;
    
    const darknessEntry = {
      id: 'darkness',
      name: 'فترة الإظلام (ختام اليوم)',
      startTime: state.medicationLogs[darknessKey] || null, 
      duration: durationOverride !== undefined ? toNum(durationOverride) : schedule.darknessHours,
      recommendedHours: durationOverride !== undefined ? toNum(durationOverride) : schedule.darknessHours,
      type: 'darkness' as const,
      originalIndex: 9999, 
      isRest: true,
      category: 'إضاءة',
      logKey: darknessKey,
      originalAge: age,
      resolvedStartTime: state.medicationLogs[darknessKey] || null,
      isSuggestedStartTime: false,
      overlapsDarkness: false
    };

    const finalTimeline = [...scheduledData, ...emergencyData, darknessEntry];

    // Determine Anchor Minutes exactly
    let anchorMinutes = 0;
    if (age === 1) {
      const orsTime = state.medicationLogs['1-d1-ors'];
      if (orsTime) {
        const [h, m] = orsTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          anchorMinutes = h * 60 + m;
        }
      } else {
        anchorMinutes = 8 * 60; // 8:00 AM default fallback
      }
    } else {
      const loggedItems = finalTimeline.filter(m => m.startTime);
      if (loggedItems.length > 0) {
        const sorted = [...loggedItems].sort((a, b) => {
          const [ah, am] = (a.startTime as string).split(':').map(Number);
          const [bh, bm] = (b.startTime as string).split(':').map(Number);
          return (ah * 60 + am) - (bh * 60 + bm);
        });
        const [h, m] = (sorted[0].startTime as string).split(':').map(Number);
        anchorMinutes = h * 60 + m;
      } else {
        anchorMinutes = 8 * 60; // fallback to 8:00 AM
      }
    }

    const getLinearMinutes = (timeStr: string | undefined | null) => {
      if (!timeStr) return 99999;
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return 99999;
      let total = h * 60 + m;
      if (anchorMinutes > 0 && total < anchorMinutes) total += 1440;
      return total;
    };

    return finalTimeline.sort((a, b) => {
      const timeA = getLinearMinutes(a.startTime);
      const timeB = getLinearMinutes(b.startTime);
      if (timeA !== timeB) return timeA - timeB;
      return a.originalIndex - b.originalIndex;
    });
  }, [state.medDataOverrides, state.medicationLogs, state.emergencyMeds, state.climate, getLightingScheduleForAge, dailyWaterTotalLiters]);

  const unifiedTimeline = useMemo(() => {
    return getUnifiedTimelineForAge(toNum(state.age));
  }, [getUnifiedTimelineForAge, state.age]);

  const formatTime12 = (timeStr: string) => {
    if (!timeStr) return '';
    const cleanTime = timeStr.replace(/[^\d:]/g, '');
    const [h, m] = cleanTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'م' : 'ص';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const getDayTransitionInfo = () => {
    const age = toNum(state.age);
    if (age <= 1) return null;
    const yesterday = getUnifiedTimelineForAge(age - 1);
    
    // Helper within scope
    const getFinishMinutes = (item: any) => {
      if (!item || !(item.startTime || item.resolvedStartTime)) return 0;
      const [h, m] = (item.startTime || item.resolvedStartTime).split(':').map(Number);
      const duration = item.recommendedHours || 0;
      return h * 60 + m + duration * 60;
    };

    const lastPrev = [...yesterday]
      .filter(i => (i.startTime || i.resolvedStartTime))
      .sort((a, b) => getFinishMinutes(b) - getFinishMinutes(a))[0];
    
    if (!lastPrev || !(lastPrev.startTime || lastPrev.resolvedStartTime)) return null;

    const firstNext = unifiedTimeline[0];
    const totalMinutes = getFinishMinutes(lastPrev);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = Math.round(totalMinutes % 60);
    const rawEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const rawNextStartTime = rawEndTime;

    const endTimeStr = formatTime12(rawEndTime);
    const nextStartTimeStr = formatTime12(rawNextStartTime);

    const isDarkness = lastPrev.type === 'darkness';
    const label = isDarkness ? 'آخر نشاط أمس' : 'آخر جرعة أمس';
    const medName = isDarkness ? (lastPrev.name.includes('ختام اليوم') ? lastPrev.name : `${lastPrev.name} (ختام اليوم)`) : lastPrev.name;
    const nextMedName = firstNext?.name || 'ماء نقي';

    return {
      label,
      medName,
      endTimeStr,
      nextStartTimeStr,
      nextMedName,
      rawEndTime,
      rawNextStartTime
    };
  };

  const getSuggestedStartTime = (med: any, prevItem?: any) => {
    if (toNum(state.age) === 1 && med && med.id !== 'd1-ors') {
      const orsTime = state.medicationLogs['1-d1-ors'];
      if (!orsTime) return null;
    }

    let endTimeStr: string | null = null;
    let duration = 0;

    const prevStart = prevItem ? (prevItem.startTime || prevItem.resolvedStartTime) : null;
    if (prevItem && prevStart) {
      endTimeStr = prevStart;
      duration = prevItem.recommendedHours || toNum(prevItem.duration) || 0;
    } else {
      const info = getDayTransitionInfo();
      if (info) return info.rawNextStartTime;
      
      const last = unifiedTimeline.filter(i => (i.startTime || i.resolvedStartTime)).reverse()[0];
      if (last) {
        endTimeStr = last.startTime || last.resolvedStartTime;
        duration = last.recommendedHours || 0;
      }
    }

    if (!endTimeStr) return null;

    const cleanEndTime = endTimeStr.replace(/[^\d:]/g, '');
    const parts = cleanEndTime.split(':');
    if (parts.length < 2) return null;
    const [h, m] = parts.map(Number);
    if (isNaN(h) || isNaN(m)) return null;

    const totalMinutes = h * 60 + m + duration * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = Math.round(totalMinutes % 60);
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const getLatestActivityEndTime = () => {
    const last = unifiedTimeline.filter(i => i.startTime).reverse()[0];
    if (!last || !last.startTime) return { latestEndTime: null, latestMed: null };
    const [h, m] = last.startTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h + (last.recommendedHours || 0), m, 0, 0);
    return { latestEndTime: d, latestMed: last };
  };


  const lightingSchedule = useMemo(() => {
    return getLightingScheduleForAge(toNum(state.age));
  }, [state.age, getLightingScheduleForAge]);

  // New Ventilation Logic (Spec v2)
  // Min: 1 m3/hr per kg
  // Max: 7 m3/hr per kg
  const minVentilation = Math.round(herdBiomass * 1);
  const maxVentilation = Math.round(herdBiomass * 7);

  const totalActiveCapacity = (state.fans || []).reduce((acc, f) => f.isActive ? acc + (toNum(f.capacity) * toNum(f.count)) : acc, 0) || toNum(state.fanCapacity);
  const totalCoolingPadArea = (state.coolingPads || []).reduce((acc, cp) => acc + toNum(cp.area), 0);

  const minFans = minVentilation / totalActiveCapacity;
  const maxFans = maxVentilation / totalActiveCapacity;

  // Diagnostic Calculations
  const effectiveTemp = state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp;
  const effectiveRH = state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity;

  const targetHumidity = getTargetHumidity(toNum(state.age));
  const tempDelta = toNum(effectiveTemp) - targetTemp;
  
  // Wind Chill (Simple model: more ventilation capacity used = more cooling)
  // At min ventilation, we assume a basic airflow cooling effect
  const coolingFactor = Math.min(5, (minVentilation / totalActiveCapacity) * 4);
  const realFeelTemp = Math.round((toNum(effectiveTemp) - coolingFactor) * 10) / 10;
  
  const thi = Math.round((toNum(effectiveTemp) - (0.31 - 0.31 * (toNum(effectiveRH) / 100)) * (toNum(effectiveTemp) - 14.4)) * 10) / 10;
  // Comfort THI based on target temperature and 50% relative humidity
  const targetThi = Math.round((targetTemp - (0.31 - 0.31 * 0.5) * (targetTemp - 14.4)) * 10) / 10;
  
  const padsCount = state.coolingPadsCount || 4;
  
  // Cold Stress Logic (Wind Chill Factor)
  const coldStress = targetTemp - realFeelTemp;
  const isColdAlert = coldStress > 1.5;
  const isColdDanger = coldStress > 3.5;

  // --- Mobile & Browser Notifications Logic ---
  useEffect(() => {
    const requestNotifPermissions = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const check = await LocalNotifications.checkPermissions();
          if (check.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } else if ('Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        }
      } catch (err) {
        console.warn("Could not request notification permissions:", err);
      }
    };
    requestNotifPermissions();
  }, []);

  useEffect(() => {
    let active = true;
    const runSync = async () => {
      if (!active) return;
      
      const currentAgeStr = String(state.age);
      const currentTemp = toNum(effectiveTemp);
      const diff = currentTemp - targetTemp;
      const currentHum = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);

      // 1. Generate In-App active notifications to show in dashboard
      const dynamicAlerts: any[] = [];

      // Temperature alerts
      if (diff > 2 && notificationSettings.tempAlerts) {
        dynamicAlerts.push({
          id: 'temp-alert-high',
          title: "🚨 ارتفاع حرارة العنبر!",
          body: `درجة الحرارة الحالية ${currentTemp}°م وهي أعلى من المستهدفة (${targetTemp}°م) بفارق +${diff.toFixed(1)}°م! يرجى فحص المراوح والتهوئة فوراً.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'temp'
        });
      } else if (diff < -1.5 && notificationSettings.tempAlerts) {
        dynamicAlerts.push({
          id: 'temp-alert-low',
          title: "❄️ انخفاض حرارة العنبر وبرودة!",
          body: `درجة الحرارة الحالية ${currentTemp}°م وهي أقل من المستهدفة (${targetTemp}°م) بفارق ${diff.toFixed(1)}°م! يرجى تشغيل الدفايات وقفل أي فتحات مسربة.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'temp'
        });
      }

      // THI alert
      if (thi > targetThi + 3 && notificationSettings.tempAlerts) {
        dynamicAlerts.push({
          id: 'thi-alert-extreme',
          title: "🥵 إجهاد حراري مرتفع جداً!",
          body: `مؤشر الإجهاد الفعلي اليوم هو ${thi.toFixed(1)} ويتجاوز حد الراحة (${targetThi.toFixed(1)}). يرجى تقديم مياه باردة وتشغيل خلايا التبريد والمراوح.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'temp'
        });
      }

      // Humidity alert
      if (currentHum > 75 && notificationSettings.humidityAlerts) {
        dynamicAlerts.push({
          id: 'humidity-alert-high',
          title: "💧 رطوبة مرتفعة جداً بالعنبر!",
          body: `نسبة الرطوبة الحالية ${currentHum}% مرتفعة جداً وتسبب رطوبة بالفرشة. شغل شفاطات التهوئة لتبديل وتجفيف الهواء وتجنب الكوكسيديا والسموم.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'humidity'
        });
      } else if (currentHum < 40 && notificationSettings.humidityAlerts) {
        dynamicAlerts.push({
          id: 'humidity-alert-low',
          title: "🍂 رطوبة منخفضة وجفاف زائد!",
          body: `نسبة الرطوبة الحالية ${currentHum}% منخفضة جداً وتسبب أتربة بالجو قد تؤذي جهاز طائرك التنفسي. رطب الجو قليلاً.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'humidity'
        });
      }

      // Feed & Water calculations (smart check)
      if (notificationSettings.feedWaterAlerts) {
        const stdFeedKg = (getDailyStats(state.strain, toNum(state.age)).dailyFeed * toNum(state.totalChicks)) / 1000;
        const stdWaterLiters = (getDailyStats(state.strain, toNum(state.age)).dailyWater * toNum(state.totalChicks)) / 1000;
        dynamicAlerts.push({
          id: 'feed-water-guide',
          title: "🌾 إرشاد التغذية ومياه الشرب لليوم",
          body: `اليوم (${state.age}) يحتاج القطيع (${state.totalChicks} طائر) إلى حوالي ${stdFeedKg.toFixed(1)} كجم علف جاهز و ${stdWaterLiters.toFixed(1)} لتر من مياه الشرب النقية. يرجى متابعة ومطابقة القراءات الفعلية لضمان النمو.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'general'
        });
      }

      // Medication Alerts (30 mins warning, completions, & next schedules)
      if (notificationSettings.medicationAlerts) {
        unifiedTimeline.forEach((med: any, idx: number) => {
          const logKey = `${state.age}-${med.id || med.name}`;
          const startTimeStr = state.medicationLogs[logKey];
          if (startTimeStr && typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
            const [h, m] = startTimeStr.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(h, m, 0, 0);

            const duration = toNum(med.recommendedHours || med.duration || 8);
            const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
            const remTime = endDate.getTime() - Date.now();

            // 30 min before end alert
            if (remTime > 0 && remTime <= 30 * 60 * 1000) {
              dynamicAlerts.push({
                id: `med-pre-end-${med.name}`,
                title: `⏱️ اقترب انتهاء دواء (${med.name})`,
                body: `متبقي أقل من 30 دقيقة على انتهاء جرعة الدواء "${med.name}". يرجى الاستعداد بتجهيز الخزان للجرعة التالية أو تقديم مياه نقية.`,
                time: new Date(endDate.getTime() - 30 * 60 * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                type: 'medication'
              });
            }

            // General current medication in execution indicator
            if (remTime > 0) {
              const remHours = Math.floor(remTime / (60 * 60 * 1000));
              const remMins = Math.floor((remTime % (60 * 60 * 1000)) / (60 * 1000));
              dynamicAlerts.push({
                id: `med-running-${med.name}`,
                title: `💊 جرعة جارية الآن: ${med.name}`,
                body: `جرعة مفعول "${med.name}" نشطة حالياً بالعنبر. المتبقي لانتهاء مفعول الجرعة بالكامل وبدء غسيل الخطوط: ${remHours} ساعة و ${remMins} دقيقة.`,
                time: startTimeStr,
                type: 'medication'
              });
            }
          }
        });
      }

      // System changes check (System metadata)
      if (notificationSettings.systemChanges) {
        dynamicAlerts.push({
          id: 'system-change-status',
          title: "⚙️ تتبع ومراقبة المناخ قيد التشغيل",
          body: `يتم تأمين العنبر وتتبع الحرارة ومستويات الرطوبة بنجاح في عمر ${state.age} يوم للقطيع. أي طوارئ في نظام التربية والتهوية سيتم إعلامك بها فوراً.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          type: 'change'
        });
      }

      if (active) {
        setInAppNotifications(dynamicAlerts);
      }

      // 2. Schedule Native Mobile / Browser Background Notifications
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') return;

          // Request cancellation of previous schedules to avoid clutter
          const pending = await LocalNotifications.getPending();
          if (pending && pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
          }

          const notificationsToSchedule: any[] = [];

          // Temperature Alert (High/Low)
          if (Math.abs(diff) > 2 && notificationSettings.tempAlerts) {
            notificationsToSchedule.push({
              title: diff > 0 ? "⚠️ ارتفاع حرارة المزرعة!" : "⚠️ انخفاض حرارة المزرعة!",
              body: `درجة الحرارة الحالية ${currentTemp}°م (المستهدفة ${targetTemp}°م). الفارق ${diff > 0 ? '+' : ''}${diff.toFixed(1)}°م! يرجى فحص التهوية والتبريد فوراً.`,
              id: 9991201,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav'
            });
          }

          // High Heat Stress (THI)
          if (thi > targetThi + 3 && notificationSettings.tempAlerts) {
            notificationsToSchedule.push({
              title: "🚨 إجهاد حراري مرتفع جداً!",
              body: `درجة الإجهاد الفعلي هي ${thi.toFixed(1)} تفوق الحد المريح (${targetThi.toFixed(1)}). شغل خلايا التبريد والشفاطات الآن!`,
              id: 9991202,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav'
            });
          }

          // Humidity Alarm
          if ((currentHum > 75 || currentHum < 40) && notificationSettings.humidityAlerts) {
            notificationsToSchedule.push({
              title: currentHum > 75 ? "💧 رطوبة مرتفعة بالعنبر!" : "🍂 جفاف وانخفاض الرطوبة!",
              body: `نسبة الرطوبة الحالية ${currentHum}% (المستهدفة مريحة). تحقق من التهوئة والرشاشات فوراً.`,
              id: 9991203,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav'
            });
          }

          // Medication Timings
          if (notificationSettings.medicationAlerts) {
            unifiedTimeline.forEach((med: any, idx: number) => {
              const logKey = `${state.age}-${med.id || med.name}`;
              const startTimeStr = state.medicationLogs[logKey];
              if (startTimeStr && typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
                const [h, m] = startTimeStr.split(':').map(Number);
                const startDate = new Date();
                startDate.setHours(h, m, 0, 0);

                const duration = toNum(med.recommendedHours || med.duration || 8);
                const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

                // Warning exactly 30 minutes before end
                const preEndDate = new Date(endDate.getTime() - 30 * 60 * 1000);
                if (preEndDate.getTime() > Date.now()) {
                  notificationsToSchedule.push({
                    title: `⏱️ اقترب انتهاء دواء (${med.name})`,
                    body: `متبقي نصف ساعة على نهاية تأثير جرعة "${med.name}". استعد لتحضير الجرعة التالية لضمان سلامة القطيع.`,
                    id: 30000 + idx * 3,
                    schedule: { at: preEndDate },
                    sound: 'beep.wav'
                  });
                }

                // Dose End Alert
                if (endDate.getTime() > Date.now()) {
                  notificationsToSchedule.push({
                    title: `⏰ انتهاء جرعة الدواء (${med.name})`,
                    body: `انتهت الآن فترة جرعة الدواء "${med.name}". يرجى تفريغ خطوط المياه وتقديم مياه نقية أو جرعة جديدة.`,
                    id: 30000 + idx * 3 + 1,
                    schedule: { at: endDate },
                    sound: 'beep.wav'
                  });
                }

                // Next Dose alert
                const nextAct = unifiedTimeline[idx + 1];
                if (nextAct) {
                  const gapHours = ((med as any).category === 'راحة' || (nextAct as any).category === 'راحة' || (med as any).isAntibiotic) ? 0 : 1;
                  const nextStartDate = new Date(endDate.getTime() + gapHours * 60 * 60 * 1000);

                  if (nextStartDate.getTime() > Date.now()) {
                    notificationsToSchedule.push({
                      title: `💊 موعد الجرعة التالية (${nextAct.name})`,
                      body: `حان الآن موعد تقديم جرعة الدواء التالية للقطيع: "${nextAct.name}". يرجى تجهيز الخزان وإضافته.`,
                      id: 30000 + idx * 3 + 2,
                      schedule: { at: nextStartDate },
                      sound: 'beep.wav'
                    });
                  }
                }
              }
            });
          }

          if (notificationsToSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: notificationsToSchedule });
          }
        } catch (err) {
          console.warn("Capacitor local notifications update issue:", err);
        }
      } else if ('Notification' in window) {
        // Web PWA fallback notifications
        try {
          if (Notification.permission === 'granted') {
            const now = Date.now();
            const w = window as any;

            // Debounced Temperature Alert
            if (Math.abs(diff) > 2 && notificationSettings.tempAlerts) {
              if (!w._lastTempNotifTime || now - w._lastTempNotifTime > 60000) {
                new Notification(diff > 0 ? "⚠️ ارتفاع حرارة المزرعة!" : "⚠️ انخفاض في الحرارة!", {
                  body: `الحرارة الحالية: ${currentTemp}°م، المستهدفة: ${targetTemp}°م. الفارق: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}°م!`,
                  icon: '/assets/icon.png'
                });
                w._lastTempNotifTime = now;
              }
            }

            // Debounced THI Alert
            if (thi > targetThi + 3 && notificationSettings.tempAlerts) {
              if (!w._lastThiNotifTime || now - w._lastThiNotifTime > 60000) {
                new Notification("🚨 إجهاد حراري مرتفع جداً!", {
                  body: `مؤشر الإجهاد الحالي ${thi.toFixed(1)} يتجاوز الحد المريح والمستهدف لكتاكيتك (${targetThi.toFixed(1)}).`,
                  icon: '/assets/icon.png'
                });
                w._lastThiNotifTime = now;
              }
            }

            // Debounced Humidity Alert
            if ((currentHum > 75 || currentHum < 40) && notificationSettings.humidityAlerts) {
              if (!w._lastHumNotifTime || now - w._lastHumNotifTime > 60000) {
                new Notification(currentHum > 75 ? "💧 رطوبة مرتفعة جداً!" : "🍂 رطوبة منخفضة وجفاف!", {
                  body: `نسبة الرطوبة الحالية ${currentHum}%، يرجى فحص المراوح والتهوية في المزرعة.`,
                  icon: '/assets/icon.png'
                });
                w._lastHumNotifTime = now;
              }
            }

            // Web Medication timeout triggers
            if (w._medicationTimers) {
              w._medicationTimers.forEach(clearTimeout);
            }
            w._medicationTimers = [];

            if (notificationSettings.medicationAlerts) {
              unifiedTimeline.forEach((med: any, idx: number) => {
                const logKey = `${state.age}-${med.id || med.name}`;
                const startTimeStr = state.medicationLogs[logKey];
                if (startTimeStr && typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
                  const [h, m] = startTimeStr.split(':').map(Number);
                  const startDate = new Date();
                  startDate.setHours(h, m, 0, 0);

                  const duration = toNum(med.recommendedHours || med.duration || 8);
                  const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

                  // A Warning exactly 30 minutes before completion
                  const preEndDate = new Date(endDate.getTime() - 30 * 60 * 1000);
                  const delayPreEnd = preEndDate.getTime() - Date.now();
                  if (delayPreEnd > 0 && delayPreEnd < 86400000) {
                    const tId = setTimeout(() => {
                      new Notification(`⏱️ اقترب انتهاء دواء (${med.name})`, {
                        body: `متبقي نصف ساعة على انتهاء تأثير جرعة "${med.name}". يرجى الاستعداد بتجهيز الجرعة التالية.`,
                        icon: '/assets/icon.png'
                      });
                    }, delayPreEnd);
                    w._medicationTimers.push(tId);
                  }

                  // Dose End alert
                  const delayEnd = endDate.getTime() - Date.now();
                  if (delayEnd > 0 && delayEnd < 86400000) {
                    const tId = setTimeout(() => {
                      new Notification(`⏰ انتهاء جرعة الدواء (${med.name})`, {
                        body: `انتهت فترة جرعة الدواء الحالية "${med.name}". يرجى تفريغ خطوط المياه وتقديم مياه نقية أو جرعة جديدة.`,
                        icon: '/assets/icon.png'
                      });
                    }, delayEnd);
                    w._medicationTimers.push(tId);
                  }

                  // Next scheduled medicine dose start
                  const nextAct = unifiedTimeline[idx + 1];
                  if (nextAct) {
                    const gapHours = ((med as any).category === 'راحة' || (nextAct as any).category === 'راحة' || (med as any).isAntibiotic) ? 0 : 1;
                    const nextStartDate = new Date(endDate.getTime() + gapHours * 60 * 60 * 1000);
                    const delayNext = nextStartDate.getTime() - Date.now();
                    if (delayNext > 0 && delayNext < 86400000) {
                      const tId = setTimeout(() => {
                        new Notification(`💊 موعد الجرعة التالية (${nextAct.name})`, {
                          body: `حان الآن موعد تقديم جرعة الدواء التالية للقطيع: "${nextAct.name}". يرجى تجهيز الخزان وإضافته لعلاج الدواجن.`,
                          icon: '/assets/icon.png'
                        });
                      }, delayNext);
                      w._medicationTimers.push(tId);
                    }
                  }
                }
              });
            }
          }
        } catch (err) {
          console.warn("Web notifications update issue:", err);
        }
      }
    };

    runSync();
    return () => {
      active = false;
    };
  }, [
    state.age,
    state.internalTemp,
    state.currentHumidity,
    state.dailyInternalTemp,
    state.dailyHumidity,
    state.medicationLogs,
    state.startDate,
    targetTemp,
    unifiedTimeline,
    targetThi,
    thi,
    effectiveTemp,
    state.totalChicks,
    state.strain,
    notificationSettings
  ]);

  const chartData = useMemo(() => {
    // Find all days with manual weight entries
    const manualDays = Object.keys(state.weightLogs || {})
      .map(Number)
      .filter(day => day > 0 && toNum(state.weightLogs?.[String(day)]) > 0)
      .sort((a, b) => a - b);

    return Array.from({ length: 45 }, (_, i) => {
      const day = i + 1;
      const stats = getDailyStats(state.strain, day);
      
      let actualWeight = null;
      let projectedWeight = stats.weight;

      // Actual point from manual logs
      if (state.weightLogs?.[String(day)]) {
        actualWeight = toNum(state.weightLogs[String(day)]);
      }

      // Projected Weight based on most recent manual entry
      if (manualDays.length > 0) {
        const lastManualDay = [...manualDays].reverse().find(d => d <= day);
        if (lastManualDay !== undefined) {
          const manualWeight = toNum(state.weightLogs?.[String(lastManualDay)]);
          const standardAtLastManual = getDailyStats(state.strain, lastManualDay).weight;
          const factor = manualWeight / standardAtLastManual;
          projectedWeight = Math.round(stats.weight * factor);
        }
      }

      // Mortality calculation
      const mortalityUpToDay = state.mortalityBills
        .filter(m => toNum(m.ageAtDeath) <= day)
        .reduce((sum, m) => sum + toNum(m.count), 0);

      const survivalRate = state.totalChicks ? ((toNum(state.totalChicks) - mortalityUpToDay) / toNum(state.totalChicks)) * 100 : 0;
      const mortalityRate = 100 - survivalRate;

      // Cumulative feed up to today (projected)
      const cumulativeFeed = Array.from({ length: day }, (_, idx) => getDailyStats(state.strain, idx + 1).dailyFeed).reduce((s, f) => s + f, 0);
      
      // Calculate FCR (Feed Conversion Ratio) - Using Live Weight as denominator per user request
      const liveWeight = projectedWeight;
      const fcr = liveWeight > 0 ? (cumulativeFeed / liveWeight) : 0;
      const standardLiveWeight = stats.weight;
      const standardFcr = standardLiveWeight > 0 ? (stats.cumFeed / standardLiveWeight) : 0;

      // European Production Efficiency Factor (EPEF)
      // EPEF = [(Survival % * Live Weight kg) / (Age days * FCR)] * 100
      const liveWeightKg = projectedWeight / 1000;
      const epef = (day > 0 && fcr > 0) ? ((survivalRate * liveWeightKg) / (day * fcr)) * 100 : 0;

      // Water/Feed Ratio (Ideally between 1.6 and 2.2)
      const wfRatio = stats.dailyFeed > 0 ? stats.dailyWater / stats.dailyFeed : 0;

      return {
        day: day,
        weight: projectedWeight,
        actualWeight: actualWeight, // only exists on days with logs
        standardWeight: stats.weight,
        feed: stats.dailyFeed,
        water: stats.dailyWater,
        mortality: mortalityUpToDay,
        mortalityRate: mortalityRate.toFixed(2),
        fcr: fcr.toFixed(2),
        standardFcr: standardFcr.toFixed(2),
        epef: Math.round(epef),
        wfRatio: wfRatio.toFixed(1),
        cumulativeFeed: cumulativeFeed
      };
    });
  }, [state.strain, state.weightLogs, state.mortalityBills, state.totalChicks]);

  // Medication Doses
  const medDoses = MEDICATIONS.map(med => ({
    ...med,
    totalAmout: Math.round(dailyWaterTotalLiters * 1), // Assuming 1 unit per liter standard for calculation display
  }));

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScreen('dashboard');
  };

  const CycleDeleteModals = () => (
    <AnimatePresence>
      {deleteStep > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-6 text-center"
          >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${deleteStep === 1 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
              <AlertTriangle size={40} className="animate-pulse" />
            </div>

            <div className="space-y-2" dir="rtl">
              <h3 className="text-2xl font-black text-white">
                {deleteStep === 1 ? 'تحذير مسح الدورة' : 'تأكيد الحذف النهائي'}
              </h3>
              <p className="text-slate-400 font-medium">
                {deleteStep === 1 
                  ? 'هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا العمل.' 
                  : 'هذا الإجراء سيمسح جميع بيانات هذه الدورة نهائياً من جزيئات التطبيق. هل أنت متأكد تماماً؟'}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={deleteStep === 1 ? confirmDeleteStep1 : finalDeleteCycle}
                className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg ${deleteStep === 1 ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
              >
                {deleteStep === 1 ? 'نعم، تابع للمرحلة التالية' : 'نعم، احذف نهائياً'}
              </button>
              <button 
                onClick={cancelDelete}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-black transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Show Loading Screen if Auth is still checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-6" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-black tracking-[0.2em] animate-pulse text-center uppercase text-sm">جاري التحميل والتحقق...</p>
        </div>
        
        <div className="w-full max-w-xs space-y-4 pt-8 border-t border-white/5">
          <div className="text-center space-y-1 mb-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">أدوات النسخ الاحتياطي السريع</h4>
            <p className="text-[9px] text-slate-600 font-bold">يمكنك حفظ أو استعادة بياناتك حتى أثناء التحميل</p>
          </div>
          
          <button 
            onClick={exportBackup}
            className="w-full bg-purple-500/10 text-purple-400 border border-purple-500/20 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-purple-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Download size={18} />
            تنزيل ملف النسخة (JSON)
          </button>

          <button 
            onClick={copyBackupCode}
            className="w-full bg-purple-500/5 text-purple-300 border border-purple-500/10 py-3 rounded-2xl font-bold text-[10px] shadow-lg hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Copy size={16} />
            نسخ كود البيانات (نص)
          </button>
          
          <label className="w-full bg-amber-500/10 text-amber-400 border border-amber-500/20 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-amber-500/20 transition-all text-center cursor-pointer flex items-center justify-center gap-3 active:scale-[0.98]">
            <Upload size={18} />
            استرداد نسخة من الموبايل
            <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
        </div>

        <p className="absolute bottom-8 text-[9px] font-black text-slate-700 tracking-[0.3em] uppercase">Poultry Manager Smart System</p>
      </div>
    );
  }

  if (screen === 'gateway') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans antialiased text-right relative overflow-hidden" dir="rtl">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bento-card p-10 border-white/10 relative z-10 backdrop-blur-xl bg-slate-900/80 shadow-2xl"
        >
          <div className="flex flex-col items-center gap-6 mb-12">
            <Logo size={96} iconSize={48} className="rounded-[2.5rem]" />
            <div className="text-center">
              <h1 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">مدير مزارع الدواجن</h1>
              <p className="text-slate-400 font-bold text-sm">برجاء تسجيل الدخول للمتابعة</p>
            </div>
          </div>

          <form onSubmit={handleGatewayLogin} className="space-y-5">
            <div className="space-y-2 text-right">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest me-2">البريد الإلكتروني</label>
              <input 
                type="email"
                value={gatewayEmail}
                onChange={(e) => setGatewayEmail(e.target.value)}
                placeholder="اسم المستخدم"
                required
                autoCapitalize="none"
                className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl px-6 py-5 focus:border-blue-600 focus:outline-none font-bold text-white transition-all placeholder:text-slate-700"
              />
            </div>
            
            <div className="space-y-2 text-right relative">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest me-2">كلمة المرور</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={gatewayPassword}
                  onChange={(e) => setGatewayPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl px-6 py-5 pr-6 pl-14 focus:border-blue-600 focus:outline-none font-bold text-white transition-all placeholder:text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative w-6 h-6 rounded-lg border-2 border-white/10 group-hover:border-blue-500/50 transition-colors flex items-center justify-center overflow-hidden">
                  <input 
                    type="checkbox" 
                    className="peer hidden" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)} 
                  />
                  <div className={cn(
                    "w-full h-full bg-blue-600 flex items-center justify-center transition-all duration-300",
                    rememberMe ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  )}>
                    <Check size={16} className="text-white" strokeWidth={4} />
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-sm select-none">تذكرني</span>
              </label>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-sky-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-3 text-lg mt-8"
            >
              <Zap size={24} fill="currentColor" />
              دخول
            </motion.button>
          </form>

          <p className="text-center text-slate-600 font-bold text-[10px] mt-10 uppercase tracking-[0.2em] select-none">
            POULTRY MANAGER v5.0 • PROTECTED ACCESS
          </p>
        </motion.div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans antialiased text-right relative" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bento-card p-8 border-white/10 relative"
        >
          <div className="flex flex-row items-center justify-start gap-4 mb-10">
            <Logo size={64} iconSize={32} className="rounded-2xl" />
            <div className="flex flex-col items-center select-none min-w-0 flex-1">
              <h1 className="text-[13px] sm:text-[14px] font-black tracking-widest text-[#00b0ff] drop-shadow-[0_2px_8px_rgba(30,176,255,0.15)] leading-none uppercase">
                مدير مزارع
              </h1>
              <h2 className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight leading-tight -mt-0.5 drop-shadow-[0_2px_12px_rgba(255,255,255,0.05)] whitespace-nowrap">
                الدواجن
              </h2>
              <div className="w-full mt-1.5 pb-0.5 border-t border-white/5 pt-1.5 flex justify-center">
                <p className="text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 leading-none whitespace-nowrap">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00dfa2] to-[#04dcd2]">إدارة ذكية</span>
                  <span className="text-white/40 font-bold mx-0.5">..</span>
                  <span className="text-white">إنتاج أفضل</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white text-center mb-8">تسجيل الدخول</h2>
            
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <input 
                name="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                required
                className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-4 py-4 focus:border-blue-600 focus:outline-none font-bold text-white transition-all"
              />
              
              <div className="relative group">
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  required
                  className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-4 py-4 pr-4 pl-12 focus:border-blue-600 focus:outline-none font-bold text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative w-5 h-5 rounded-md border-2 border-white/10 group-hover:border-blue-500/50 transition-colors flex items-center justify-center overflow-hidden">
                    <input 
                      type="checkbox" 
                      className="peer hidden" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    <div className={cn(
                      "w-full h-full bg-blue-600 flex items-center justify-center transition-all duration-300",
                      rememberMe ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    )}>
                      <Check size={14} className="text-white" strokeWidth={4} />
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs select-none">تذكرني</span>
                </label>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoginLoading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
              >
                {isLoginLoading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    دخول آمن
                  </>
                )}
              </motion.button>
            </form>

            <div className="relative flex items-center gap-4 py-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">أو من خلال</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 font-black py-3 rounded-xl hover:bg-slate-100 transition-all shadow-lg"
              >
                Google
              </button>
              <button 
                onClick={handleFacebookLogin}
                className="flex items-center justify-center gap-2 bg-[#1877F2] text-white font-black py-3 rounded-xl hover:bg-[#166fe5] transition-all shadow-lg shadow-blue-600/20"
              >
                Facebook
              </button>
            </div>

            <button 
              onClick={() => setScreen('landing')}
              className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors"
            >
              العودة للرئيسية
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans antialiased text-right overflow-x-hidden relative" dir="rtl">
        <AnimatePresence>
          {deleteStep > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-6 text-center"
              >
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${deleteStep === 1 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                  <AlertTriangle size={40} className="animate-pulse" />
                </div>

                <div className="space-y-2" dir="rtl">
                  <h3 className="text-2xl font-black text-white">
                    {deleteStep === 1 ? 'تحذير مسح الدورة' : 'تأكيد الحذف النهائي'}
                  </h3>
                  <p className="text-slate-400 font-medium">
                    {deleteStep === 1 
                      ? 'هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا العمل.' 
                      : 'هذا الإجراء سيمسح جميع بيانات هذه الدورة نهائياً من جزيئات التطبيق. هل أنت متأكد تماماً؟'}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={deleteStep === 1 ? confirmDeleteStep1 : finalDeleteCycle}
                    className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg ${deleteStep === 1 ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                  >
                    {deleteStep === 1 ? 'نعم، تابع للمرحلة التالية' : 'نعم، احذف نهائياً'}
                  </button>
                  <button 
                    onClick={cancelDelete}
                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-black transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4 mb-16">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2 
              }}
              className="w-32 h-32 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-[2.5rem] mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 relative group"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all opacity-50" />
              <Bird size={64} className="text-white relative z-10 drop-shadow-lg" />
            </motion.div>
            <div className="flex flex-col items-center justify-center space-y-2 md:space-y-4 py-12 relative">
              {/* Cinematic Glow Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-4xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-sky-300 via-sky-400 to-blue-600 drop-shadow-[0_0_15px_rgba(56,189,248,0.3)] filter contrast-125"
              >
                مدير مزارع
              </motion.h1>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="text-6xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-emerald-300 via-teal-400 to-cyan-600 drop-shadow-[0_10px_30px_rgba(20,184,166,0.4)] px-4 leading-none"
                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)' }}
              >
                الدواجن
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs md:text-sm font-black mt-2 text-center flex items-center justify-center gap-1.5"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">إدارة ذكية</span>
                <span className="text-slate-400">..</span>
                <span className="text-white">إنتاج أفضل</span>
              </motion.p>

              {/* Decorative Accent Line */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "60%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4"
              />
            </div>
            <p className="text-slate-400 text-xl font-medium max-w-lg mx-auto leading-relaxed">مرحباً بك، اختر دورة قائمة أو ابدأ دورة جديدة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Cycle Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startNewCycle}
              className="group relative overflow-hidden bg-emerald-600/10 border-2 border-emerald-500/20 p-8 rounded-[2rem] text-right transition-all hover:border-emerald-500/40"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Plus size={80} className="text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/40">
                  <Plus size={32} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">دورة جديدة</h3>
                <p className="text-emerald-500/70 font-bold text-sm">ابدأ بتسجيل بيانات دورة إنتاجية جديدة الآن</p>
              </div>
            </motion.button>

            {/* Resume Last Cycle (if exists) */}
            {state.id && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="group relative overflow-hidden bg-blue-600/10 border-2 border-blue-500/20 p-8 rounded-[2rem] text-right transition-all hover:border-blue-500/40"
              >
                <div className="absolute top-0 left-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock size={80} className="text-blue-500" />
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    initiateDeleteCycle(e, state.id);
                  }}
                  className="absolute top-6 left-6 z-20 w-12 h-12 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-rose-500/10 border border-rose-500/30"
                  title="حذف الدورة"
                >
                  <Trash2 size={24} />
                </button>

                <div 
                  onClick={() => setScreen('dashboard')}
                  className="relative z-10 cursor-pointer"
                >
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/40">
                    <History size={32} strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">استكمال الدورة الحالية</h3>
                  <p className="text-blue-500/70 font-bold text-sm">{state.name || 'بدون اسم'}</p>
                </div>
              </motion.div>
            )}

            {/* Backup & Restore Option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setScreen('management')}
              className="group relative overflow-hidden bg-purple-600/10 border-2 border-purple-500/20 p-8 rounded-[2rem] text-right transition-all hover:border-purple-500/40 md:col-span-2"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <HardDrive size={80} className="text-purple-500" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">النسخ الاحتياطي</h3>
                  <p className="text-purple-500/70 font-bold text-sm">حفظ واستعادة بيانات البرنامج بالكامل وتصدير التقارير</p>
                </div>
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/40">
                  <Cloud size={32} strokeWidth={3} />
                </div>
              </div>
            </motion.button>
          </div>

          {/* Logout Action */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAppLogout}
            className="w-full flex items-center justify-center gap-4 bg-rose-600/10 border-2 border-rose-500/20 p-6 rounded-[2rem] text-rose-500 transition-all hover:bg-rose-600/20 hover:border-rose-500/40 shadow-xl shadow-rose-600/5 group mb-8"
          >
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
              <LogOut size={24} className="rotate-180" />
            </div>
            <div className="text-right">
              <h3 className="text-xl font-black">تسجيل الخروج</h3>
              <p className="text-[10px] text-rose-500/70 font-bold">إنهاء الجلسة والعودة لشاشة الدخول</p>
            </div>
          </motion.button>

          {/* Logout Confirmation Modal */}
          <AnimatePresence>
            {isLogoutConfirming && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl flex flex-col items-center text-center gap-6"
                >
                  <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-2">
                    <LogOut size={40} className="rotate-180" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">تسجيل الخروج</h3>
                    <p className="text-slate-400 font-medium">هل أنت متأكد من رغبتك في تسجيل الخروج من البرنامج؟</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button 
                      onClick={() => setIsLogoutConfirming(false)}
                      className="bg-slate-800 text-white py-4 rounded-2xl font-black transition-all active:scale-95 border border-white/5"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={confirmLogout}
                      className="bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <LogOut size={20} className="rotate-180" />
                      خروج
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Naming Modal Overlay */}
          <AnimatePresence>
            {isNamingNewCycle && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Edit3 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white">تسمية الدورة</h3>
                    <p className="text-slate-400 text-sm font-bold">أدخل اسماً يميز هذه الدورة في السجل</p>
                  </div>

                  <input 
                    autoFocus
                    type="text"
                    value={newCycleNameInput}
                    onChange={(e) => setNewCycleNameInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="مثلاً: دورة شتاء 2024"
                  />

                  <div className="flex gap-4">
                    <button 
                      onClick={() => confirmNewCycle(newCycleNameInput)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      حفظ والبدء
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => setIsNamingNewCycle(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-black py-4 rounded-2xl transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* All Cycles Archive */}
          {allCycles.length > 0 && (
            <div className="space-y-4 pt-12">
              <div className="flex items-center justify-between px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-800" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 italic">سجل الدورات التاريخي</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-800" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCycles.map(cycle => (
                  <div key={cycle.id} className="relative group/card overflow-hidden">
                    <button
                      onClick={() => switchCycle(cycle.id)}
                      className="w-full flex items-center justify-between gap-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 p-4 rounded-2xl transition-all group pl-12"
                    >
                      <div className="flex items-center gap-4 text-right">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-400 shrink-0">
                          <Layers size={20} />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-black text-white line-clamp-1">{cycle.name || 'دورة غير مسمى'}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            <span>عمر {cycle.age} يوم</span>
                            <span className="opacity-30">•</span>
                            <span>{cycle.strain}</span>
                            <span className="opacity-30">•</span>
                            <span>{cycle.totalChicks} طائر</span>
                            {cycle.createdAt && (
                              <>
                                <span className="opacity-30">•</span>
                                <span>{cycle.createdAt}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    <button 
                      onClick={(e) => initiateDeleteCycle(e, cycle.id)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all z-20"
                      title="مسح الدورة"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </div>
    );
  }

  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans antialiased text-right relative" dir="rtl">
        <AnimatePresence>
          {deleteStep > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-6 text-center"
              >
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${deleteStep === 1 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                  <AlertTriangle size={40} className="animate-pulse" />
                </div>

                <div className="space-y-2" dir="rtl">
                  <h3 className="text-2xl font-black text-white">
                    {deleteStep === 1 ? 'تحذير مسح الدورة' : 'تأكيد الحذف النهائي'}
                  </h3>
                  <p className="text-slate-400 font-medium">
                    {deleteStep === 1 
                      ? 'هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا العمل.' 
                      : 'هذا الإجراء سيمسح جميع بيانات هذه الدورة نهائياً من جزيئات التطبيق. هل أنت متأكد تماماً؟'}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={deleteStep === 1 ? confirmDeleteStep1 : finalDeleteCycle}
                    className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg ${deleteStep === 1 ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                  >
                    {deleteStep === 1 ? 'نعم، تابع للمرحلة التالية' : 'نعم، احذف نهائياً'}
                  </button>
                  <button 
                    onClick={cancelDelete}
                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-black transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bento-card p-8 border-white/10 relative"
        >
          <div className="flex flex-row items-center justify-start gap-4 mb-10">
            <Logo size={64} iconSize={32} className="rounded-2xl" />
            <div className="flex flex-col items-center select-none min-w-0 flex-1">
              <h1 className="text-[13px] sm:text-[14px] font-black tracking-widest text-[#00b0ff] drop-shadow-[0_2px_8px_rgba(30,176,255,0.15)] leading-none uppercase">
                مدير مزارع
              </h1>
              <h2 className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight leading-tight -mt-0.5 drop-shadow-[0_2px_12px_rgba(255,255,255,0.05)] whitespace-nowrap">
                الدواجن
              </h2>
              <div className="w-full mt-1.5 pb-0.5 border-t border-white/5 pt-1.5 flex justify-center">
                <p className="text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 leading-none whitespace-nowrap">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00dfa2] to-[#04dcd2]">إدارة ذكية</span>
                  <span className="text-white/40 font-bold mx-0.5">..</span>
                  <span className="text-white">إنتاج أفضل</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSetupSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">نوع السلالة</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cobb', 'Ross', 'Avian', 'Arbo', 'IR', 'Hubbard'] as Strain[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, strain: s }))}
                      className={cn(
                        "py-3 px-4 rounded-xl text-xs font-black transition-all border-2",
                        state.strain === s 
                          ? "bg-blue-600/20 border-blue-600 text-blue-400" 
                          : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10"
                      )}
                    >
                      {STRAIN_NAMES[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">نظام التربية</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, breedingSystem: 'Floor' }))}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 text-right",
                      state.breedingSystem === 'Floor' 
                        ? "bg-emerald-600/20 border-emerald-600 text-white" 
                        : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 shadow-inner"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full justify-between">
                       <LayoutGrid size={14} className={state.breedingSystem === 'Floor' ? "text-emerald-400" : "text-slate-600"} />
                       <span className="font-black text-[11px]">تربية أرضي</span>
                    </div>
                    <p className="text-[8px] font-bold opacity-70 leading-tight">تربية تقليدية مفرودة على الأرض مع فرشة نشارة.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, breedingSystem: 'Battery-3' }))}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 text-right",
                      state.breedingSystem === 'Battery-3' 
                        ? "bg-blue-600/20 border-blue-600 text-white" 
                        : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 shadow-inner"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full justify-between">
                       <Layers size={14} className={state.breedingSystem === 'Battery-3' ? "text-blue-400" : "text-slate-600"} />
                       <span className="font-black text-[11px]">تربية بطاريات</span>
                    </div>
                    <p className="text-[8px] font-bold opacity-70 leading-tight">تربية حديثة داخل بطاريات معدنية رأسية متعددة الأدوار.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">العدد الكلي للكتاكيت</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={state.totalChicks ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setState(prev => ({ ...prev, totalChicks: val }));
                    }
                  }}
                  className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-4 py-4 focus:border-blue-600 focus:outline-none font-black text-white text-lg transition-all"
                  placeholder="1000"
                />
              </div>

              {state.breedingSystem !== 'Floor' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">نمط توزيع الطيور</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, distributionMode: 'sequential' }))}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 text-right",
                        state.distributionMode === 'sequential' 
                          ? "bg-purple-600/20 border-purple-600 text-white" 
                          : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 shadow-inner"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full justify-between">
                         <Zap size={14} className={state.distributionMode === 'sequential' ? "text-purple-400" : "text-slate-600"} fill="currentColor" />
                         <span className="font-black text-[11px]">متسلسل (تحضين)</span>
                      </div>
                      <p className="text-[8px] font-bold opacity-70 leading-tight">ملأ البطاريات بالترتيب لتوفير التدفئة.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, distributionMode: 'equal' }))}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 text-right",
                        state.distributionMode === 'equal' 
                          ? "bg-emerald-600/20 border-emerald-600 text-white" 
                          : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 shadow-inner"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full justify-between">
                         <Activity size={14} className={state.distributionMode === 'equal' ? "text-emerald-400" : "text-slate-600"} />
                         <span className="font-black text-[11px]">متساوي (توسعة)</span>
                      </div>
                      <p className="text-[8px] font-bold opacity-70 leading-tight">توزيع متوازن لتحسين التهوية والنمو.</p>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">مدة الدورة المتوقعة (يوم)</label>
                <div className="flex items-center gap-6">
                  <input 
                    type="range"
                    min="15"
                    max="50"
                    value={state.targetCycleDays ?? 35}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setState(prev => ({ 
                        ...prev, 
                        targetCycleDays: val,
                        age: Math.min(Number(prev.age), val)
                      }));
                    }}
                    style={{
                      background: `linear-gradient(to left, #10b981 0%, #10b981 ${( ( (Number(state.targetCycleDays ?? 35)) - 15) / (50 - 15) ) * 100}%, #1e293b ${( ( (Number(state.targetCycleDays ?? 35)) - 15) / (50 - 15) ) * 100}%, #1e293b 100%)`
                    }}
                    className="flex-1 appearance-none h-2.5 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(16,185,129,0.5)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-slate-900 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-slate-900 shadow-inner"
                  />
                  <div className="bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-lg min-w-[3.5rem] text-center shadow-lg shadow-emerald-500/20">{state.targetCycleDays}</div>
                </div>
                <p className="text-[9px] font-bold text-slate-600 mt-2 text-right">
                  * هذا العمر يستخدم لحساب توزيع الفواتير والمصاريف على النافق بشكل عادل.
                </p>
              </div>

              <div className="relative group">
                <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.2em] mb-1.5 px-3 py-0.5 bg-blue-500/5 rounded-full border border-blue-500/10">الوقت الآن</span>
                    <span className="text-2xl font-black text-white font-mono tracking-widest bg-slate-950 px-5 py-2.5 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] min-w-[180px] text-center">
                      {currentTime.toLocaleTimeString('ar-EG', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit', 
                        hour12: true 
                      })}
                    </span>
                  </div>
                </div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-right">تاريخ بداية الدورة</label>
                <div className="relative">
                  <input 
                    type="date"
                    id="startDatePicker"
                    value={state.startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      const newDate = e.target.value;
                      const start = new Date(newDate);
                      const today = new Date();
                      start.setHours(0,0,0,0);
                      today.setHours(0,0,0,0);
                      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      
                      setState(prev => ({ 
                        ...prev, 
                        startDate: newDate,
                        age: Math.max(1, diffDays),
                        isManualOverride: false 
                      }));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-4 py-4 font-black text-white text-3xl flex justify-between items-center group-focus-within:border-blue-600 transition-all">
                    <span className="font-mono tracking-tighter">
                      {state.startDate ? formatDateToDMY(new Date(state.startDate)) : formatDateToDMY(new Date())}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">العمر الحالي (أيام)</label>
                  <button 
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, isManualOverride: !prev.isManualOverride }))}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black transition-all",
                      state.isManualOverride 
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" 
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/10 hover:bg-blue-500/20"
                    )}
                    title={state.isManualOverride ? "تم التعديل يدوياً" : "يتم التحديث تلقائياً"}
                  >
                    {state.isManualOverride ? <Edit3 size={10} /> : <RefreshCw size={10} className={cn("transition-all", !state.isManualOverride && "animate-spin-slow")} />}
                    {state.isManualOverride ? "تعديل يدوي نشط" : "تحديث تلقائي نشط"}
                  </button>
                </div>
                <div className="flex items-center gap-6">
                  {state.isManualOverride ? (
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={state.age}
                      onChange={e => {
                        const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                        // Sync startDate backwards
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const newStart = new Date(today);
                        newStart.setDate(today.getDate() - (val - 1));
                        
                        setState(prev => ({ 
                          ...prev, 
                          age: val,
                          startDate: newStart.toISOString().split('T')[0]
                        }));
                      }}
                      className="flex-1 bg-slate-900 border-2 border-amber-500/30 rounded-xl px-4 py-4 focus:border-amber-500 focus:outline-none font-black text-white text-lg transition-all text-center"
                    />
                  ) : (
                    <input 
                      type="range"
                      min="0"
                      max={Number(state.targetCycleDays) || 35}
                      value={state.age ?? 1}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        // Sync startDate backwards
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const newStart = new Date(today);
                        newStart.setDate(today.getDate() - (val - 1));

                        setState(prev => ({ 
                          ...prev, 
                          age: val,
                          isManualOverride: true,
                          startDate: newStart.toISOString().split('T')[0]
                        }));
                      }}
                      style={{
                        background: `linear-gradient(to left, #3b82f6 0%, #3b82f6 ${( ( (Number(state.age ?? 1)) - 0) / ( (Number(state.targetCycleDays) || 35) - 0) ) * 100}%, #1e293b ${( ( (Number(state.age ?? 1)) - 0) / ( (Number(state.targetCycleDays) || 35) - 0) ) * 100}%, #1e293b 100%)`
                      }}
                      className="flex-1 appearance-none h-2.5 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(59,130,246,0.5)] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-slate-900 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-slate-900 shadow-inner"
                    />
                  )}
                  <div className={cn(
                    "text-white font-black px-4 py-2 rounded-xl text-lg min-w-[3.5rem] text-center shadow-lg transition-all",
                    state.isManualOverride ? "bg-amber-600 shadow-amber-500/20" : "bg-blue-600 shadow-blue-500/20"
                  )}>
                    {state.age}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الحرارة الخارجية تلقائياً (°م)</p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-xl text-lg font-black border transition-colors duration-300",
                  state.externalTemp === undefined || state.externalTemp === null || state.externalTemp === '' || state.externalTemp === '--'
                    ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    : toNum(state.externalTemp) === targetTemp
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : toNum(state.externalTemp) < targetTemp
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {state.externalTemp ?? '--'}°م
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">الحرارة الداخلية (°م)</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={state.internalTemp ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setState(prev => ({ ...prev, internalTemp: val }));
                    }
                  }}
                  className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-4 py-4 focus:border-blue-600 focus:outline-none font-black text-white text-lg transition-all"
                  placeholder="28"
                />
              </div>
            </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-right">أبعاد العنبر (متر)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-600 block mb-1 text-center">الطول</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={state.barnLength ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setState(prev => ({ ...prev, barnLength: val }));
                        }
                      }}
                      className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-2 py-3 focus:border-blue-600 focus:outline-none font-black text-white text-md text-center transition-all"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-600 block mb-1 text-center">العرض</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={state.barnWidth ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setState(prev => ({ ...prev, barnWidth: val }));
                        }
                      }}
                      className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-2 py-3 focus:border-blue-600 focus:outline-none font-black text-white text-md text-center transition-all"
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-600 block mb-1 text-center">الارتفاع</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={state.barnHeight ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setState(prev => ({ ...prev, barnHeight: val }));
                        }
                      }}
                      className="w-full bg-slate-900 border-2 border-white/5 rounded-xl px-2 py-3 focus:border-blue-600 focus:outline-none font-black text-white text-md text-center transition-all"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>

              {state.breedingSystem !== 'Floor' && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => {
                        const newId = `bg-${Date.now()}`;
                        setState(prev => ({
                          ...prev,
                          batteryGroups: [
                            ...(prev.batteryGroups || []),
                            { id: newId, name: `مجموعة ${prev.batteryGroups.length + 1}`, length: 0.6, width: 0.5, tiers: 3, count: 1 }
                          ]
                        }));
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black hover:bg-emerald-500/20 transition-all active:scale-95"
                    >
                      <Plus size={14} />
                      إضافة مجموعة بطاريات
                    </button>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">مواصفات البطاريات</label>
                  </div>

                  {(state.batteryGroups || []).map((group, idx) => (
                    <div key={group.id} className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4 relative group">
                      <div className="flex items-center justify-between">
                        <button 
                          type="button"
                          onClick={() => {
                            if (state.batteryGroups.length <= 1) return;
                            setState(prev => ({
                              ...prev,
                              batteryGroups: prev.batteryGroups.filter(g => g.id !== group.id)
                            }));
                          }}
                          className="text-red-500/50 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المجموعة {idx + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Group Count */}
                        <div className="col-span-2">
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 text-right">عدد البطاريات في هذه المجموعة</label>
                          <div className="flex items-center gap-3 bg-slate-950/80 p-1.5 rounded-3xl border-2 border-white/5 shadow-inner">
                            <button 
                              type="button"
                              onClick={() => {
                                const current = parseInt(String(group.count)) || 1;
                                const newCount = Math.max(1, current - 1);
                                setState(prev => ({
                                  ...prev,
                                  batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, count: newCount } : g)
                                }));
                              }}
                              className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90 border border-white/5 shadow-lg"
                            >
                              <Minus size={20} strokeWidth={3} />
                            </button>
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={group.count}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setState(prev => ({
                                    ...prev,
                                    batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, count: val } : g)
                                  }));
                                }}
                                className="w-full bg-transparent border-none text-center font-black text-2xl text-white focus:ring-0 p-0 leading-none"
                              />
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">وحدة</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const current = parseInt(String(group.count)) || 1;
                                const newCount = current + 1;
                                setState(prev => ({
                                  ...prev,
                                  batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, count: newCount } : g)
                                }));
                              }}
                              className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-500 transition-all active:scale-90 shadow-xl shadow-blue-600/30 border border-white/10"
                            >
                              <Plus size={20} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {/* Dimensions */}
                        <div>
                          <span className="text-[9px] font-black text-slate-600 block mb-1 text-center">الطول (م)</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={group.length}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setState(prev => ({
                                  ...prev,
                                  batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, length: val } : g)
                                }));
                              }
                            }}
                            className="w-full bg-slate-950 border border-white/5 rounded-xl px-2 py-3 focus:border-blue-600 focus:outline-none font-black text-white text-sm text-center transition-all"
                            placeholder="0.6"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-600 block mb-1 text-center">العرض (م)</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={group.width}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setState(prev => ({
                                  ...prev,
                                  batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, width: val } : g)
                                }));
                              }
                            }}
                            className="w-full bg-slate-950 border border-white/5 rounded-xl px-2 py-3 focus:border-blue-600 focus:outline-none font-black text-white text-sm text-center transition-all"
                            placeholder="0.5"
                          />
                        </div>

                        {/* Tiers */}
                        <div className="col-span-2 space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-black text-slate-600 uppercase">عدد الأدوار: {group.tiers}</span>
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">طوابق البطارية</span>
                          </div>
                          <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-white/5">
                            <input 
                              type="range"
                              min="1"
                              max="6"
                              value={group.tiers}
                              onChange={e => {
                                const tiers = parseInt(e.target.value);
                                setState(prev => ({
                                  ...prev,
                                  batteryGroups: prev.batteryGroups.map(g => g.id === group.id ? { ...g, tiers } : g)
                                }));
                              }}
                              style={{
                                background: `linear-gradient(to left, #9333ea 0%, #9333ea ${( ( (Number(group.tiers)) - 1) / (6 - 1) ) * 100}%, #1e293b ${( ( (Number(group.tiers)) - 1) / (6 - 1) ) * 100}%, #1e293b 100%)`
                              }}
                              className="flex-1 appearance-none h-1.5 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button 
                type="submit"
                onClick={() => {
                  // Sync legacy fields with the primary group for compatibility
                  const primary = state.batteryGroups[0];
                  if (primary) {
                    const tiers = Number(primary.tiers);
                    const newTierCounts = [...(state.batteryTierCounts || [])];
                    if (newTierCounts.length < tiers) {
                      for (let i = newTierCounts.length; i < tiers; i++) {
                        newTierCounts.push(Math.floor(toNum(state.totalChicks) / tiers));
                      }
                    } else if (newTierCounts.length > tiers) {
                      newTierCounts.splice(tiers);
                    }
                    
                    setState(prev => ({
                      ...prev,
                      batteryLength: primary.length,
                      batteryWidth: primary.width,
                      batteryTiers: tiers,
                      batteriesCount: primary.count,
                      batteryTierCounts: newTierCounts
                    }));
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
              >
                بدء الدورة
                <ChevronRight size={18} className="rotate-180" />
              </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-32 font-sans antialiased text-white overflow-x-clip" dir="rtl">
      {/* Top Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl px-4 sm:px-6 py-4 border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          
          {/* Top Row: Symmetrical 3-Column Layout */}
          <div className="flex items-center justify-between gap-3 w-full">
            
            {/* Right Column (Logo) - Constrained to balance the layout */}
            <div className="w-24 flex justify-start flex-shrink-0">
              <Logo size={46} iconSize={23} className="rounded-xl shadow-[0_0_15px_rgba(30,111,253,0.25)]" />
            </div>

            {/* Center Column: Title & Slogan perfectly centered mathematically */}
            <div className="flex-1 flex flex-col items-center justify-center text-center select-none min-w-0">
              <div className="w-[140px] flex flex-col items-center justify-center">
                <h1 className="text-[12px] font-black tracking-[0.14em] text-[#00b0ff] drop-shadow-[0_2px_8px_rgba(30,176,255,0.15)] leading-none uppercase text-center w-full">
                  مدير مزارع
                </h1>
                <h2 className="text-[22px] font-black text-white tracking-[0.05em] leading-tight mt-1 drop-shadow-[0_2px_12px_rgba(255,255,255,0.05)] text-center w-full">
                  الدواجن
                </h2>
              </div>
              <div className="mt-1.5 pb-0.5 border-t border-white/10 pt-1 w-[140px] flex justify-center">
                <p className="text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 leading-none text-center w-full">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00dfa2] to-[#04dcd2]">إدارة ذكية</span>
                  <span className="text-white/40 font-bold mx-0.5">..</span>
                  <span className="text-white">إنتاج أفضل</span>
                </p>
              </div>
            </div>

            {/* Left Column (Actions) - Constrained to matching w-24 for absolute symmetry */}
            <div className="w-24 flex justify-end items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowNotificationsModal(true)}
                className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 hover:border-violet-500/50 flex items-center justify-center text-white transition-all active:scale-95 relative outline-none"
                title="مركز التنبيهات والإشعارات"
              >
                {inAppNotifications.length > 0 ? (
                  <BellRing size={16} className="text-violet-400 animate-bounce" />
                ) : (
                  <Bell size={16} className="text-slate-400" />
                )}
                {inAppNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-black flex items-center justify-center text-white ring-1 ring-slate-950 animate-pulse">
                    {inAppNotifications.length}
                  </span>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setScreen('setup')}
                className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 outline-none",
                  (screen as string) === 'setup'
                    ? "bg-blue-500 text-white border-blue-400 shadow-lg"
                    : "bg-slate-800/80 text-slate-400 border-white/10 hover:border-blue-500/50 hover:text-white"
                )}
                title="الإعدادات"
              >
                <Settings size={18} />
              </button>
            </div>

          </div>

          {/* Bottom Row / Status Bar - Centered precisely on all screen sizes */}
          <div className="flex justify-center w-full">
            <div className="flex items-center justify-center gap-2 bg-slate-950/40 border border-white/5 py-1.5 px-3.5 rounded-xl sm:rounded-2xl transition-all w-full sm:w-auto max-w-sm">
              <span className="status-dot w-1.5 h-1.5 bg-green-500 animate-pulse glow-green flex-shrink-0"></span>
              <div className="text-slate-400 text-[10px] sm:text-xs font-black uppercase text-center">
                <div className="flex items-center gap-1.5 justify-center" title={state.isManualOverride ? "تم التعديل يدوياً" : "يتم التحديث تلقائياً"}>
                   {state.isManualOverride ? <Edit3 size={11} className="text-amber-500" /> : <RefreshCw size={11} className="text-blue-400 animate-spin-slow" />}
                   <span>{state.age} يوم</span>
                   <span className="text-slate-600">•</span>
                   <span>{STRAIN_NAMES[state.strain]}</span>
                   <span className="text-slate-600">•</span>
                   <span>{toNum(state.totalChicks).toLocaleString()} طائر</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
        {/* Weight Entry Modal */}
      <AnimatePresence>
        {isWeightModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWeightModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">تسجيل وزن اليوم</h3>
                    <p className="text-slate-400 text-sm mt-1">يوم {state.age} من الدورة</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <ScaleIcon size={24} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-1">
                    الوزن الحالي (جم)
                  </label>
                  <div className="relative group">
                    <input 
                      type="number"
                      autoFocus
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="أدخل الوزن بالجرام..."
                      className="w-full bg-slate-950/50 border-2 border-white/5 focus:border-emerald-500/50 rounded-2xl p-4 text-2xl font-bold text-white outline-none transition-all text-center"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => setIsWeightModalOpen(false)}
                    className="p-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        isManualWeight: true,
                        weightLogs: {
                          ...(prev.weightLogs || {}),
                          [String(toNum(prev.age))]: weightInput === '' ? 0 : Number(weightInput)
                        }
                      }));
                      setIsWeightModalOpen(false);
                    }}
                    className="p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    حفظ الوزن
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
          {screen === 'management' && (
            <motion.div 
              key="management"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6 pb-20"
            >
              <header className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-400/10 rounded-xl flex items-center justify-center text-purple-500 shadow-inner">
                    <Cloud size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">النسخ الاحتياطي والبيانات</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScreen('landing')}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </header>

              <div className="space-y-6">
                {/* Auto Save Toggle - Independent Card */}
                <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-right">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">مزامنة البيانات الحالية</h4>
                      <p className="text-[10px] text-slate-500 font-bold">الحفظ التلقائي يحمي بياناتك من الضياع المفاجئ</p>
                    </div>
                    <button 
                      onClick={() => setIsAutoSave(!isAutoSave)}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ring-2 ring-white/5 shadow-lg",
                        isAutoSave ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-700 shadow-inner"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300",
                          isAutoSave ? "-translate-x-1" : "-translate-x-6"
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Card 2: Local Backup (Mobile/Storage) */}
                  <div className="bg-purple-600/10 p-6 rounded-[2rem] border border-purple-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <HardDrive size={80} className="text-purple-400" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between flex-row-reverse text-right">
                        <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <Download size={28} />
                        </div>
                        <div className="flex-1 me-4">
                          <h4 className="text-lg font-black text-white">نسخة احتياطية للموبايل</h4>
                          <p className="text-[11px] text-purple-400/70 font-bold">حفظ ملف البيانات باسم التطبيق في مجلد التحميلات</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={exportBackup}
                          className="w-full bg-purple-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-purple-500/30 hover:bg-purple-400 transition-all active:scale-[0.98]"
                        >
                          تنزيل ملف النسخة (JSON)
                        </button>
                        <button 
                          onClick={copyBackupCode}
                          className="w-full bg-slate-800 text-purple-300 py-3 rounded-2xl font-bold text-xs border border-purple-500/20 hover:bg-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <Copy size={16} />
                          نسخ كود البيانات (نص)
                        </button>
                        <button 
                          onClick={exportCSV}
                          className="w-full bg-white/10 text-purple-200 py-3 rounded-2xl font-bold text-xs border border-purple-500/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={16} />
                          تصدير تقرير الدورة (CSV)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Import Backup */}
                  <div className="bg-amber-600/10 p-6 rounded-[2rem] border border-amber-500/20 shadow-xl relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Upload size={80} className="text-amber-400" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between flex-row-reverse text-right">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <Upload size={28} />
                        </div>
                        <div className="flex-1 me-4">
                          <h4 className="text-lg font-black text-white">استيراد نسخة سابقة</h4>
                          <p className="text-[11px] text-amber-400/70 font-bold">استعادة البيانات من الموبايل أو ملف Google Drive المحمل</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-all active:scale-[0.98] text-center cursor-pointer">
                          اختيار ملف للاستعادة
                          <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                        </label>
                        <button 
                          onClick={importFromCode}
                          className="w-full bg-slate-800 text-amber-300 py-3 rounded-2xl font-bold text-xs border border-amber-500/20 hover:bg-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <Terminal size={16} />
                          استعادة بواسطة الكود
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-8 pt-4 border-t border-white/5 space-y-4">
                    <button 
                      onClick={() => setIsComparing(!isComparing)}
                      className={cn(
                        "w-full p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest",
                        isComparing 
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-500" 
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                      )}
                    >
                      <History size={16} />
                      {isComparing ? 'إغلاق مقارنة الدورات' : 'مقارنة الدورات السابقة'}
                    </button>

                    <AnimatePresence>
                      {isComparing && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
                            <h4 className="text-sm font-black text-white text-right">اختر الدورات للمقارنة</h4>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto px-2 custom-scrollbar">
                              {[state, ...allCycles.filter(c => c.id !== state.id)].map(cycle => (
                                <button
                                  key={cycle.id}
                                  onClick={() => {
                                    setSelectedComparisonIds(prev => 
                                      prev.includes(cycle.id) 
                                        ? prev.filter(i => i !== cycle.id) 
                                        : [...prev, cycle.id]
                                    );
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all text-right",
                                    selectedComparisonIds.includes(cycle.id)
                                      ? "bg-blue-600/20 border-blue-500/50 text-white"
                                      : "bg-slate-950/50 border-white/5 text-slate-400 shadow-inner"
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                    selectedComparisonIds.includes(cycle.id)
                                      ? "bg-blue-500 border-blue-400 text-white"
                                      : "border-white/10"
                                  )}>
                                    {selectedComparisonIds.includes(cycle.id) && <Check size={14} />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black">{cycle.name || 'دورة غير مسمى'}</span>
                                    <span className="text-[10px] font-bold opacity-60">{cycle.createdAt || 'تاريخ غير معروف'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>

                            {selectedComparisonIds.length > 0 && (
                              <div className="pt-4 border-t border-white/5 space-y-6">
                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest text-center">نتائج المقارنة التحليلية</h4>
                                <div className="space-y-4 overflow-x-auto pb-4 custom-scrollbar">
                                  <table className="w-full text-right text-xs">
                                    <thead>
                                      <tr className="text-slate-500 border-b border-white/5">
                                        <th className="pb-3 pr-2">الخاصية (KPI)</th>
                                        {selectedComparisonIds.map(id => {
                                          const cycle = [state, ...allCycles].find(c => c.id === id);
                                          return <th key={id} className="pb-3 text-center text-white">{cycle?.name?.slice(0, 10)}..</th>;
                                        })}
                                      </tr>
                                    </thead>
                                    <tbody className="text-slate-300">
                                      <tr className="border-b border-white/5 h-12">
                                        <td className="pr-2 font-bold text-slate-400">عدد الطيور</td>
                                        {selectedComparisonIds.map(id => {
                                          const cycle = [state, ...allCycles].find(c => c.id === id);
                                          return <td key={id} className="text-center font-black">{cycle?.totalChicks}</td>;
                                        })}
                                      </tr>
                                      <tr className="border-b border-white/5 h-12">
                                        <td className="pr-2 font-bold text-slate-400">معدل النافق (%)</td>
                                        {selectedComparisonIds.map(id => {
                                          const cycle = [state, ...allCycles].find(c => c.id === id);
                                          if (!cycle) return <td key={id}>-</td>;
                                          const died = cycle.mortalityBills.reduce((acc, m) => acc + toNum(m.count), 0);
                                          const rate = (died / toNum(cycle.totalChicks)) * 100;
                                          return <td key={id} className={cn("text-center font-black", rate > 10 ? 'text-red-400' : 'text-emerald-400')}>{rate.toFixed(1)}%</td>;
                                        })}
                                      </tr>
                                      <tr className="border-b border-white/5 h-12">
                                        <td className="pr-2 font-bold text-slate-400">معامل التحويل (FCR)</td>
                                        {selectedComparisonIds.map(id => {
                                          const cycle = [state, ...allCycles].find(c => c.id === id);
                                          if (!cycle) return <td key={id}>-</td>;
                                          const totalWeight = cycle.salesRecords.reduce((acc, s) => acc + toNum(s.weight), 0);
                                          // Estimated total feed based on manual calculation simplified for comparison
                                          const deadFeed = cycle.mortalityBills.reduce((acc, m) => acc + (toNum(m.count) * getDailyStats(cycle.strain, toNum(m.ageAtDeath)).cumFeed), 0);
                                          const aliveFeed = (toNum(cycle.totalChicks) - cycle.mortalityBills.reduce((acc, m) => acc + toNum(m.count), 0)) * getDailyStats(cycle.strain, toNum(cycle.age)).cumFeed;
                                          const fcr = (totalWeight > 0) ? ((deadFeed + aliveFeed) / 1000) / totalWeight : 0;
                                          return <td key={id} className="text-center font-black text-blue-400">{fcr > 0 ? fcr.toFixed(2) : 'N/A'}</td>;
                                        })}
                                      </tr>
                                      <tr className="border-b border-white/5 h-12">
                                        <td className="pr-2 font-bold text-slate-400">الربح لكل طائر</td>
                                        {selectedComparisonIds.map(id => {
                                          const cycle = [state, ...allCycles].find(c => c.id === id);
                                          if (!cycle) return <td key={id}>-</td>;
                                          // Simplified net profit calc for comparison
                                          const birdsDied = cycle.mortalityBills.reduce((acc, m) => acc + toNum(m.count), 0);
                                          const birdsAlive = Math.max(0, toNum(cycle.totalChicks) - birdsDied);
                                          const deadFeed = cycle.mortalityBills.reduce((acc, m) => acc + (toNum(m.count) * getDailyStats(cycle.strain, toNum(m.ageAtDeath)).cumFeed), 0);
                                          const aliveFeed = birdsAlive * getDailyStats(cycle.strain, toNum(cycle.age)).cumFeed;
                                          const totalFeedKg = (deadFeed + aliveFeed) / 1000;
                                          const costs = (toNum(cycle.totalChicks) * toNum(cycle.chickPrice)) + (totalFeedKg * toNum(cycle.feedPrice)) + 
                                                        ([...cycle.electricityBills, ...cycle.waterBills, ...cycle.medicationBills, ...cycle.otherBills, ...(cycle.laborBills || [])].reduce((acc, b) => acc + toNum(b.amount), 0));
                                          const revenue = cycle.salesRecords.reduce((acc, s) => acc + toNum(s.amount), 0);
                                          const profit = (revenue - costs) / toNum(cycle.totalChicks);
                                          return <td key={id} className={cn("text-center font-black", profit > 0 ? 'text-emerald-400' : 'text-red-400')}>{profit.toFixed(1)} ج.م</td>;
                                        })}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={() => {
                        if (confirm('⚠️ تحذير: هل أنت متأكد تماماً من رغبتك في مسح كافة بيانات التطبيق نهائياً؟')) {
                          if (confirm('🛑 تنبيه أخير: سيتم حذف جميع الدورات الحالية والأرشيف والإعدادات. هل تريد الاستمرار بحق؟')) {
                            localStorage.clear();
                            window.location.reload();
                          }
                        }
                      }}
                      className="w-full bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 p-4 rounded-2xl border border-red-500/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <RefreshCw size={14} />
                      إعادة ضبط المصنع (مسح شامل)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'finances' && (
            <motion.div 
              key="finances"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6 pb-20"
            >
              <header className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                    <Wallet size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">الإدارة المالية</h2>
                </div>
              </header>

              {/* Input Prices Card */}
              <Card className="bg-slate-900 border-white/5 p-6 space-y-6 text-right">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 justify-end">
                  <Settings size={16} className="text-blue-400" />
                  مدخلات الأسعار
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">سعر الكتكوت الواحد</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={state.chickPrice ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setState(prev => ({ ...prev, chickPrice: val }));
                        }
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-black text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex flex-col text-right">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">سعر بورصة الفراخ البيضاء اليوم/كجم</label>
                        {state.lastPriceUpdateAt && (
                          <span className="text-[8px] text-slate-600 font-bold">آخر تحديث: {state.lastPriceUpdateAt}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isFetchingPrice && (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="text-blue-500"
                          >
                            <RefreshCw size={14} />
                          </motion.div>
                        )}
                        {!state.isManualPriceMode ? (
                          <button 
                            onClick={() => setState(prev => ({ ...prev, isManualPriceMode: true }))}
                            className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase"
                          >
                            تعديل يدوي
                          </button>
                        ) : (
                          <button 
                            onClick={() => fetchChickenPrice(true)}
                            className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase flex items-center gap-1"
                          >
                            <RefreshCw size={10} />
                            تحديث آلي
                          </button>
                        )}
                      </div>
                    </div>
                    
                      <div className="relative group">
                      {isFetchingPrice && (
                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
                          <span className="text-[10px] font-black text-blue-400 animate-pulse tracking-widest">جاري التحميل...</span>
                        </div>
                      )}
                      <input 
                        type="text"
                        inputMode="decimal"
                        readOnly={!state.isManualPriceMode}
                        value={state.sellingPrice ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setState(prev => ({ ...prev, sellingPrice: val }));
                          }
                        }}
                        placeholder="0"
                        className={cn(
                          "w-full bg-slate-950 border rounded-xl px-6 py-5 font-black transition-all outline-none text-right text-white text-3xl",
                          state.isManualPriceMode 
                            ? "border-blue-500/50 focus:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                            : "border-white/5 cursor-not-allowed"
                        )}
                      />
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white pointer-events-none">ج.م</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sales Management Section */}
              <div className="bg-slate-900 border-white/5 p-6 rounded-3xl space-y-6 text-right">
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      salesRecords: [...prev.salesRecords, { 
                        id: Math.random().toString(36).substr(2, 9), 
                        label: `مبيعات اليوم ${prev.age}`, 
                        amount: 0, 
                        price: prev.sellingPrice, 
                        weight: 0,
                        date: new Date().toISOString().split('T')[0]
                      }] 
                    }))}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <Plus size={16} />
                    إضافة عملية بيع
                  </button>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">سجل المبيعات المجزأ</h3>
                    <div className="p-2 bg-slate-950 rounded-lg text-emerald-400">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {state.salesRecords.map(sale => (
                    <div key={sale.id} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBillToDelete({ id: sale.id, section: 'salesRecords', label: sale.label || 'سجل مبيعات' });
                          }}
                          className="p-2 text-slate-600 hover:text-red-500 transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                        <input 
                          type="text"
                          value={sale.label ?? ''}
                          onChange={e => setState(prev => ({ ...prev, salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, label: e.target.value } : s) }))}
                          className="bg-transparent text-xs font-black text-emerald-400 text-right outline-none w-1/2"
                          placeholder="وصف العملية"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-600 uppercase">الوزن الكلي (كجم)</label>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={sale.weight ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setState(prev => ({ 
                                  ...prev, 
                                  salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, weight: val, amount: toNum(val) * toNum(s.price) } : s) 
                                }));
                              }
                            }}
                            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-black text-white text-center"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-600 uppercase">سعر الكجم</label>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={sale.price ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setState(prev => ({ 
                                  ...prev, 
                                  salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, price: val, amount: toNum(s.weight) * toNum(val) } : s) 
                                }));
                              }
                            }}
                            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-black text-white text-center"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-600 uppercase">القيمة الإجمالية</label>
                          <div className="bg-slate-900 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs font-black text-emerald-400 text-center">
                            {(toNum(sale.weight) * toNum(sale.price)).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* New Customer Fields */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase">اسم العميل</label>
                          <input 
                            type="text"
                            value={sale.customerName ?? ''}
                            onChange={e => setState(prev => ({ ...prev, salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, customerName: e.target.value } : s) }))}
                            className="bg-slate-900 border border-white/10 rounded-xl px-1.5 py-2.5 text-xs font-black text-white text-right focus:border-blue-500/50 transition-all"
                            placeholder="الاسم"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase">رقم الهاتف</label>
                          <input 
                            type="text"
                            value={sale.customerPhone ?? ''}
                            onChange={e => setState(prev => ({ ...prev, salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, customerPhone: e.target.value } : s) }))}
                            className="bg-slate-900 border border-white/10 rounded-xl px-1.5 py-2.5 text-xs font-black text-white text-right focus:border-blue-500/50 transition-all"
                            placeholder="01xxxxxxxxx"
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 pt-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">تاريخ العملية</label>
                        <input 
                          type="date"
                          value={sale.date ?? ''}
                          onChange={e => setState(prev => ({ ...prev, salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, date: e.target.value } : s) }))}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-white text-right focus:border-blue-500/50 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase">المبلغ المدفوع</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={sale.amountPaid ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                setState(prev => ({ 
                                  ...prev, 
                                  salesRecords: prev.salesRecords.map(s => s.id === sale.id ? { ...s, amountPaid: val } : s) 
                                }));
                              }
                            }}
                            className="bg-slate-900 border border-white/10 rounded-xl px-1.5 py-2.5 text-xs font-black text-white text-center focus:border-emerald-500/50 transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase">المبلغ المتبقي</label>
                          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-1.5 py-2.5 text-xs font-black text-slate-400 text-center flex items-center justify-center min-h-[42px]">
                            {(toNum(sale.amount) - toNum(sale.amountPaid)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {state.salesRecords.length === 0 && (
                    <p className="text-[10px] text-slate-600 font-bold text-center py-4">لم يتم تسجيل عمليات بيع حتى الآن</p>
                  )}
                </div>
              </div>

              <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 p-8 relative overflow-visible text-right">
                <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl -ml-16 -mt-16" />
                </div>
                <div className="relative z-10 space-y-10">
                  {/* 1. إجمالي التكاليف / المصروفات */}
                  <div className="text-center">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center">
                      إجمالي التكاليف / المصروفات
                        <div className="group/spend relative" tabIndex={0}>
                          <PlusCircle size={10} className="text-slate-600 cursor-help" />
                          <motion.div 
                            drag
                            dragMomentum={false}
                            dragElastic={0.1}
                            className="invisible group-hover/spend:visible group-focus/spend:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl z-50 font-sans text-right cursor-move pointer-events-auto"
                          >
                            <p className="text-white font-bold mb-2 border-b border-white/10 pb-1 text-[10px]">توزيع التكاليف والمصروفات:</p>
                            <div className="space-y-1.5 text-[9px] pointer-events-none">
                              <div className="flex justify-between text-slate-300">
                                <span>{finances.totalChickPurchaseCost.toLocaleString()} ج.م</span>
                                <span>شراء الكتاكيت (العدد الكلي):</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>{finances.totalFeedCost.toLocaleString()} ج.م</span>
                                <span>تكلفة العلف المستهلك (الكلي):</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>{finances.generalBillSum.toLocaleString()} ج.م</span>
                                <span>المصاريف العامة والفواتير:</span>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white">
                      {finances.totalSpending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-xs text-slate-500 ms-2">ج.م</span>
                    </p>
                  </div>

                  <div className="w-full border-t border-white/5 pt-10 space-y-10">
                    {/* 2. إجمالي المبيعات */}
                    <div className="text-center group relative">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">إجمالي المبيعات (المحققة)</p>
                      </div>
                      <p className="text-3xl font-black text-emerald-400">
                        {finances.actualSalesRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs text-emerald-600 ms-2">ج.م</span>
                      </p>
                    </div>

                    {/* 4. إجمالي الأرباح الفعلية / المتوقعة */}
                    <div className="text-center bg-white/5 p-8 rounded-3xl border border-white/10 ring-1 ring-emerald-500/20 shadow-inner">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 items-center flex justify-center gap-2">
                        إجمالي الأرباح الفعلية / المتوقعة
                          <div className="group/profit relative" tabIndex={0}>
                            <Layout size={10} className="text-slate-500 cursor-help" />
                            <motion.div 
                              drag
                              dragMomentum={false}
                              dragElastic={0.1}
                              className="invisible group-hover/profit:visible group-focus/profit:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 max-w-[calc(100vw-2.5rem)] bg-slate-900 border border-white/10 p-5 rounded-2xl shadow-2xl z-50 text-right font-sans ring-1 ring-emerald-500/20 cursor-move pointer-events-auto"
                            >
                              <p className="text-emerald-400 font-black mb-3 border-b border-white/10 pb-2 text-[11px]">تحليل الأرباح والخسائر (P&L):</p>
                              <div className="space-y-2 text-[10px] pointer-events-none">
                                <div className="flex justify-between items-center text-slate-300">
                                  <span className="font-mono text-emerald-400">+{finances.actualSalesRevenue.toLocaleString()}</span>
                                  <span>مبيعات محققة:</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                  <span className="font-mono text-emerald-500/70">+{finances.estimatedRemainingRevenue.toLocaleString()}</span>
                                  <span>متوقع (الطيور الحالية):</span>
                                </div>
                                <div className="border-t border-white/5 my-2" />
                                <div className="flex justify-between items-center text-slate-400">
                                  <span className="font-mono text-red-400">-{finances.totalChickPurchaseCost.toLocaleString()}</span>
                                  <span>شراء الكتاكيت:</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                  <span className="font-mono text-red-400">-{finances.totalFeedCost.toLocaleString()}</span>
                                  <span>تكلفة العلف الكلية:</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                  <span className="font-mono text-red-400">-{finances.generalBillSum.toLocaleString()}</span>
                                  <span>إجمالي الفواتير:</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-emerald-500/20 bg-emerald-500/5 -mx-5 px-5 flex justify-between items-center font-black">
                                  <span className="font-mono text-emerald-400 text-sm">{finances.netProfit.toLocaleString()} ج.م</span>
                                  <span className="text-white">صافي الربح النهائي:</span>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                      </div>
                      <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                        {finances.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-sm text-emerald-600 ms-3 font-normal uppercase">ج.م</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Feed Cost Management */}
              <Card className="bg-slate-900 border-white/5 p-6 text-right">
                <div className="flex items-center justify-end gap-3 mb-6">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">تكاليف الأعلاف</h4>
                  <div className="p-2 bg-slate-950 rounded-lg text-emerald-400">
                    <Package size={16} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <FeedSection 
                    title="علف بادي"
                    bills={state.feedBillsBady || []}
                    onAdd={() => setState(prev => ({ ...prev, feedBillsBady: [...(prev.feedBillsBady || []), { id: Math.random().toString(36).substr(2, 9), company: '', weight: 50, amount: 0, quantity: 1, proteinPercentage: 23, entryDate: new Date().toISOString().split('T')[0] }] }))}
                    onRemove={(id) => {
                       const bill = (state.feedBillsBady || []).find(b => b.id === id);
                       setBillToDelete({ id, section: 'feedBillsBady', label: `علف بادي - ${bill?.company || 'بدون شركة'}` });
                    }}
                    onUpdate={(id, field, val) => setState(prev => ({ ...prev, feedBillsBady: (prev.feedBillsBady || []).map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                  />
                  <FeedSection 
                    title="علف نامي"
                    bills={state.feedBillsNamy || []}
                    onAdd={() => setState(prev => ({ ...prev, feedBillsNamy: [...(prev.feedBillsNamy || []), { id: Math.random().toString(36).substr(2, 9), company: '', weight: 50, amount: 0, quantity: 1, proteinPercentage: 21, entryDate: new Date().toISOString().split('T')[0] }] }))}
                    onRemove={(id) => {
                       const bill = (state.feedBillsNamy || []).find(b => b.id === id);
                       setBillToDelete({ id, section: 'feedBillsNamy', label: `علف نامي - ${bill?.company || 'بدون شركة'}` });
                    }}
                    onUpdate={(id, field, val) => setState(prev => ({ ...prev, feedBillsNamy: (prev.feedBillsNamy || []).map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                  />
                  <FeedSection 
                    title="علف ناهي"
                    bills={state.feedBillsNahy || []}
                    onAdd={() => setState(prev => ({ ...prev, feedBillsNahy: [...(prev.feedBillsNahy || []), { id: Math.random().toString(36).substr(2, 9), company: '', weight: 50, amount: 0, quantity: 1, proteinPercentage: 19, entryDate: new Date().toISOString().split('T')[0] }] }))}
                    onRemove={(id) => {
                       const bill = (state.feedBillsNahy || []).find(b => b.id === id);
                       setBillToDelete({ id, section: 'feedBillsNahy', label: `علف ناهي - ${bill?.company || 'بدون شركة'}` });
                    }}
                    onUpdate={(id, field, val) => setState(prev => ({ ...prev, feedBillsNahy: (prev.feedBillsNahy || []).map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center px-2">
                  <p className="text-sm font-black text-white">
                    {((state.feedBillsBady?.reduce((acc, b) => acc + toNum(b.amount), 0) || 0) + 
                      (state.feedBillsNamy?.reduce((acc, b) => acc + toNum(b.amount), 0) || 0) + 
                      (state.feedBillsNahy?.reduce((acc, b) => acc + toNum(b.amount), 0) || 0)).toLocaleString()} 
                    <span className="text-[10px] text-slate-500 font-bold ms-1">ج.م</span>
                  </p>
                  <p className="text-[10px] font-black text-slate-500 uppercase">إجمالي تكاليف الأعلاف</p>
                </div>
              </Card>

              {/* Bills Management */}
              <div className="space-y-4">
                <BillSection 
                   title="فواتير الكهرباء" 
                   bills={state.electricityBills} 
                   icon={Zap}
                   onAdd={() => setState(prev => ({ ...prev, electricityBills: [...prev.electricityBills, { id: Math.random().toString(36).substr(2, 9), label: 'بدون عنوان', amount: 0, startDay: prev.targetCycleDays, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }] }))}
                   onRemove={(id) => {
                     const bill = state.electricityBills.find(b => b.id === id);
                     setBillToDelete({ id, section: 'electricityBills', label: bill?.label || 'فاتورة كهرباء' });
                   }}
                   onUpdate={(id, field, val) => setState(prev => ({ ...prev, electricityBills: prev.electricityBills.map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                />
                <BillSection 
                   title="رواتب وأجور العمال" 
                   bills={state.laborBills || []} 
                   icon={Users}
                   onAdd={() => setState(prev => ({ ...prev, laborBills: [...(prev.laborBills || []), { id: Math.random().toString(36).substr(2, 9), label: 'مرتب عامل / مكافأة', amount: 0, startDay: prev.targetCycleDays, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }] }))}
                   onRemove={(id) => {
                     const bill = (state.laborBills || []).find(b => b.id === id);
                     setBillToDelete({ id, section: 'laborBills', label: bill?.label || 'مرتب عامل' });
                   }}
                   onUpdate={(id, field, val) => setState(prev => ({ ...prev, laborBills: (prev.laborBills || []).map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                />
                <BillSection 
                   title="فواتير المياه" 
                   bills={state.waterBills} 
                   icon={Droplets}
                   onAdd={() => setState(prev => ({ ...prev, waterBills: [...prev.waterBills, { id: Math.random().toString(36).substr(2, 9), label: 'بدون عنوان', amount: 0, startDay: prev.targetCycleDays, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }] }))}
                   onRemove={(id) => {
                     const bill = state.waterBills.find(b => b.id === id);
                     setBillToDelete({ id, section: 'waterBills', label: bill?.label || 'فاتورة مياه' });
                   }}
                   onUpdate={(id, field, val) => setState(prev => ({ ...prev, waterBills: prev.waterBills.map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                />
                <BillSection 
                   title="فواتير الأدوية" 
                   bills={state.medicationBills} 
                   icon={Activity}
                   onAdd={() => setState(prev => ({ ...prev, medicationBills: [...prev.medicationBills, { id: Math.random().toString(36).substr(2, 9), label: 'بدون عنوان', amount: 0, startDay: prev.targetCycleDays, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }] }))}
                   onRemove={(id) => {
                     const bill = state.medicationBills.find(b => b.id === id);
                     setBillToDelete({ id, section: 'medicationBills', label: bill?.label || 'فاتورة أدوية' });
                   }}
                   onUpdate={(id, field, val) => setState(prev => ({ ...prev, medicationBills: prev.medicationBills.map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                />
                <BillSection 
                   title="فواتير أخرى" 
                   bills={state.otherBills} 
                   icon={Banknote}
                   onAdd={() => setState(prev => ({ ...prev, otherBills: [...prev.otherBills, { id: Math.random().toString(36).substr(2, 9), label: 'مصاريف أخرى', amount: 0, startDay: prev.targetCycleDays, endDay: 1, entryDate: new Date().toISOString().split('T')[0] }] }))}
                   onRemove={(id) => {
                     const bill = state.otherBills.find(b => b.id === id);
                     setBillToDelete({ id, section: 'otherBills', label: bill?.label || 'فاتورة أخرى' });
                   }}
                   onUpdate={(id, field, val) => setState(prev => ({ ...prev, otherBills: prev.otherBills.map(b => b.id === id ? { ...b, [field]: val } : b) }))}
                />

                {/* Mortality Tracking Section */}
                <div className="bg-slate-900 border-white/5 p-6 rounded-3xl space-y-6 text-right">
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        mortalityBills: [...prev.mortalityBills, { id: Math.random().toString(36).substr(2, 9), label: 'سجل نافق', count: 1, ageAtDeath: prev.age, amount: 0 }] 
                      }))}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      تسجيل نافق
                    </button>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">تكاليف النافق (مرتبطة بالاستهلاك)</h3>
                      <div className="p-2 bg-slate-950 rounded-lg text-red-400">
                        <AlertTriangle size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {state.mortalityBills.map(mort => {
                      const age = toNum(mort.ageAtDeath);
                      const statsAtDeath = getDailyStats(state.strain, age);
                      const feedCost = (statsAtDeath.cumFeed / 1000) * toNum(state.feedPrice);
                      const resourcesCost = calculateMortalityOverhead(age);
                      const individualCost = toNum(state.chickPrice) + feedCost + resourcesCost;
                      const totalLoss = individualCost * toNum(mort.count);

                      return (
                        <div key={mort.id} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBillToDelete({ id: mort.id, section: 'mortalityBills', label: mort.label || 'سجل نافق' });
                              }}
                              className="p-2 text-slate-600 hover:text-red-500 transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                            <input 
                              type="text"
                              value={mort.label ?? ''}
                              onChange={e => setState(prev => ({ ...prev, mortalityBills: prev.mortalityBills.map(m => m.id === mort.id ? { ...m, label: e.target.value } : m) }))}
                              className="bg-transparent text-xs font-black text-red-500 text-right outline-none w-1/2"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1 text-center">
                              <label className="text-[9px] font-black text-slate-600 uppercase">العدد</label>
                              <input 
                                type="number"
                                value={mort.count ?? 1}
                                onChange={e => setState(prev => ({ ...prev, mortalityBills: prev.mortalityBills.map(m => m.id === mort.id ? { ...m, count: e.target.value } : m) }))}
                                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-black text-white text-center"
                              />
                            </div>
                            <div className="flex flex-col gap-1 text-center">
                              <label className="text-[9px] font-black text-slate-600 uppercase">العمر عند النفوق</label>
                              <input 
                                type="number"
                                value={mort.ageAtDeath ?? 1}
                                onChange={e => setState(prev => ({ ...prev, mortalityBills: prev.mortalityBills.map(m => m.id === mort.id ? { ...m, ageAtDeath: e.target.value } : m) }))}
                                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-black text-white text-center"
                              />
                            </div>
                            <div className="flex flex-col gap-1 text-center relative">
                              <label className="text-[9px] font-black text-slate-600 uppercase flex items-center justify-center gap-1">
                                الخسارة
                                <div className="group/tooltip relative" tabIndex={0}>
                                  <AlertTriangle size={10} className="text-red-400 cursor-help" />
                                  <motion.div 
                                    drag
                                    dragMomentum={false}
                                    dragElastic={0.1}
                                    className="invisible group-hover/tooltip:visible group-focus/tooltip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl z-50 text-[10px] text-right pointer-events-auto ring-1 ring-white/5 cursor-move"
                                  >
                                    <p className="text-emerald-400 mb-3 font-black border-b border-white/10 pb-2 text-xs">تحليل تكلفة النافق الدقيق:</p>
                                    <div className="space-y-2.5 text-slate-300 pointer-events-none">
                                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg px-3">
                                        <span className="text-white font-mono text-xs">{toNum(state.chickPrice).toFixed(2)} ج.م</span>
                                        <span className="font-bold">سعر الكتكوت:</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg px-3">
                                        <span className="text-white font-mono text-xs">{((getDailyStats(state.strain, toNum(mort.ageAtDeath)).cumFeed / 1000) * toNum(state.feedPrice)).toFixed(2)} ج.م</span>
                                        <span className="font-bold">تكلفة العلف:</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg px-3">
                                        <span className="text-white font-mono text-xs">{calculateMortalityOverhead(toNum(mort.ageAtDeath)).toFixed(2)} ج.م</span>
                                        <span className="font-bold">نصيب الفواتير:</span>
                                      </div>
                                      
                                      <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="flex justify-between items-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                          <span className="text-red-400 font-mono text-sm">{individualCost.toFixed(2)} ج.م</span>
                                          <span className="font-black text-red-100 italic">إجمالي الخسارة للفرد:</span>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              </label>
                              <div className="bg-slate-900 border border-red-500/20 rounded-lg px-3 py-2 text-xs font-black text-red-400 text-center">
                                {totalLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 flex gap-4 items-start">
                     <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                        <AlertCircle size={20} />
                     </div>
                     <div className="text-right">
                        <h4 className="text-xs font-black text-white mb-1">توجيهات المساحة والتهوية</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          في النظم الحديثة ذات العلافات الخارجية وخطوط النبل المعلقة، تزداد السعة الاستيعابية للمساحة الصافية بنسبة 15% نظراً لعدم وجود إشغالات داخل الدور، مما يحسن من حركة الطيور وتوزيع الهواء.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

          {screen === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="space-y-6 pb-24"
            >
              <header className="flex items-center justify-between px-2 py-4 border-b border-white/5 bg-slate-900/40 -mx-4 sm:-mx-6 mb-6">
                <div className="flex items-center gap-4 px-4 sm:px-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <LayoutDashboard size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">لوحة التحكم</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 grayscale opacity-70">
                      نظرة عامة على أداء القطيع
                    </p>
                  </div>
                </div>
                <div className="px-4 sm:px-6 flex items-center gap-2">
                </div>
              </header>

              <div className="grid grid-cols-2 gap-4">
                <Stat 
                  label="إجمالي العلف" 
                  value={dailyFeedTotal.toFixed(0)} 
                  unit="كجم" 
                  icon={PieChartIcon} 
                  color="text-amber-400" 
                  subLabel="للطائر الواحد"
                  subValue={`${dailyStats.dailyFeed} جم`}
                />
                <Stat 
                  label="إجمالي الماء" 
                  value={dailyWaterTotalLiters} 
                  unit="لتر" 
                  icon={Droplets} 
                  color="text-blue-400" 
                  subLabel="للطائر الواحد"
                  subValue={`${Math.round(dailyStats.dailyWater * (climateInfo.waterFactor / 1.8))} مل`}
                />
                <Stat 
                  label="متوسط الوزن" 
                  value={dailyStats.weight} 
                  unit="جم" 
                  icon={ScaleIcon} 
                  color={dailyStats.isScientific ? "text-blue-400" : (dailyStats as any).status === 'excellent' ? "text-emerald-400" : "text-amber-400"}
                  subLabel="المعيار الدولي"
                  subValue={`${(dailyStats as any).standardWeight} جم`}
                  onClick={() => {
                    setWeightInput(String(state.weightLogs?.[String(toNum(state.age))] || ''));
                    setIsWeightModalOpen(true);
                  }}
                />
                <Stat 
                  label="الكتلة الحيوية" 
                  value={Math.floor(herdBiomass)} 
                  unit={
                    <>
                      كجم
                      {Math.round((herdBiomass % 1) * 1000) > 0 && (
                        <>
                          <span className="mx-1">و</span>
                          <span className="text-cyan-400 font-black">
                            {Math.round((herdBiomass % 1) * 1000)} جم
                          </span>
                        </>
                      )}
                    </>
                  } 
                  icon={ContainerIcon} 
                  color="text-purple-400" 
                />
                <Stat 
                  label="ساعات الإظلام" 
                  value={lightingSchedule.darknessHours} 
                  unit="ساعة" 
                  icon={Clock} 
                  color="text-indigo-400" 
                  subLabel="بداية من"
                  subValue={(() => {
                    const [h, m] = lightingSchedule.darknessStart.split(':').map(Number);
                    const displayH = h % 12 || 12;
                    const period = h >= 12 ? 'م' : 'ص';
                    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
                  })()}
                />
                <Stat 
                  label="الحرارة المطلوبة" 
                  value={targetTemp} 
                  unit="°م" 
                  icon={Thermometer} 
                  color="text-rose-400" 
                  subLabel="حسب العمر"
                  subValue={`${toNum(state.age)} يوم`}
                />
              </div>

              {/* KPI Quick View */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  onClick={() => setScreen('charts')}
                  className="p-6 bg-slate-900/40 border-slate-800 relative group overflow-hidden cursor-pointer hover:bg-slate-900/60 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <TrendingUp size={20} />
                    </div>
                    <div className="text-right">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">متوسط الزيادة (ADG)</h4>
                      <p className="text-[9px] text-emerald-500/50 italic">جم / يوم</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 justify-end mb-4">
                    <span className="text-4xl font-black text-white tabular-nums">{kpis.adg}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">جم</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[9px] font-bold text-slate-500">المعيار: {kpis.standardAdg}</span>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                      parseFloat(kpis.adg) >= parseFloat(kpis.standardAdg) ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    )}>
                      {parseFloat(kpis.adg) >= parseFloat(kpis.standardAdg) ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {Math.abs(parseFloat(kpis.adg) - parseFloat(kpis.standardAdg)).toFixed(1)}
                    </div>
                  </div>
                </Card>

                <Card 
                  onClick={() => setScreen('charts')}
                  className="p-6 bg-slate-900/40 border-slate-800 relative group overflow-hidden cursor-pointer hover:bg-slate-900/60 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Zap size={20} />
                    </div>
                    <div className="text-right">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">معامل التحويل (FCR)</h4>
                      <p className="text-[9px] text-blue-500/50 italic">الكفاءة الغذائية</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-end mb-4">
                    <span className="text-4xl font-black text-white tabular-nums">{kpis.fcr}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[9px] font-bold text-slate-500">المعيار: {kpis.standardFcr}</span>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                      parseFloat(kpis.fcr) <= parseFloat(kpis.standardFcr) ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {parseFloat(kpis.fcr) <= parseFloat(kpis.standardFcr) ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                      {Math.abs(parseFloat(kpis.fcrDiff)).toFixed(3)}
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="bg-slate-900 border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                      <Thermometer size={16} className="text-orange-400" />
                      المناخ المستهدف
                    </h3>
                    <span className="text-[10px] font-bold text-blue-400">
                      الوضع الحالي: {state.climate}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-500">العمر: {state.age} يوم</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">حرارة الهدف</p>
                      <Thermometer size={12} className="text-orange-400" />
                    </div>
                    <p className="text-3xl font-black text-white">{targetTemp}°م</p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-[75%]" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500">مثالي</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">رطوبة الهدف</p>
                      <Droplets size={12} className="text-blue-400" />
                    </div>
                    <p className="text-3xl font-black text-white">{targetHumidity.min}-{targetHumidity.max}%</p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 w-[60%]" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500">متوازن</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-start gap-4 relative z-10">
                  <div className="bg-indigo-500/20 p-2 rounded-xl flex-shrink-0">
                    <Clock size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-col items-center gap-4 mb-4">
                      <div className="flex items-center justify-between w-full px-2">
                        <button 
                          onClick={() => setState(prev => ({ ...prev, isCustomDarkness: !prev.isCustomDarkness }))}
                          className={cn(
                            "text-[8px] font-black px-2 py-1 rounded-lg border transition-all uppercase tracking-widest",
                            state.isCustomDarkness 
                              ? "bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]" 
                              : "bg-slate-800 border-white/5 text-slate-500"
                          )}
                        >
                          {state.isCustomDarkness ? 'يدوي (Custom)' : 'تلقائي (Auto)'}
                        </button>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest text-right">برنامج الإضاءة (علمي)</p>
                      </div>
                      
                      <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 w-full max-w-[200px] mx-auto flex flex-col items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10 transition-all duration-300">
                          {lightingSchedule.triggers.map((trigger) => (
                            <div 
                              key={trigger.type} 
                              className={cn(
                                "w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center border border-white/5 shadow-lg",
                                trigger.color.replace('text-', 'shadow-').split(' ')[0] + "/10"
                              )}
                            >
                              <trigger.icon size={10} className={trigger.color} />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-center gap-1.5 w-full">
                          <span className="text-[8px] font-black text-slate-500 uppercase">من</span>
                          <input 
                            type="time" 
                            value={state.darknessStart ?? '23:00'}
                            onChange={(e) => setState(prev => ({ ...prev, darknessStart: e.target.value }))}
                            className="bg-indigo-500/20 text-xs font-black text-white px-3 py-2 rounded-xl border border-indigo-500/30 focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer w-full text-center"
                          />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5 w-full">
                          <span className="text-[8px] font-black text-slate-500 uppercase">إلى</span>
                          <input 
                            type="time" 
                            value={lightingSchedule.darknessEnd}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              const [sh, sm] = (state.darknessStart ?? '23:00').split(':').map(Number);
                              const [eh, em] = val.split(':').map(Number);
                              let durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
                              if (durationMinutes < 0) durationMinutes += 1440;
                              setState(prev => ({ ...prev, darknessHours: durationMinutes / 60, isCustomDarkness: true }));
                            }}
                            className="bg-indigo-500/20 text-xs font-black text-white px-3 py-2 rounded-xl border border-indigo-500/30 focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer w-full text-center"
                          />
                        </div>

                        <div className="mt-1 pt-3 border-t border-white/5 w-full flex flex-col items-center gap-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase">مدة الإظلام (ساعة)</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              min="0"
                              max="23"
                              step="0.5"
                              value={state.isCustomDarkness ? (state.darknessHours ?? '') : lightingSchedule.recommendedHours}
                              readOnly={!state.isCustomDarkness}
                              onChange={(e) => setState(prev => ({ ...prev, darknessHours: e.target.value, isCustomDarkness: true }))}
                              className={cn(
                                "p-2 rounded-xl text-center font-black text-lg w-20 border outline-none transition-all",
                                state.isCustomDarkness 
                                  ? "bg-slate-950 border-amber-500/50 text-amber-400" 
                                  : "bg-indigo-500/10 border-indigo-500/30 text-white"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="w-full space-y-2">
                        <div className="flex justify-center">
                          <span className="text-[10px] font-black text-white bg-indigo-500/20 px-4 py-1.5 rounded-full border border-indigo-500/10 whitespace-nowrap">
                            {lightingSchedule.totalLight} ساعة ضوء : {toNum(lightingSchedule.darknessHours).toFixed(1)} ساعة إظلام
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-4 py-1">
                          <button 
                            onClick={() => setState(prev => ({ ...prev, isDarknessLinkedToTemp: !prev.isDarknessLinkedToTemp }))}
                            className={cn(
                              "flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-md border transition-all",
                              state.isDarknessLinkedToTemp ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-slate-900 border-white/5 text-slate-600"
                            )}
                          >
                            <Thermometer size={10} />
                            ربط بالحرارة
                          </button>
                          <button 
                            onClick={() => setState(prev => ({ ...prev, isDarknessLinkedToMed: !prev.isDarknessLinkedToMed }))}
                            className={cn(
                              "flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-md border transition-all",
                              state.isDarknessLinkedToMed ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-slate-900 border-white/5 text-slate-600"
                            )}
                          >
                            <Stethoscope size={10} />
                            ربط بالعلاج
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-3 flex flex-col items-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <Calendar size={14} className="text-blue-400 opacity-60" />
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center italic opacity-90">{lightingSchedule.ageReason}</p>
                      </div>
                      {lightingSchedule.tempReason && (
                        <div className="flex flex-col items-center gap-1 pt-2 border-t border-white/5 w-full">
                          <Thermometer size={14} className="text-red-400 opacity-60" />
                          <p className="text-[11px] text-red-300 font-bold leading-relaxed text-center">{lightingSchedule.tempReason}</p>
                        </div>
                      )}
                      {lightingSchedule.medReason && (
                        <div className="flex flex-col items-center gap-1 pt-2 border-t border-white/5 w-full">
                          <Stethoscope size={14} className="text-amber-400 opacity-60" />
                          <p className="text-[11px] text-amber-300 font-bold leading-relaxed text-center">{lightingSchedule.medReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Broiler Lighting Program Alert Block */}
                    <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/20 text-right space-y-2.5 w-full mt-3" dir="rtl">
                      <div className="flex items-center gap-2 justify-start text-indigo-400">
                        <Info size={14} className="text-indigo-400 flex-shrink-0" />
                        <span className="text-[11px] font-black tracking-wide uppercase">دليل برنامج الإظلام المعتمد</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-300 leading-relaxed font-bold">
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) >= 1 && toNum(state.age) <= 3 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>من اليوم الأول حتى اليوم الثالث:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 24 ساعة (إظلام 0 ساعة)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) >= 4 && toNum(state.age) <= 6 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>من اليوم الرابع حتى اليوم السابع:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 23 ساعة (إظلام ساعة واحدة)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) >= 7 && toNum(state.age) <= 15 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>من اليوم السابع حتى اليوم 15:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 20 ساعة (إظلام 4 ساعات)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) >= 16 && toNum(state.age) <= 28 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>من اليوم 16 حتى اليوم 28:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 18 ساعة (إظلام 6 ساعات)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) === 29 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>اليوم 29:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 20 ساعة (إظلام 4 ساعات)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) === 30 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>اليوم 30:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 21 ساعة (إظلام 3 ساعات)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) === 31 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>اليوم 31:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 22 ساعة (إظلام ساعتان)</span>
                        </div>
                        <div className={cn("flex justify-between items-center px-2 py-1 rounded transition-colors", toNum(state.age) >= 32 && toNum(state.age) <= 34 ? "bg-indigo-500/20 text-white font-extrabold border border-indigo-500/30" : "opacity-75")}>
                          <span>من اليوم 32 حتى اليوم 34:</span>
                          <span className="bg-slate-950/60 px-2 py-0.5 rounded text-indigo-300">إضاءة 23 ساعة (إظلام ساعة واحدة)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">تحليل الأداء وفقاً للوزن الحالي</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 overflow-hidden relative group text-right">
                <div className="absolute top-0 left-0 p-8 text-slate-800 group-hover:text-slate-700 transition-colors">
                  <LayoutDashboard size={80} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6 opacity-60">
                    <LayoutDashboard size={16} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">أبعاد العنبر</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">الطول</p>
                      <p className="text-xl font-black text-white">{state.barnLength}م</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">العرض</p>
                      <p className="text-xl font-black text-white">{state.barnWidth}م</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">الارتفاع</p>
                      <p className="text-xl font-black text-white">{state.barnHeight}م</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[12px] font-black text-white">{(toNum(state.barnLength) * toNum(state.barnWidth) * toNum(state.barnHeight)).toLocaleString()} م³</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">حجم الهواء الكلي</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-8 overflow-hidden relative group text-right">
                <div className="absolute top-0 left-0 p-8 text-slate-800 group-hover:text-slate-700 transition-colors">
                  <Wind size={80} />
                </div>
                <div className="relative z-10 w-full space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Wind size={12} className="text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">التهوية اللازمة (للحرارة)</span>
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">{Math.round(environmentalLoad.requiredAirflow).toLocaleString()} م³/س</span>
                  </div>
                  
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Wind size={12} className="text-blue-400" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">التهوية الدنيا (للطيور)</span>
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">{minVentilation.toLocaleString()} م³/س</span>
                  </div>

                  <div className="mt-8 flex gap-2">
                    <div className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest">حمولة اللحم: {Math.round(herdBiomass).toLocaleString()} كجم</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {screen === 'battery' && (
            <motion.div 
              key="battery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-2">
                    {activeBatteryGroup && (
                      <button 
                        onClick={() => {
                          if (activeBatteryIdx !== null) {
                            setActiveBatteryIdx(null);
                          } else {
                            setActiveBatteryGroup(null);
                          }
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all ml-1"
                      >
                        <ChevronRight size={20} />
                      </button>
                    )}
                    <h2 className="text-2xl font-black text-white tracking-tight">البطاريات</h2>
                  </div>
                  <p className="text-slate-500 text-xs font-bold mt-1">
                    {!activeBatteryGroup ? 'إدارة مجموعات البطاريات' : (activeBatteryIdx === null ? 'إدارة الوحدات الفردية' : 'توزيع الطيور وإدارة الأدوار')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/5 order-2 sm:order-1 w-full sm:w-auto">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, distributionMode: 'sequential' }))}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest flex-1 sm:flex-none",
                        state.distributionMode === 'sequential' ? "bg-purple-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      توزيع متسلسل
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, distributionMode: 'equal' }))}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest flex-1 sm:flex-none",
                        state.distributionMode === 'equal' ? "bg-purple-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      توزيع متساوي
                    </button>
                  </div>
                  <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                          const chicksNum = toNum(state.totalChicks);
                          const distributed = autoDistributeByGroup(
                            chicksNum,
                            toNum(state.age),
                            state.externalEquipment
                          );
                          setState(prev => ({
                            ...prev,
                            dailyBatteryGroupTierCounts: {
                              ...(prev.dailyBatteryGroupTierCounts || {}),
                              [String(prev.age)]: distributed
                            }
                          }));
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-xl transition-all border border-purple-500/20 text-[10px] font-black uppercase tracking-widest"
                      >
                        <RefreshCw size={14} />
                        تعبئة تلقائية للكل
                      </button>
                      {activeBatteryGroup && (
                        <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
                          <Layers size={21} />
                        </div>
                      )}
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5 bg-slate-900/60 border-white/5 backdrop-blur-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                      <LayoutGrid size={14} className="text-purple-400" />
                      إجمالي البطاريات
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-slate-500">الوحدات</p>
                        <h4 className="text-lg font-black text-white">
                          {totalBatteryCount}
                        </h4>
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <p className="text-[10px] font-bold text-slate-500">المساحة</p>
                        <h4 className="text-lg font-black text-slate-300">
                          {totalBatteryArea.toFixed(1)} م²
                        </h4>
                      </div>
                    </div>
                  </Card>

                <Card className="p-5 bg-slate-900/60 border-white/5 backdrop-blur-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    <Bird size={14} className="text-emerald-400" />
                    حالة التسكين
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-slate-500">إجمالي</p>
                      <h4 className="text-lg font-black text-white">{toNum(state.totalChicks).toLocaleString()}</h4>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <p className="text-[10px] font-bold text-slate-500">المتبقي</p>
                      <h4 className={cn(
                        "text-lg font-black",
                        totalDistributedBirds > toNum(state.totalChicks) ? "text-red-400" : (toNum(state.totalChicks) - totalDistributedBirds < 1 ? "text-emerald-400" : "text-orange-400")
                      )}>
                        {Math.max(0, toNum(state.totalChicks) - totalDistributedBirds).toLocaleString()}
                      </h4>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-slate-900/60 border-white/5 backdrop-blur-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    <Calendar size={14} className="text-blue-400" />
                    العمر
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-slate-500">اليوم</p>
                      <h4 className="text-lg font-black text-white">{state.age}</h4>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <p className="text-[10px] font-bold text-slate-500">الوزن المتوقع</p>
                      <h4 className="text-lg font-black text-slate-300">{(dailyStats.weight || 0).toLocaleString()} جم</h4>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-slate-900/60 border-white/5 backdrop-blur-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    <Activity size={14} className="text-amber-400" />
                    كثافة التسكين
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-slate-500">المعيار</p>
                      <h4 className="text-lg font-black text-white">{densityPerM2At(toNum(state.age))}</h4>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <p className="text-[10px] font-bold text-slate-500">السعة</p>
                      <h4 className="text-lg font-black text-slate-300">{(totalBatteryArea * densityPerM2At(toNum(state.age)) * (state.externalEquipment ? 1.15 : 1)).toFixed(0)}</h4>
                    </div>
                  </div>
                </Card>
              </div>

              {/* LEVEL 1: Groups List */}
              {!activeBatteryGroup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(state.batteryGroups || []).map((group, gIdx) => {
                    const currentAge = String(state.age);
                    const dayData = state.dailyBatteryGroupTierCounts?.[currentAge] || {};
                    
                    let groupDistributed = 0;
                    for (let i = 0; i < toNum(group.count); i++) {
                      const birds = dayData[`${group.id}_${i}`] || [];
                      groupDistributed += toNum(birds.reduce((accValue: number, currentVal: any) => accValue + toNum(currentVal), 0));
                    }

                    const density = densityPerM2At(toNum(state.age));
                    const mult = state.externalEquipment ? 1.15 : 1;
                    const groupCapacity = Math.floor(toNum(group.length) * toNum(group.width) * density * mult * toNum(group.tiers) * toNum(group.count));
                    const utilization = Math.min(100, Math.round((groupDistributed / (groupCapacity || 1)) * 100));

                    return (
                      <motion.button
                        key={group.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setActiveBatteryGroup(group.id)}
                        className="bg-slate-900/60 border border-white/5 hover:border-purple-500/40 p-6 rounded-[32px] text-right transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 opacity-0 group-hover:opacity-100 transition-all" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                              <Layers size={28} />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white">{group.name || `المجموعة ${gIdx + 1}`}</h3>
                              <p className="text-slate-500 text-xs font-bold mt-1">تتكون من {group.count} وحدات بطاريات</p>
                            </div>
                          </div>
                          <ChevronLeft className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-[-4px] transition-all" size={24} />
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">الطيور الموزعة</p>
                            <h4 className="text-2xl font-black text-white tabular-nums">{groupDistributed.toLocaleString()}</h4>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">السعة المستهدفة</p>
                            <h4 className="text-2xl font-black text-slate-400 tabular-nums">{groupCapacity.toLocaleString()}</h4>
                          </div>
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                          <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                             <div 
                               className={cn(
                                 "h-full transition-all duration-1000",
                                 groupDistributed > groupCapacity ? "bg-red-500" : "bg-purple-600"
                               )}
                               style={{ width: `${utilization}%` }}
                             />
                          </div>
                          <span className="text-xs font-black text-white">{utilization}%</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {!activeBatteryGroup && totalBatteries >= 2 && (
                <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[32px] space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
                        <Droplets size={22} className="animate-pulse" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-white text-base">توزيع مياه الشرب اليومية على البطاريات 💧</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">توزيع ذكي وتلقائي للمياه بحسب العدد الفعلي للكتاكيت في كل بطارية لضمان دقة الرطوبة والري</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] font-mono font-bold text-slate-300">
                      إجمالي المياه: <span className="text-cyan-400 font-black">{dailyWaterTotalLiters} لتر</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {batteryWaterDistribution.units.map((unit, idx) => (
                      <div key={idx} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{unit.unitName}</span>
                          <span className="text-[10px] font-bold text-slate-400">({unit.birdsCount} طائر)</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${unit.percentage}%` }} />
                          </div>
                          <span className="text-xs font-black text-cyan-400 font-mono tracking-tight shrink-0">{unit.waterLiters} لتر ({(unit.percentage || 0).toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEVEL 2: Batteries Grid in Group */}
              {activeBatteryGroup && activeBatteryIdx === null && (
                <div className="space-y-6">
                  {(() => {
                    const group = (state.batteryGroups || []).find(g => g.id === activeBatteryGroup);
                    if (!group) return null;
                    const count = toNum(group.count);
                    const currentAge = String(state.age);
                    const dayData = state.dailyBatteryGroupTierCounts?.[currentAge] || {};

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Array.from({ length: count }).map((_, bIdx) => {
                          const birds = dayData[`${group.id}_${bIdx}`] || [];
                          const sum = toNum(birds.reduce((accValue: number, currentVal: any) => accValue + toNum(currentVal), 0));
                          const density = densityPerM2At(toNum(state.age));
                          const mult = state.externalEquipment ? 1.15 : 1;
                          const capacity = Math.floor(toNum(group.length) * toNum(group.width) * density * mult * toNum(group.tiers));
                          const util = Math.min(100, Math.round((sum / (capacity || 1)) * 100));

                          // Battery States
                          const bKey = `${group.id}_${bIdx}`;
                          const isAutoFilled = sum > 0;
                          const isManuallyActivated = state.manuallyActivatedBatteries?.[bKey];
                          const batteryState = isAutoFilled ? 'auto' : (isManuallyActivated ? 'manual' : 'inactive');

                          return (
                            <motion.button
                              key={bIdx}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (batteryState === 'inactive') {
                                  setActivationCandidate({ groupId: group.id, bIdx });
                                } else {
                                  setActiveBatteryIdx(bIdx);
                                }
                              }}
                              className={cn(
                                "bg-slate-900/60 border p-4 rounded-3xl flex flex-col items-center gap-3 transition-all relative overflow-hidden",
                                batteryState === 'auto' ? "border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5" :
                                batteryState === 'manual' ? "border-white/20 hover:border-white/40 bg-slate-800/80 shadow-lg shadow-white/5" :
                                "border-white/5 opacity-50 hover:opacity-80 grayscale"
                              )}
                            >
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                batteryState === 'auto' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" :
                                batteryState === 'manual' ? "bg-white text-slate-900 shadow-lg shadow-white/10" : 
                                "bg-slate-800 text-slate-600"
                              )}>
                                {batteryState === 'auto' ? <Check size={24} /> : (batteryState === 'manual' ? <Box size={24} /> : <Lock size={24} />)}
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] font-black text-white block">بطارية {bIdx + 1}</span>
                                <span className={cn(
                                  "text-[9px] font-bold mt-0.5 block",
                                  batteryState === 'auto' ? "text-emerald-400" : (batteryState === 'manual' ? "text-slate-300" : "text-slate-500")
                                )}>
                                  {batteryState === 'inactive' ? "غير مفعلة" : `${sum} طائر`}
                                </span>
                              </div>
                              {sum > 0 && (
                                <div className="w-full flex flex-col items-center gap-1.5 mt-1">
                                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full", sum > capacity ? "bg-red-500" : "bg-purple-500")} 
                                      style={{ width: `${util}%` }} 
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-cyan-400 flex items-center gap-1 font-mono">
                                    💧 {((sum / (batteryWaterDistribution.totalBirdsAcrossAllBatteries || 1)) * dailyWaterTotalLiters).toFixed(1)} لتر
                                  </span>
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* LEVEL 3: Battery Details (Tiers) */}
              {activeBatteryGroup && activeBatteryIdx !== null && (
                <div className="space-y-8">
                  {(() => {
                    const group = (state.batteryGroups || []).find(g => g.id === activeBatteryGroup);
                    if (!group) return null;
                    const bIdx = activeBatteryIdx;
                    const bKey = `${group.id}_${bIdx}`;
                    const currentAge = String(state.age);
                    const tierCounts = state.dailyBatteryGroupTierCounts?.[currentAge]?.[bKey] || new Array(toNum(group.tiers)).fill(0);
                    const tierFeeds = state.dailyBatteryGroupTierFeed?.[currentAge]?.[bKey] || new Array(toNum(group.tiers)).fill(0);

                    const density = densityPerM2At(toNum(state.age));
                    const mult = state.externalEquipment ? 1.15 : 1;
                    const tierCapacity = Math.floor(toNum(group.length) * toNum(group.width) * density * mult);
                    const birdsSum = tierCounts.reduce((a: number, b: any) => a + toNum(b), 0);
                    const batteryCapacity = tierCapacity * toNum(group.tiers);

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Battery Sidebar (Visual) */}
                        <div className="lg:col-span-3 space-y-4">
                           <Card className="p-6 bg-slate-900/60 border-white/5 backdrop-blur-xl rounded-[40px] flex flex-col items-center">
                              <h3 className="text-xl font-black text-white mb-6">البطارية {bIdx + 1}</h3>
                              <div className="flex flex-col-reverse gap-3 w-full">
                                {tierCounts.map((c, tIdx) => {
                                  const count = toNum(c);
                                  const pct = Math.min(100, Math.round((count / (tierCapacity || 1)) * 100));
                                  return (
                                    <div key={tIdx} className={cn(
                                      "h-24 w-full rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all overflow-hidden relative",
                                      count > tierCapacity ? "bg-red-500/10 border-red-500/30" : (count > 0 ? "bg-purple-600/10 border-purple-600/30" : "bg-slate-800/40 border-white/5")
                                    )}>
                                      <div className={cn("absolute bottom-0 left-0 w-full transition-all duration-700 bg-purple-600/20", count > tierCapacity && "bg-red-500/20")} style={{ height: `${pct}%` }} />
                                      <span className="text-[10px] font-black text-white z-10">الدور {tIdx + 1}</span>
                                      <span className="text-[16px] font-black text-white z-10 tabular-nums">{count}</span>
                                      <span className="text-[8px] font-bold text-slate-500 z-10 uppercase">السعة {tierCapacity}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">الإجمالي للتسكين</p>
                                <h4 className="text-3xl font-black text-white">{birdsSum}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">من إجمالي {batteryCapacity} طائر</p>
                              </div>

                              <button 
                                onClick={() => {
                                  // Auto-fill this specific battery
                                  const totalChicksNum = toNum(state.totalChicks);
                                  const alreadyFilledElsewhere = toNum(totalDistributedBirds) - birdsSum;
                                  let balance = Math.max(0, totalChicksNum - alreadyFilledElsewhere);

                                  const newTiers = [...tierCounts].map(() => {
                                    const amount = Math.min(balance, tierCapacity);
                                    balance -= amount;
                                    return amount;
                                  });

                                  setState(prev => ({
                                    ...prev,
                                    dailyBatteryGroupTierCounts: {
                                      ...(prev.dailyBatteryGroupTierCounts || {}),
                                      [currentAge]: {
                                        ...(prev.dailyBatteryGroupTierCounts?.[currentAge] || {}),
                                        [bKey]: newTiers
                                      }
                                    }
                                  }));
                                }}
                                className="w-full mt-6 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                              >
                                <Zap size={16} fill="currentColor" />
                                تعبئة ذكية للوحدة
                              </button>
                           </Card>
                        </div>

                        {/* Edit Area */}
                        <div className="lg:col-span-9 space-y-6">
                           <div className="flex items-center justify-between px-2">
                             <div className="flex flex-col text-right">
                               <h4 className="text-sm font-black text-white uppercase tracking-widest">إدخال البيانات التفصيلية</h4>
                               <p className="text-[10px] text-slate-500 font-bold mt-1">المساحة: {group.length}×{group.width} م لكل دور</p>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-white/5">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                 <span className="text-[10px] font-black text-slate-300">السعة الموصى بها: {tierCapacity}</span>
                               </div>
                             </div>
                           </div>

                           <div className="grid gap-4">
                             {tierCounts.map((c, tIdx) => {
                               const count = toNum(c);
                               const feed = tierFeeds[tIdx] || 0;
                               const isOver = count > tierCapacity;
                               const utilization = Math.min(100, Math.round((count / (tierCapacity || 1)) * 100));

                               return (
                                 <Card key={tIdx} className={cn(
                                   "p-0 bg-slate-900/60 border-2 backdrop-blur-xl rounded-[32px] transition-all overflow-hidden",
                                   isOver ? "border-red-500/40 shadow-lg shadow-red-500/5" : "border-white/5 shadow-xl shadow-black/20"
                                 )}>
                                   <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch">
                                      <div className={cn(
                                        "md:col-span-2 flex flex-col items-center justify-center p-6 border-l border-white/5",
                                        isOver ? "bg-red-500/5" : "bg-white/[0.02]"
                                      )}>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-lg font-black text-white shadow-inner mb-2">
                                          {tIdx + 1}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">
                                          {tIdx === 0 ? 'الأرضي' : (tIdx === 1 ? 'الأوسط' : (tIdx === 2 ? 'العلوي' : `رقم ${tIdx + 1}`))}
                                        </p>
                                      </div>

                                      <div className="md:col-span-10 p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">عدد الطيور</label>
                                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-lg", isOver ? "bg-red-500/20 text-red-400" : "bg-white/5 text-slate-500")}>
                                                كثافة: {utilization}%
                                              </span>
                                            </div>
                                            <input 
                                              type="text"
                                              inputMode="numeric"
                                              value={c ?? ''}
                                              onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                const numericVal = toNum(val);
                                                
                                                // Check if this update would exceed total chicks
                                                const otherBirds = toNum(totalDistributedBirds) - count;
                                                const finalVal = Math.min(numericVal, toNum(state.totalChicks) - otherBirds);
                                                const safeVal = finalVal < 0 ? 0 : finalVal;

                                                const newTiers = [...tierCounts];
                                                newTiers[tIdx] = safeVal;
                                                setState(prev => ({
                                                  ...prev,
                                                  dailyBatteryGroupTierCounts: {
                                                    ...(prev.dailyBatteryGroupTierCounts || {}),
                                                    [currentAge]: {
                                                      ...(prev.dailyBatteryGroupTierCounts?.[currentAge] || {}),
                                                      [bKey]: newTiers
                                                    }
                                                  }
                                                }));
                                              }}
                                              className={cn(
                                                "w-full bg-slate-950/80 border rounded-2xl px-6 py-4 text-2xl font-black text-white focus:outline-none transition-all text-center",
                                                isOver ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-white/10 focus:border-purple-500"
                                              )}
                                              placeholder="0"
                                            />
                                          </div>

                                          <div className="space-y-3">
                                             <div className="flex items-center justify-between px-1">
                                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">العلف (كجم)</label>
                                               <button 
                                                  disabled={count === 0}
                                                  onClick={() => {
                                                    const targetVal = ((count * (dailyStats.dailyFeed || 0)) / 1000).toFixed(2);
                                                    const newFeeds = [...tierFeeds];
                                                    newFeeds[tIdx] = targetVal;
                                                    setState(prev => ({
                                                      ...prev,
                                                      dailyBatteryGroupTierFeed: {
                                                        ...(prev.dailyBatteryGroupTierFeed || {}),
                                                        [currentAge]: {
                                                          ...(prev.dailyBatteryGroupTierFeed?.[currentAge] || {}),
                                                          [bKey]: newFeeds
                                                        }
                                                      }
                                                    }));
                                                  }}
                                                  className="text-emerald-500 hover:text-emerald-400 disabled:opacity-30 disabled:grayscale transition-all"
                                                  title="مقترح العلف بناءً على العدد"
                                                >
                                                  <Zap size={14} fill="currentColor" />
                                                </button>
                                             </div>
                                             <input 
                                              type="text"
                                              inputMode="decimal"
                                              value={tierFeeds[tIdx] ?? ''}
                                              onChange={e => {
                                                const val = e.target.value.replace(/[^\d.]/g, '');
                                                const newFeeds = [...tierFeeds];
                                                newFeeds[tIdx] = val;
                                                setState(prev => ({
                                                  ...prev,
                                                  dailyBatteryGroupTierFeed: {
                                                    ...(prev.dailyBatteryGroupTierFeed || {}),
                                                    [currentAge]: {
                                                      ...(prev.dailyBatteryGroupTierFeed?.[currentAge] || {}),
                                                      [bKey]: newFeeds
                                                    }
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black text-emerald-400 focus:outline-none focus:border-emerald-500 transition-all text-center"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                   </div>
                                 </Card>
                               );
                             })}
                           </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Logic Guard Info (Always visible at bottom for density reference) */}
              <div className="pt-4 border-t border-white/5">
                <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-3xl flex gap-5 items-start">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 shadow-inner">
                    <AlertCircle size={24} />
                  </div>
                  <div className="text-right">
                    <h4 className="text-[12px] font-black text-white mb-1.5 uppercase tracking-widest">معيار الكثافة الحيوي (عمر {state.age} يوم)</h4>
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                      الكثافة الموصى بها لهذا العمر هي {
                        densityPerM2At(toNum(state.age))
                      } طائر لكل متر مربع. يتم احتساب السعة المتاحة تلقائياً لكل مجموعة بطاريات بناءً على أبعادها وعدد الأدوار المتاحة بها.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Activation Modal */}
              <AnimatePresence>
                {activationCandidate && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setActivationCandidate(null)}
                      className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative w-full max-w-sm bg-slate-900 border border-white/10 p-8 rounded-[40px] shadow-2xl flex flex-col items-center text-center gap-6"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white">
                        <Box size={40} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">تفعيل البطارية</h3>
                        <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                          هذه البطارية فارغة حالياً حسب العدد الكلي للكتاكيت. هل تريد تفعيلها للإدخال اليدوي؟
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                          onClick={() => setActivationCandidate(null)}
                          className="py-4 bg-slate-800 text-white rounded-2xl font-black text-xs hover:bg-slate-700 transition-all"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={confirmActivation}
                          className="py-4 bg-purple-600 text-white rounded-2xl font-black text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                        >
                          تفعيل الآن
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

            {screen === 'weather' && (
              <motion.div
                key="weather-screen"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <WeatherScreen 
                  age={toNum(state.age)} 
                  thi={thi} 
                  targetThi={targetThi} 
                  weather={weather}
                  loading={weatherLoading}
                  error={weatherError}
                  locationName={locationName}
                  onSearch={handleWeatherSearch}
                  onRetry={handleWeatherRetry}
                  onLocationSelect={(lat, lon, name) => fetchWeather(lat, lon, name)}
                  onNavigate={setScreen}
                />
              </motion.div>
            )}

            {screen === 'market' && (
              <motion.div
                key="market-screen"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
              <MarketScreen 
                sellingPrice={state.sellingPrice} 
                prevSellingPrice={prevSellingPrice}
                lastPriceUpdateAt={state.lastPriceUpdateAt} 
                priceSource={state.priceSource}
                exchangeRates={exchangeRates}
                prevExchangeRates={prevExchangeRates}
                goldPrices={goldPrices}
                prevGoldPrices={prevGoldPrices}
                eggPrices={eggPrices}
                prevEggPrices={prevEggPrices}
                feedPrices={feedPrices}
                prevFeedPrices={prevFeedPrices}
                chickPrices={chickPrices}
                prevChickPrices={prevChickPrices}
                loading={marketLoading}
                error={marketError}
                onRefresh={fetchMarketData}
                onNavigate={setScreen}
              />
              </motion.div>
            )}

            {screen === 'medication' && (
            <motion.div 
              key="medication"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative group/meds perspective-[2000px]"
            >
              <AnimatePresence mode="wait" initial={false} custom={flipDirection}>
                <motion.div 
                  key={`med-page-${state.age}`}
                  custom={flipDirection}
                  initial={{ opacity: 0, x: flipDirection * 100, rotateY: flipDirection * 10 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -flipDirection * 100, rotateY: -flipDirection * 10 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 350, 
                    damping: 35,
                    opacity: { duration: 0.2 }
                  }}
                  className="space-y-6 transform-gpu"
                >
              <header className="flex items-center justify-between px-0 mb-4">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 bg-red-400/10 rounded-xl flex items-center justify-center text-red-500 shadow-inner">
                    <Stethoscope size={24} />
                  </div>
                  برنامج الأدوية
                </h2>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[12px] font-black text-white bg-blue-600 px-4 py-2.5 rounded-2xl shadow-lg border border-white/10 flex items-center gap-2">
                      <Droplets size={16} />
                      إجمالي المياه {dailyWaterTotalLiters} لتر
                    </div>
                    {activeBatteriesCount >= 2 && (
                      <div className="flex flex-wrap items-center justify-end gap-1 text-[10px] font-bold text-slate-400 bg-slate-900/40 px-2.5 py-1 rounded-xl border border-white/5 mt-1">
                        <span className="text-slate-500 text-[9px] ml-1">توزيع المياه الفعلي:</span>
                        {batteryWaterDistribution.units.filter(u => u.birdsCount > 0).map((unit, idx) => {
                          const name = unit.unitName.includes(' - ') ? unit.unitName.split(' - ')[1] : unit.unitName;
                          return (
                            <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 font-black font-mono">
                              {name}: {unit.waterLiters} لتر
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            </header>

              <div className="px-0 mb-4 space-y-4">
                {/* Unified Timeline Header */}
                <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-3xl mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Zap size={18} className="text-red-500" />
                       <span className="text-sm font-black text-white">إدارة الجرعات والبرنامج العلاجي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSuggestedStartTime({ isRest: false, category: 'عام' }) && (
                        <button 
                          onClick={() => addEmergencyMed(getSuggestedStartTime({ isRest: false, category: 'عام' }) || undefined)}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black px-3 py-1.5 rounded-xl transition-colors border border-white/5"
                        >
                          <Clock size={12} className="text-amber-400" />
                          بدء بعد آخر نشاط
                        </button>
                      )}
                      <button 
                        onClick={() => addEmergencyMed()}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-colors shadow-lg shadow-red-900/20"
                      >
                        <Plus size={14} />
                        إضافة جرعة طارئة
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 p-5 rounded-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tight sm:tracking-widest block leading-tight">البرنامج العلاجي الموحد (مجدول + طارئ)</span>
                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest text-right self-end sm:self-auto">
                       <div className="flex items-center gap-1.5" title={state.isManualOverride ? "تم التعديل يدوياً" : "يتم التحديث تلقائياً"}>
                          {state.isManualOverride ? <Edit3 size={10} className="text-amber-500" /> : <RefreshCw size={10} className="text-blue-400 animate-spin-slow" />}
                          عمر القطيع: {state.age} يوم
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      if (toNum(state.age) !== 1) return null;
                      const orsTime = state.medicationLogs['1-d1-ors'] || '';
                      const violations: string[] = [];
                      
                      unifiedTimeline.forEach((item: any) => {
                        if (item.id === 'd1-ors' || !item.startTime) return;
                        if (!orsTime) {
                          violations.push(item.name || 'جرعة');
                        } else {
                          const [ih, im] = item.startTime.split(':').map(Number);
                          const [oh, om] = orsTime.split(':').map(Number);
                          if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
                            const itemMins = ih * 60 + im;
                            const orsMins = oh * 60 + om;
                            if (itemMins < orsMins) {
                              violations.push(item.name || 'جرعة');
                            }
                          }
                        }
                      });

                      if (violations.length === 0) return null;

                      return (
                        <div className="bg-gradient-to-br from-red-500/10 to-red-900/15 border border-red-500/20 p-5 rounded-3xl mb-4 text-right" dir="rtl">
                          <div className="flex items-start gap-3 justify-start">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                              <AlertTriangle size={20} />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <h4 className="text-white font-black text-xs">خطأ في ترتيب برنامج اليوم الأول ⚠️</h4>
                              <p className="text-red-200/80 text-[10px] font-bold leading-relaxed">
                                محلول معالجة الجفاف في اليوم الأول هو بداية برنامج العلاج، لذا لا يجب أن يكون أي دواء أو جرعة ما سابقة عليها.
                              </p>
                              <p className="text-red-300 font-bold text-[10px]">
                                {!orsTime 
                                  ? "⚠️ لم يتم تحديد وقت بدء لمحلول معالجة الجفاف بعد! يجب البدء بمحلول معالجة الجفاف أولاً."
                                  : `⚠️ الأنشطة التالية تسبق محلول معالجة الجفاف (المقرر في ${orsTime}):`
                                }
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {violations.map((v, idx) => (
                                  <span key={idx} className="bg-red-950/80 border border-red-500/20 px-2.5 py-0.5 rounded-lg text-[9px] font-black text-red-200">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {unifiedTimeline.length > 0 ? (
                      <>
                        {getDayTransitionInfo() && (
                          <div className="bg-slate-900/60 border border-slate-700/40 p-5 rounded-[2rem] mb-6 shadow-2xl relative overflow-hidden group" dir="rtl">
                             {/* Header Row */}
                             <div className="flex flex-row items-center gap-2 mb-4 justify-start">
                               <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                 <Clock size={12} />
                               </div>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">متابعة اليوم السابق</span>
                             </div>

                             {/* Info Rows */}
                             <div className="flex flex-col gap-4">
                               <div className="flex flex-row items-center justify-between w-full">
                                 <span className="text-white/50 font-black text-[12px] text-right">آخر نشاط أمس:</span>
                                 <span className="text-sky-400 font-bold text-[14px] text-left leading-tight">{getDayTransitionInfo()?.medName}</span>
                               </div>

                               <div className="flex flex-row items-center justify-between w-full">
                                 <span className="text-white/50 font-black text-[12px] text-right">انتهت بتمام الساعة:</span>
                                 <span className="text-blue-400 font-bold text-[14px] text-left leading-tight tabular-nums">{getDayTransitionInfo()?.endTimeStr}</span>
                               </div>

                               {/* Separator */}
                               <div className="h-[1px] bg-white/5 my-2" />

                               {/* Next Activity Section */}
                               <div className="flex flex-row items-center justify-between w-full">
                                 <span className="text-amber-500 font-black text-[12px] text-right">الجرعة التالية:</span>
                                 <div className="bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl">
                                   <span className="text-sky-400 font-bold text-[11px] text-left">
                                     {getDayTransitionInfo()?.nextMedName}
                                   </span>
                                 </div>
                               </div>

                               <div className="flex flex-row items-center justify-between w-full">
                                 <span className="text-amber-500 font-black text-[12px] text-right">موعد البدء:</span>
                                 <span className="text-white font-bold text-[13px] text-left tabular-nums">{getDayTransitionInfo()?.nextStartTimeStr}</span>
                               </div>
                             </div>

                             {/* Decorative Pulse (Left side) */}
                             <div className="absolute top-5 left-5">
                               <div className="relative flex items-center justify-center">
                                 <div className="absolute w-4 h-4 rounded-full bg-amber-500/10 animate-ping" />
                                 <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                               </div>
                             </div>
                          </div>
                        )}

                        {unifiedTimeline.map((item: any, i) => {
                          const nextItem = unifiedTimeline[i + 1];
                          const localNextDayFirstMed = i === unifiedTimeline.length - 1 ? nextDayFirstMed : null;
                          const itemKey = item.type === 'darkness' ? `${toNum(state.age)}-darkness` : 
                                          item.type === 'emergency' ? `emergency-${item.id}` : 
                                          `${toNum(state.age)}-${item.id || item.name}-${i}`;

                          if (item.type === 'darkness') {
                            const darknessKey = `${toNum(state.age)}-darkness`;
                            const prevAct = i > 0 ? unifiedTimeline[i - 1] : null;

                            const colors = getCategoryColorClasses('راحة', 'إظلام');
                            return (
                              <div key={itemKey} className={cn("bg-gradient-to-br from-indigo-900/20 to-slate-900 shadow-xl border-t border-white/5 p-6 rounded-3xl flex flex-col gap-5 border-s-4 overflow-hidden relative group", colors.border)}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                                
                                <div className="flex items-center justify-between relative z-10">
                                  <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(79,70,229,0.15)] group-hover:scale-110 transition-transform", colors.bg.replace('/10', '/20'), colors.text, colors.border.replace('border-s-', 'border-'))}>
                                      <Moon size={24} />
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          if (i === 0) return;
                                          const prevItem = unifiedTimeline[i - 1];
                                          const currentKey = `${toNum(state.age)}-darkness`;
                                          const prevKey = prevItem.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${prevItem.id || prevItem.name}`;
                                          const prevOrder = state.medDataOverrides?.[prevKey]?.order ?? (prevItem.originalIndex || 0);
                                          setState(prev => ({
                                            ...prev,
                                            medDataOverrides: {
                                              ...prev.medDataOverrides,
                                              [currentKey]: { ...prev.medDataOverrides?.[currentKey], order: prevOrder - 1 },
                                              [prevKey]: { ...prev.medDataOverrides?.[prevKey], order: prevOrder }
                                            }
                                          }));
                                        }}
                                        disabled={i === 0}
                                        className="text-slate-500 hover:text-white disabled:opacity-30"
                                      >
                                        <ChevronUp size={12} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (i === unifiedTimeline.length - 1) return;
                                          const nextItem = unifiedTimeline[i + 1];
                                          const currentKey = `${toNum(state.age)}-darkness`;
                                          const nextKey = nextItem.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${nextItem.id || nextItem.name}`;
                                          const nextOrder = state.medDataOverrides?.[nextKey]?.order ?? (nextItem.originalIndex || 0);
                                          setState(prev => ({
                                            ...prev,
                                            medDataOverrides: {
                                              ...prev.medDataOverrides,
                                              [currentKey]: { ...prev.medDataOverrides?.[currentKey], order: nextOrder + 1 },
                                              [nextKey]: { ...prev.medDataOverrides?.[nextKey], order: nextOrder }
                                            }
                                          }));
                                        }}
                                        disabled={i === unifiedTimeline.length - 1}
                                        className="text-slate-500 hover:text-white disabled:opacity-30"
                                      >
                                        <ChevronDown size={12} />
                                      </button>
                                    </div>
                                    <div className="text-right">
                                      <h3 className="text-base font-black text-white">{item.name}</h3>
                                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mt-1">نشاط إظلام مستقل</p>
                                    </div>
                                  </div>
                                </div>

                                {(() => {
                                   if (toNum(state.age) !== 1 || !state.medicationLogs[darknessKey]) return null;
                                   const orsTime = state.medicationLogs['1-d1-ors'] || '';
                                   const isViolation = !orsTime || (() => {
                                     const [ih, im] = state.medicationLogs[darknessKey].split(':').map(Number);
                                     const [oh, om] = orsTime.split(':').map(Number);
                                     if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) return false;
                                     return (ih * 60 + im) < (oh * 60 + om);
                                   })();
                                   if (!isViolation) return null;
                                   return (
                                     <div className="flex items-center gap-2 px-3 py-2 bg-red-400/10 border border-red-500/20 rounded-xl relative z-10 mb-2 justify-end">
                                       <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                       <p className="text-[10px] font-bold text-red-200 text-right leading-relaxed">
                                         {!orsTime 
                                           ? "تنبيه: لم يتم بدء محلول معالجة الجفاف بعد! يجب البدء بمحلول معالجة الجفاف أولاً."
                                           : `تنبيه: لا يمكن البدء قبل محلول معالجة الجفاف المقرر في الساعة (${orsTime}).`
                                         }
                                       </p>
                                     </div>
                                   );
                                 })()}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[70px]">وقت البدء:</span>
                                      <input 
                                        type="time" 
                                        value={state.medicationLogs[darknessKey] ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setState(prev => ({
                                            ...prev,
                                            medicationLogs: {
                                              ...prev.medicationLogs,
                                              [darknessKey]: val
                                            }
                                          }));
                                        }}
                                        className="bg-indigo-500/10 text-white text-sm font-black border border-indigo-500/20 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-400 transition-colors w-full text-center cursor-pointer shadow-inner"
                                      />
                                    </div>

                                    {!state.medicationLogs[darknessKey] && getSuggestedStartTime(item, prevAct) && (
                                      <div className="flex flex-col gap-1.5 pt-1">
                                        <button 
                                          onClick={() => {
                                            const suggested = getSuggestedStartTime(item, prevAct);
                                            if (suggested) {
                                              setState(prev => ({
                                                ...prev,
                                                medicationLogs: {
                                                  ...prev.medicationLogs,
                                                  [darknessKey]: suggested
                                                }
                                              }));
                                            }
                                          }}
                                          className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl transition-all group/btn shadow-lg shadow-emerald-500/10"
                                        >
                                          <div className="flex flex-col items-start gap-0.5 text-right">
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none">ربط (بعد النشاط السابق):</span>
                                            <span className="text-xs font-black text-white leading-none mt-1">
                                              {(() => {
                                                const suggested = getSuggestedStartTime(item, prevAct);
                                                if (!suggested) return '--:--';
                                                const [sh, sm] = suggested.split(':').map(Number);
                                                const sd = new Date();
                                                sd.setHours(sh, sm, 0, 0);
                                                
                                                let refTime: Date | undefined = undefined;
                                                if (prevAct && prevAct.startTime) {
                                                  const [ph, pm] = prevAct.startTime.split(':').map(Number);
                                                  const pDate = new Date();
                                                  const pDuration = prevAct.recommendedHours || toNum(prevAct.duration) || 0;
                                                  pDate.setHours(ph + pDuration, pm, 0, 0);
                                                  refTime = pDate;
                                                } else {
                                                  const { latestEndTime } = getLatestActivityEndTime();
                                                  refTime = latestEndTime || undefined;
                                                }
                                                return formatArabicTime(sd, refTime);
                                              })()}
                                            </span>
                                          </div>
                                          <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover/btn:bg-emerald-500/40 transition-colors">
                                            <Zap size={14} className="text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                                          </div>
                                        </button>
                                        {(() => {
                                          let refTime: Date | null = null;
                                          if (prevAct && prevAct.startTime) {
                                            const [ph, pm] = prevAct.startTime.split(':').map(Number);
                                            const pDate = new Date();
                                            const pDuration = prevAct.recommendedHours || toNum(prevAct.duration) || 0;
                                            pDate.setHours(ph + pDuration, pm, 0, 0);
                                            refTime = pDate;
                                          } else {
                                            const { latestEndTime } = getLatestActivityEndTime();
                                            refTime = latestEndTime;
                                          }
                                          if (refTime && (refTime.getHours() < 5 && refTime.getHours() >= 0)) {
                                            return <span className="text-[10px] font-black text-[#00EEEE] text-center">* ممتدة من اليوم السابق</span>;
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-3 bg-slate-950/40 px-4 py-3 rounded-2xl border border-white/5 shadow-xl">
                                      <span className="text-sm font-black text-indigo-400">فترة إظلام لمدة</span>
                                      <input 
                                        type="text"
                                        inputMode="decimal"
                                        value={state.medDataOverrides?.[darknessKey]?.duration ?? item.recommendedHours}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            setState(prev => ({
                                              ...prev,
                                              medDataOverrides: {
                                                ...prev.medDataOverrides,
                                                [darknessKey]: { ...prev.medDataOverrides?.[darknessKey], duration: val }
                                              }
                                            }));
                                          }
                                        }}
                                        className="w-12 bg-transparent text-white text-[15px] font-black focus:outline-none text-center border-b border-indigo-500/30"
                                        placeholder={String(lightingSchedule.darknessHours)}
                                      />
                                      <span className="text-sm font-black text-indigo-400">ساعة</span>
                                    </div>
                                  </div>

                                  <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 flex flex-col justify-center gap-3">
                                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed text-right italic opacity-80 border-r-2 border-indigo-500/30 pr-3">
                                      {lightingSchedule.ageReason}
                                    </p>
                                    {(lightingSchedule.tempReason || lightingSchedule.medReason) && (
                                      <div className="space-y-1">
                                        {lightingSchedule.tempReason && <p className="text-[9px] text-red-300 font-bold text-right">{lightingSchedule.tempReason}</p>}
                                        {lightingSchedule.medReason && <p className="text-[9px] text-amber-300 font-bold text-right">{lightingSchedule.medReason}</p>}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {item.startTime && (i < unifiedTimeline.length - 1 || localNextDayFirstMed) && (
                                  <div className="mt-2 px-5 py-4 bg-indigo-500/10 rounded-2xl flex flex-col gap-3 border border-indigo-500/10 relative z-10" dir="rtl">
                                    {(() => {
                                      const nextAct = nextItem || localNextDayFirstMed;
                                      const nextInfo = getNextTime(item.startTime, item, nextAct, nextAct === localNextDayFirstMed);
                                      if (!nextInfo) return null;
                                      
                                      return (
                                        <>
                                          <div className="flex items-start justify-between gap-3 text-right">
                                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest pt-0.5">موعد الانتهاء:</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {item.isSpanningMidnight && <Moon size={14} className="text-indigo-400" />}
                                              <span className={cn("text-sm font-black tabular-nums", item.isSpanningMidnight ? "text-indigo-300" : "text-indigo-400")}>
                                                {nextInfo.endTimeStr}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex flex-col border-t border-indigo-500/10 pt-3 gap-1.5 text-right">
                                            <div className="flex items-center gap-2">
                                              <Clock size={12} className="text-indigo-400 shrink-0" />
                                              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">
                                                {i === unifiedTimeline.length - 1 ? "أول جرعة غداً (" + (toNum(state.age) + 1) + "):" : nextInfo.label + " (" + nextAct.name + "):"}
                                              </span>
                                            </div>
                                            <div className="text-sm font-black text-indigo-400 tabular-nums pr-5">
                                              {nextInfo.nextStartTimeStr}
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (item.type === 'emergency') {
                            const med = item;
                            const colors = getCategoryColorClasses('طوارئ', med.name);

                            return (
                              <div key={med.id} className={cn("bg-slate-900/80 border border-white/5 p-5 rounded-3xl relative group border-s-4 transition-all hover:bg-slate-800/90 shadow-xl", colors.border)}>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBillToDelete({ id: med.id, section: 'emergencyMeds', label: med.name || 'جرعة طوارئ' });
                  }}
                  className="absolute top-4 left-4 p-2 text-slate-600 hover:text-red-500 transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>

                                <div className="flex items-center gap-3 mb-4 justify-end">
                                  <div className="text-right">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2 justify-end">
                                      {med.isSpanningMidnight && <span title="تمتد لليوم التالي"><Moon size={14} className="text-indigo-400 animate-pulse" /></span>}
                                      جرعة طوارئ
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">تلقائي الترتيب ضمن المواعيد</p>
                                  </div>
                                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110", colors.bg.replace('/10', '/20'), colors.text, colors.border.replace('border-s-', 'border-'))}>
                                    <Zap size={20} />
                                  </div>
                                </div>
                                
                                {med.overlapsDarkness && (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4 justify-end scale-95 origin-right">
                                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-200 text-right leading-relaxed">تنبيه: الجرعة تتداخل مع فترة الإظلام.</p>
                                  </div>
                                )}

                                {(() => {
                                  const ageVal = toNum(state.age);
                                  if (ageVal !== 1 || !med.startTime) return null;
                                  const orsTime = state.medicationLogs['1-d1-ors'] || '';
                                  const isViolation = !orsTime || (() => {
                                    const [ih, im] = med.startTime.split(':').map(Number);
                                    const [oh, om] = orsTime.split(':').map(Number);
                                    if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) return false;
                                    return (ih * 60 + im) < (oh * 60 + om);
                                  })();
                                  if (!isViolation) return null;
                                  return (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-400/10 border border-red-500/20 rounded-xl mb-4 justify-end scale-95 origin-right relative z-10">
                                      <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                      <p className="text-[10px] font-bold text-red-200 text-right leading-relaxed">
                                        {!orsTime 
                                          ? "تنبيه خطير: لم يتم بدء محلول معالجة الجفاف بعد! يجب بدء برنامج اليوم الأول بمحلول معالجة الجفاف أولاً."
                                          : `تنبيه خطير: لا يمكن البدء قبل محلول معالجة الجفاف المقرر في الساعة (${orsTime}).`
                                        }
                                      </p>
                                    </div>
                                  );
                                })()}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-center">اسم الجرعة</label>
                                      <div className="relative">
                                        <div className="relative">
                                          <input 
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => {
                                              const name = e.target.value;
                                              let updates: any = { name };
                                              
                                              // Auto-fill logic based on selected name
                                              const finalMatch = CUSTOM_MED_LIST.find(m => m.name === name);

                                              if (finalMatch) {
                                                updates.duration = finalMatch.duration;
                                                updates.doseValue = finalMatch.dose !== undefined ? finalMatch.dose : 1;
                                                updates.unit = finalMatch.unit;
                                              }
                                              updateEmergencyMed(med.id, updates);
                                            }}
                                            onFocus={() => setOpenMedDropdown(med.id)}
                                            placeholder="اختر أو ابحث عن دواء..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl ps-10 pe-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500/50 text-center shadow-inner"
                                          />
                                          <button 
                                            type="button"
                                            onClick={() => setOpenMedDropdown(openMedDropdown === med.id ? null : med.id)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                          >
                                            <ChevronDown size={14} className={`transition-transform duration-200 ${openMedDropdown === med.id ? 'rotate-180' : ''}`} />
                                          </button>
                                        </div>

                                        {openMedDropdown === med.id && (
                                          <>
                                            <div 
                                              className="fixed inset-0 z-10" 
                                              onClick={() => setOpenMedDropdown(null)}
                                            />
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
                                              <div className="px-3 py-1 bg-white/5 my-1">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">تغيير الدواء</span>
                                              </div>
                                              {CUSTOM_MED_LIST.map((m, i) => (
                                                <button
                                                  key={`custom-${i}`}
                                                  type="button"
                                                  onClick={() => {
                                                    updateEmergencyMed(med.id, {
                                                      name: m.name,
                                                      duration: m.duration,
                                                      doseValue: m.dose !== undefined ? m.dose : 1,
                                                      unit: m.unit
                                                    });
                                                    setOpenMedDropdown(null);
                                                  }}
                                                  className="w-full text-right px-4 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0"
                                                >
                                                  {m.name}
                                                </button>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-3 mb-1 max-w-[280px] mx-auto">
                                      {/* Start Time Field */}
                                      <div className={cn(
                                        "flex items-center gap-3 bg-slate-900/40 p-2 rounded-2xl border border-white/5 shadow-xl transition-opacity",
                                        (toNum(state.age) === 1 && !state.medicationLogs['1-d1-ors']) && "opacity-50"
                                      )}>
                                        <div className="text-left flex flex-col justify-center min-w-[60px]">
                                          <span className="text-[11px] font-black text-slate-400 leading-tight">وقت</span>
                                          <span className="text-[11px] font-black text-slate-400 leading-tight">البدء:</span>
                                        </div>
                                        <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 flex items-center shadow-inner relative group cursor-pointer h-[42px]">
                                          <input 
                                            type="time"
                                            value={med.startTime ?? ''}
                                            disabled={toNum(state.age) === 1 && !state.medicationLogs['1-d1-ors']}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (toNum(state.age) === 1) {
                                                const orsTime = state.medicationLogs['1-d1-ors'];
                                                if (orsTime) {
                                                  const [ih, im] = val.split(':').map(Number);
                                                  const [oh, om] = orsTime.split(':').map(Number);
                                                  if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
                                                    if (ih * 60 + im < oh * 60 + om) {
                                                      alert("⚠️ لا يمكن لجرعة أو علاج أن يسبق محلول معالجة الجفاف في اليوم الأول!");
                                                      return;
                                                    }
                                                  }
                                                }
                                              }
                                              updateEmergencyMed(med.id, { startTime: val });
                                            }}
                                            className={cn(
                                              "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20 [color-scheme:dark]",
                                              (toNum(state.age) === 1 && !state.medicationLogs['1-d1-ors']) && "pointer-events-none"
                                            )}
                                          />
                                          <div className="flex items-center justify-between w-full z-10 pointer-events-none">
                                            <ChevronDown size={14} className="text-slate-500" />
                                            <div className="flex items-center gap-2">
                                              {med.startTime ? (
                                                <span className="text-[14px] font-black text-white leading-none">
                                                  {(() => {
                                                    const [h, m] = med.startTime.split(':').map(Number);
                                                    const d = new Date();
                                                    d.setHours(h, m, 0, 0);
                                                    
                                                    // Determine the anchor for this day to show rollover if needed
                                                    const prevDayInfo = getDayTransitionInfo();
                                                    let refDate = undefined;
                                                    if (prevDayInfo && prevDayInfo.endTimeStr) {
                                                        const [ah, am] = prevDayInfo.endTimeStr.split(' ')[0].split(':').map(Number);
                                                        refDate = new Date();
                                                        refDate.setHours(ah, am, 0, 0);
                                                    }
                                                    
                                                    return formatArabicTime(d, refDate);
                                                  })()}
                                                </span>
                                              ) : (
                                                <span className="text-[11px] font-bold text-slate-500 leading-none">
                                                  {toNum(state.age) === 1 && !state.medicationLogs['1-d1-ors'] ? "حدد محلول الجفاف أولاً" : "اختر وقتاً"}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Duration Field */}
                                      <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-2xl border border-white/5 shadow-xl">
                                        <div className="text-left flex flex-col justify-center min-w-[60px]">
                                          <span className="text-[11px] font-black text-slate-400 leading-tight">المدة</span>
                                          <span className="text-[11px] font-black text-slate-400 leading-tight">(س):</span>
                                        </div>
                                        <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 shadow-inner">
                                          <input 
                                            type="text"
                                            inputMode="decimal"
                                            value={med.duration || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                updateEmergencyMed(med.id, { duration: val });
                                              }
                                            }}
                                            className="w-full bg-transparent text-white text-[15px] font-black focus:outline-none text-center [&::-webkit-inner-spin-button]:hidden leading-none"
                                            placeholder="8"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col justify-end gap-3">
                                    <div className="flex gap-2">
                                       <div className="flex-1 bg-slate-900/40 p-2 rounded-2xl border border-white/5">
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block text-center">الجرعة</label>
                                          <input 
                                            type="text"
                                            inputMode="decimal"
                                            value={med.doseValue || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                updateEmergencyMed(med.id, { doseValue: val });
                                              }
                                            }}
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                                            placeholder="1"
                                          />
                                       </div>
                                       <div className="flex-1 bg-slate-900/40 p-2 rounded-2xl border border-white/5">
                                          <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block text-center">الوحدة</label>
                                          <div className="grid grid-cols-3 gap-1 h-[26px]">
                                            {['سم³/لتر', 'جرام/لتر', 'ملي/لتر'].map((u) => (
                                              <button
                                                key={u}
                                                onClick={() => updateEmergencyMed(med.id, { unit: u })}
                                                className={cn(
                                                  "text-[8px] font-black rounded-lg transition-all",
                                                  med.unit === u 
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                                    : "bg-slate-950 text-slate-500 border border-white/5 hover:border-white/10"
                                                )}
                                              >
                                                {u}
                                              </button>
                                            ))}
                                          </div>
                                       </div>
                                    </div>

                                    {med.startTime && toNum(med.duration) > 0 && (
                                      <div className="p-4 bg-red-600/10 rounded-2xl border border-red-600/20 space-y-3 text-right">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">توقيت الانتهاء:</span>
                                          <div className="flex items-center gap-1.5">
                                            {med.isSpanningMidnight && <Moon size={10} className="text-indigo-400" />}
                                            <span className={cn("text-xs font-black", med.isSpanningMidnight ? "text-indigo-400" : "text-red-400")}>
                                              {(() => {
                                                const [h, m] = med.startTime.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h + toNum(med.duration), m, 0, 0);
                                                
                                                const refD = new Date();
                                                refD.setHours(h, m, 0, 0);
                                                
                                                return formatArabicTime(d, refD);
                                              })()}
                                            </span>
                                          </div>
                                        </div>

                                         <div className="border-t border-red-500/10 pt-2 flex flex-col gap-1.5">
                                           {toNum(med.doseValue) > 0 && (
                                             <div className="flex items-center justify-between bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                                               <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">إجمالي الدواء:</span>
                                               <span className="text-xs font-black text-amber-400">
                                                 {(med.calculatedWater * toNum(med.doseValue)).toLocaleString()} {med.unit && med.unit.includes('/') ? med.unit.split('/')[0] : med.unit}
                                               </span>
                                             </div>
                                           )}
                                           <div className="flex items-center justify-between px-2">
                                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">إجمالي المياه:</span>
                                               <span className="text-xs font-black text-white">
                                                 {med.calculatedWater} لتر
                                               </span>
                                            </div>
                                            {activeBatteriesCount >= 2 && (
                                              <div className="flex flex-col gap-1 px-2 pt-1.5 border-t border-white/5 mt-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right block mb-1">المياه لكل بطارية (حسب عدد الطيور):</span>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                  {batteryWaterDistribution.units.map((unit, uIdx) => {
                                                    const unitMedWater = ((unit.birdsCount / (batteryWaterDistribution.totalBirdsAcrossAllBatteries || 1)) * med.calculatedWater).toFixed(1);
                                                    return (
                                                      <div key={uIdx} className="bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center justify-between text-[10px]">
                                                        <span className="text-slate-400 font-bold">{unit.unitName.includes(' - ') ? unit.unitName.split(' - ')[1] : unit.unitName}</span>
                                                        <span className="text-cyan-400 font-black font-mono">{unitMedWater} لتر</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            <div className="hidden">
                                               <span className="hidden"></span>
                                              <span className="text-xs font-black text-white">
                                                {med.calculatedWater} لتر
                                              </span>
                                           </div>
                                           {toNum(med.doseValue) > 0 && (
                                              <div className="flex items-center justify-between px-2 pt-1 border-t border-white/5 opacity-60">
                                                 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">بمعدل:</span>
                                                 <span className="text-[10px] font-black text-slate-400">{med.doseValue} {med.unit}</span>
                                              </div>
                                           )}
                                        </div>

                                        {(() => {
                                          const nextAct = nextItem || localNextDayFirstMed;
                                          if (!nextAct) return null;

                                          const nextInfo = getNextTime(med.startTime, med, nextAct, nextAct === localNextDayFirstMed);
                                          if (!nextInfo) return null;

                                          return (
                                            <>
                                              <div className="flex items-center justify-between border-t border-red-500/20 pt-2 text-right">
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                  <Zap size={10} className="text-emerald-400 shrink-0" />
                                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-tight">التالي ({nextAct.name}):</span>
                                                </div>
                                                <div className="flex items-center gap-2 ps-2">
                                                  <span className="text-xs font-black text-emerald-400 whitespace-nowrap">{nextInfo.nextStartTimeStr}</span>
                                                </div>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            const med = item;
                            const logKey = `${toNum(state.age)}-${med.id || med.name}`;
                            const colors = getCategoryColorClasses(med.category, med.name);
                            const prevAct = i > 0 ? unifiedTimeline[i - 1] : null;
                            const nextAct = nextItem || localNextDayFirstMed;

                            return (
                              <div key={itemKey} className={cn(
                                "bg-slate-900 shadow-xl border-t border-white/5 p-5 rounded-3xl flex flex-col gap-4 border-s-4 transition-all duration-300",
                                colors.border,
                                med.isRest && "opacity-80"
                              )}>
                                <div className="flex items-center justify-between group">
                                  <div className="flex items-center gap-3 w-full">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border shadow-inner transition-colors shrink-0",
                                      colors.bg.replace('/10', '/20'), colors.text, colors.border.replace('border-s-', 'border-')
                                    )}>
                                      {i + 1}
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          if (i === 0) return;
                                          const prevItem = unifiedTimeline[i - 1];
                                          const currentKey = med.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${med.id || med.name}`;
                                          const prevKey = prevItem.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${prevItem.id || prevItem.name}`;
                                          const prevOrder = state.medDataOverrides?.[prevKey]?.order ?? (prevItem.originalIndex || 0);
                                          setState(prev => ({
                                            ...prev,
                                            medDataOverrides: {
                                              ...prev.medDataOverrides,
                                              [currentKey]: { ...prev.medDataOverrides?.[currentKey], order: prevOrder - 1 },
                                              [prevKey]: { ...prev.medDataOverrides?.[prevKey], order: prevOrder }
                                            }
                                          }));
                                        }}
                                        disabled={i === 0}
                                        className="text-slate-500 hover:text-white disabled:opacity-30"
                                      >
                                        <ChevronUp size={12} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (i === unifiedTimeline.length - 1) return;
                                          const nextItem = unifiedTimeline[i + 1];
                                          const currentKey = med.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${med.id || med.name}`;
                                          const nextKey = nextItem.type === 'darkness' ? `${toNum(state.age)}-darkness` : `${toNum(state.age)}-${nextItem.id || nextItem.name}`;
                                          const nextOrder = state.medDataOverrides?.[nextKey]?.order ?? (nextItem.originalIndex || 0);
                                          setState(prev => ({
                                            ...prev,
                                            medDataOverrides: {
                                              ...prev.medDataOverrides,
                                              [currentKey]: { ...prev.medDataOverrides?.[currentKey], order: nextOrder + 1 },
                                              [nextKey]: { ...prev.medDataOverrides?.[nextKey], order: nextOrder }
                                            }
                                          }));
                                        }}
                                        disabled={i === unifiedTimeline.length - 1}
                                        className="text-slate-500 hover:text-white disabled:opacity-30"
                                      >
                                        <ChevronDown size={12} />
                                      </button>
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="relative">
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={med.name}
                                            onChange={(e) => {
                                              const name = e.target.value;
                                              let updates: any = { name };
                                              const match = CUSTOM_MED_LIST.find(m => m.name === name);
                                              if (match) {
                                                updates.doseValue = match.dose;
                                                updates.unit = match.unit;
                                                updates.duration = match.duration;
                                              }
                                              updateMedOverride(logKey, updates);
                                            }}
                                            onFocus={() => setOpenMedDropdown(logKey)}
                                            className="bg-transparent border-none p-0 text-base font-black text-white focus:ring-0 w-full"
                                          />
                                          <button 
                                            type="button"
                                            onClick={() => setOpenMedDropdown(openMedDropdown === logKey ? null : logKey)}
                                            className="text-slate-500 hover:text-white"
                                          >
                                            <ChevronDown size={14} className={cn("transition-transform", openMedDropdown === logKey && "rotate-180")} />
                                          </button>
                                        </div>
                                        {openMedDropdown === logKey && (
                                          <>
                                            <div className="fixed inset-0 z-10" onClick={() => setOpenMedDropdown(null)} />
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto py-1">
                                              <div className="px-3 py-1 bg-white/5 my-1">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">تغيير الدواء</span>
                                              </div>
                                              {CUSTOM_MED_LIST.map((m, idx) => (
                                                <button
                                                  key={idx}
                                                  type="button"
                                                  onMouseDown={(e) => {
                                                    e.preventDefault(); 
                                                    updateMedOverride(logKey, { 
                                                      name: m.name,
                                                      doseValue: m.dose,
                                                      unit: m.unit,
                                                      duration: m.duration
                                                    });
                                                    setOpenMedDropdown(null);
                                                  }}
                                                  className="w-full text-right px-4 py-2 text-[10px] font-bold text-slate-400 hover:bg-blue-600/20 hover:text-white border-b border-white/5 last:border-0 transition-colors"
                                                >
                                                  {m.name}
                                                </button>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", colors.accent)}>
                                          {med.category}
                                        </span>
                                        {med.isSpanningMidnight && <span title="تمتد لليوم التالي"><Moon size={14} className="text-indigo-400 animate-pulse" /></span>}
                                        {med.isNextDay && <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/20 shadow-sm shadow-cyan-400/20 tracking-tight">ممتدة لليوم التالي</span>}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {med.overlapsDarkness && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/10 rounded-lg shrink-0">
                                      <span className="text-[9px] font-bold text-amber-400">تداخل</span>
                                      <AlertTriangle size={10} className="text-amber-500" />
                                    </div>
                                  )}
                                </div>

                                {(() => {
                                   const ageVal = toNum(state.age);
                                   if (ageVal !== 1 || med.id === 'd1-ors' || !med.startTime) return null;
                                   const orsTime = state.medicationLogs['1-d1-ors'] || '';
                                   const isViolation = !orsTime || (() => {
                                     const [ih, im] = med.startTime.split(':').map(Number);
                                     const [oh, om] = orsTime.split(':').map(Number);
                                     if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) return false;
                                     return (ih * 60 + im) < (oh * 60 + om);
                                   })();
                                   if (!isViolation) return null;
                                   return (
                                     <div className="flex items-center gap-2 px-3 py-2 bg-red-400/10 border border-red-500/20 rounded-xl mb-4 justify-end text-right relative z-10 mx-5 mt-2">
                                       <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                       <p className="text-[10px] font-bold text-red-200 text-right leading-relaxed">
                                         {!orsTime 
                                           ? "تنبيه خطير: لم يتم بدء محلول معالجة الجفاف بعد! يجب بدء برنامج اليوم الأول بمحلول معالجة الجفاف أولاً."
                                           : `تنبيه خطير: لا يمكن البدء قبل محلول معالجة الجفاف المقرر في الساعة (${orsTime}).`
                                         }
                                       </p>
                                     </div>
                                   );
                                 })()}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                  <div className="space-y-2">
                                    {/* Dose Info */}
                                      {med.category !== 'راحة' && (
                                        <div className="flex items-center gap-3">
                                          <label className="text-[9px] font-black text-slate-500 uppercase min-w-[40px]">الجرعة:</label>
                                          <div className="flex items-center gap-2 flex-1">
                                            <input 
                                              type="text"
                                              inputMode="decimal"
                                              value={state.medDataOverrides?.[logKey]?.doseValue ?? med.doseValue}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                  updateMedOverride(logKey, { doseValue: val });
                                                }
                                              }}
                                              className="bg-transparent border-b border-white/10 text-xs font-black text-white w-12 text-center focus:outline-none focus:border-blue-500/50 h-5"
                                            />
                                          <div className="flex gap-1">
                                            {['سم³/لتر', 'جرام/لتر'].map((u) => (
                                              <button
                                                key={u}
                                                onClick={() => updateMedOverride(logKey, { unit: u })}
                                                className={cn(
                                                  "px-2 py-1 rounded text-[8px] font-black transition-all",
                                                  med.unit === u ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
                                                )}
                                              >
                                                {u}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Duration Info */}
                                    {(med.category !== 'راحة' || 
                                      (med.name && (
                                        med.name.includes('ماء') || 
                                        med.name.includes('مياه') || 
                                        CUSTOM_MED_LIST.some(m => m.name === med.name)
                                      ))
                                    ) && (
                                      <div className="flex items-center gap-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase min-w-[40px]">مدة الإعطاء:</label>
                                        <div className="flex items-center gap-2 flex-1">
                                          <input 
                                            type="text"
                                            inputMode="decimal"
                                            value={state.medDataOverrides?.[logKey]?.duration ?? med.recommendedHours}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                updateMedOverride(logKey, { duration: val });
                                              }
                                            }}
                                            className="bg-transparent border-b border-white/10 text-xs font-black text-white w-12 text-center focus:outline-none focus:border-blue-500/50 h-5"
                                            placeholder={String(med.recommendedHours)}
                                          />
                                          <span className="text-[9px] font-bold text-slate-500 uppercase">ساعات</span>
                                        </div>
                                      </div>
                                    )}
                                    {med.startTime && toNum(med.duration) > 0 && (
                                      <div className={cn(
                                        "p-3 rounded-2xl border space-y-2 text-right",
                                        colors.bg, "bg-opacity-5", colors.border.replace('border-s-', 'border-'), "border-opacity-20"
                                      )}>
                                        {toNum(med.doseValue) > 0 && (
                                          <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">إجمالي الدواء:</span>
                                            <span className={cn("text-xs font-black", colors.text)}>
                                              {(med.calculatedWater * toNum(med.doseValue)).toLocaleString()} {med.unit && med.unit.includes('/') ? med.unit.split('/')[0] : med.unit}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between px-2">
                                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">إجمالي المياه:</span>
                                          <span className="text-xs font-black text-white">
                                            {med.calculatedWater} لتر
                                          </span>
                                        </div>
                                        {activeBatteriesCount >= 2 && (
                                          <div className="flex flex-col gap-1 px-2 pt-1.5 border-t border-white/5 mt-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right block mb-1">المياه لكل بطارية (حسب عدد الطيور):</span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                              {batteryWaterDistribution.units.map((unit, uIdx) => {
                                                const unitMedWater = ((unit.birdsCount / (batteryWaterDistribution.totalBirdsAcrossAllBatteries || 1)) * med.calculatedWater).toFixed(1);
                                                return (
                                                  <div key={uIdx} className="bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center justify-between text-[10px]">
                                                    <span className="text-slate-400 font-bold">{unit.unitName.includes(' - ') ? unit.unitName.split(' - ')[1] : unit.unitName}</span>
                                                    <span className="text-cyan-400 font-black font-mono">{unitMedWater} لتر</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        <div className="hidden">
                                          <span className="hidden"></span>
                                          <span className="text-xs font-black text-white">
                                            {med.calculatedWater} لتر
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3 bg-slate-950/50 p-2.5 rounded-2xl border border-white/5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ps-2">وقت البدء:</span>
                                    <input 
                                      type="time" 
                                      value={state.medicationLogs[logKey] ?? ''}
                                      disabled={toNum(state.age) === 1 && med.id !== 'd1-ors' && !state.medicationLogs['1-d1-ors']}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        
                                        // If setting ORS on day 1
                                        if (toNum(state.age) === 1 && med.id === 'd1-ors' && val) {
                                          const [oh, om] = val.split(':').map(Number);
                                          if (!isNaN(oh) && !isNaN(om)) {
                                            const orsMins = oh * 60 + om;
                                            // Check if any other scheduled med has a start time earlier than this
                                            let hasViolation = false;
                                            Object.keys(state.medicationLogs).forEach(k => {
                                              if (k.startsWith('1-') && k !== '1-d1-ors' && state.medicationLogs[k]) {
                                                const [ih, im] = state.medicationLogs[k].split(':').map(Number);
                                                if (!isNaN(ih) && !isNaN(im) && (ih * 60 + im < orsMins)) {
                                                  hasViolation = true;
                                                }
                                              }
                                            });
                                            if (hasViolation) {
                                              if (confirm("⚠️ تعديل وقت محلول معالجة الجفاف إلى هذا الوقت يجعله متأخراً عن جرعات أخرى اليوم. هل ترغب في إعادة ضبط أوقات الجرعات الأخرى لتتبع محلول الجفاف؟")) {
                                                setState(prev => {
                                                  const newLogs = { ...prev.medicationLogs };
                                                  // Clear other day 1 medication logs since they must succeed ORS
                                                  Object.keys(newLogs).forEach(k => {
                                                    if (k.startsWith('1-') && k !== '1-d1-ors') {
                                                      delete newLogs[k];
                                                    }
                                                  });
                                                  newLogs['1-d1-ors'] = val;
                                                  return { ...prev, medicationLogs: newLogs };
                                                });
                                                return;
                                              } else {
                                                return;
                                              }
                                            }
                                          }
                                        }

                                        // If setting non-ORS med on day 1
                                        if (toNum(state.age) === 1 && med.id !== 'd1-ors') {
                                          const orsTime = state.medicationLogs['1-d1-ors'];
                                          if (!orsTime) {
                                            alert("⚠️ يجب تحديد وقت بدء محلول معالجة الجفاف أولاً لكونه بداية البرنامج العلاجي.");
                                            return;
                                          }
                                          const [ih, im] = val.split(':').map(Number);
                                          const [oh, om] = orsTime.split(':').map(Number);
                                          if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
                                            if (ih * 60 + im < oh * 60 + om) {
                                              alert("⚠️ لا يمكن لجرعة أو علاج أن يسبق محلول معالجة الجفاف في اليوم الأول!");
                                              return;
                                            }
                                          }
                                        }

                                        setState(prev => ({
                                          ...prev,
                                          medicationLogs: {
                                            ...prev.medicationLogs,
                                            [logKey]: val
                                          }
                                        }));
                                      }}
                                      className={cn(
                                        "bg-slate-950 text-white text-xs font-black border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50 transition-colors w-32 shadow-inner text-center",
                                        (toNum(state.age) === 1 && med.id !== 'd1-ors' && !state.medicationLogs['1-d1-ors']) && "opacity-40 cursor-not-allowed border-red-500/30 text-slate-500"
                                      )}
                                    />
                                    {toNum(state.age) === 1 && med.id !== 'd1-ors' && !state.medicationLogs['1-d1-ors'] && (
                                      <span className="text-[9px] font-bold text-red-400 text-right pr-2">
                                        ℹ️ حدد محلول الجفاف أولاً
                                      </span>
                                    )}
                                    {!state.medicationLogs[logKey] && getSuggestedStartTime(med, prevAct) && !(toNum(state.age) === 1 && i === 0) && (
                                      <div className="flex flex-col gap-1.5 flex-1">
                                        <button 
                                          onClick={() => {
                                            const suggested = getSuggestedStartTime(med, prevAct);
                                            if (suggested) {
                                              setState(prev => ({
                                                ...prev,
                                                medicationLogs: {
                                                  ...prev.medicationLogs,
                                                  [logKey]: suggested
                                                }
                                              }));
                                            }
                                          }}
                                          className="w-full flex items-center justify-between px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl transition-all group shadow-lg shadow-emerald-500/10"
                                        >
                                          <div className="flex flex-col items-start gap-0.5 text-right">
                                            <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest leading-none text-right">ربط (بعد النشاط السابق):</span>
                                            <span className="text-[10px] font-black text-white leading-none">
                                              {(() => {
                                                const suggested = getSuggestedStartTime(med, prevAct);
                                                if (!suggested) return '--:--';
                                                const [h, m] = suggested.split(':').map(Number);
                                                const d = new Date();
                                                d.setHours(h, m, 0, 0);

                                                let refTime: Date | undefined = undefined;
                                                if (prevAct && prevAct.startTime) {
                                                  const [ph, pm] = prevAct.startTime.split(':').map(Number);
                                                  const pDate = new Date();
                                                  const pDuration = prevAct.recommendedHours || toNum(prevAct.duration) || 0;
                                                  pDate.setHours(ph + pDuration, pm, 0, 0);
                                                  refTime = pDate;
                                                } else {
                                                  const { latestEndTime } = getLatestActivityEndTime();
                                                  refTime = latestEndTime || undefined;
                                                }

                                                return formatArabicTime(d, refTime);
                                              })()}
                                            </span>
                                          </div>
                                          <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/40 transition-colors">
                                            <Zap size={12} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                          </div>
                                        </button>
                                        {(() => {
                                          let refTime: Date | null = null;
                                          if (prevAct && prevAct.startTime) {
                                            const [ph, pm] = prevAct.startTime.split(':').map(Number);
                                            const pDate = new Date();
                                            const pDuration = prevAct.recommendedHours || toNum(prevAct.duration) || 0;
                                            pDate.setHours(ph + pDuration, pm, 0, 0);
                                            refTime = pDate;
                                          } else {
                                            const { latestEndTime } = getLatestActivityEndTime();
                                            refTime = latestEndTime;
                                          }
                                          if (refTime && (refTime.getHours() < 5 && refTime.getHours() >= 0)) {
                                            return <span className="text-[9px] font-black text-[#00EEEE]">* ممتدة من اليوم السابق</span>;
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    )}
                                    {state.medicationLogs[logKey] && (
                                      <div className="text-[9px] font-bold text-emerald-400 bg-emerald-400/5 px-2.5 py-1 rounded-lg border border-emerald-400/10 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} />
                                        تم التسجيل
                                      </div>
                                    )}
                                  </div>

                                  {state.medicationLogs[logKey] && (i < unifiedTimeline.length - 1 || localNextDayFirstMed) && (
                                    <div className="px-4 py-3 bg-white/5 rounded-2xl flex flex-col gap-2.5 border border-white/5">
                                      {(() => {
                                        const nextAct = nextItem || localNextDayFirstMed;
                                        const nextInfo = getNextTime(state.medicationLogs[logKey], med, nextAct, nextAct === localNextDayFirstMed);
                                        if (!nextInfo) return null;
                                        
                                        return (
                                          <>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">موعد الانتهاء:</span>
                                              <div className="flex items-center gap-1.5">
                                                {med.isSpanningMidnight && <Moon size={10} className="text-indigo-400" />}
                                                <span className={cn("text-xs font-black", med.isSpanningMidnight ? "text-indigo-400" : "text-blue-400")}>
                                                  {nextInfo.endTimeStr}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-right">
                                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <Zap size={10} className="text-emerald-400 shrink-0" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-tight">
                                                  موعد الجرعة التالية ({nextAct.name}):
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 ps-2">
                                                <span className="text-xs font-black text-emerald-400 whitespace-nowrap">{nextInfo.nextStartTimeStr}</span>
                                              </div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })}
                      </>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                           <Activity size={32} className="mb-4" />
                           <p className="text-xs font-bold uppercase tracking-widest">لا توجد جرعات مجدولة لهذا العمر</p>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {dailyMeds.map((med: any, idx) => {
                  const totalSpecificDose = med.unit && med.unit.includes('طائر') 
                    ? Math.round(toNum(state.totalChicks) * med.doseValue) 
                    : Math.round(med.calculatedWater * med.doseValue);
                  const isWithdrawalRisk = toNum(state.age) >= 28 && med.isAntibiotic;
                  const colors = getCategoryColorClasses(med.category, med.name);
                  
                  return (
                    <Card key={idx} className={cn(
                      "hover:bg-slate-800/80 transition-all cursor-pointer group border-white/5 overflow-hidden p-0 border-s-4",
                      colors.border,
                      isWithdrawalRisk ? "border-red-500/50 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "hover:border-opacity-100"
                    )}>
                      <div className="bg-slate-950/30 px-5 py-2 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            colors.bg.replace('/10', '/20'), colors.text
                          )}>
                            {med.category}
                          </span>
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                             اليوم {state.age}
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{med.mixingRules || med.mixing || 'بدون خلط'}</span>
                      </div>

                      {isWithdrawalRisk && (
                        <div className="bg-red-500/20 px-5 py-1.5 flex items-center gap-2 border-b border-red-500/20">
                          <AlertCircle size={12} className="text-red-400" />
                          <span className="text-[9px] font-black text-red-300 uppercase tracking-widest">تحذير: فترة سحب (Withdrawal Period) - يمنع استخدام المضادات</span>
                        </div>
                      )}

                      <div className="flex flex-col p-5 pb-4 space-y-3">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-1.5 h-10 rounded-full bg-slate-800 transition-all",
                              isWithdrawalRisk ? "bg-red-600" : "group-hover:" + colors.accent.replace('text-', 'bg-')
                            )}></div>
                            <div>
                              <h4 className={cn("font-black text-lg text-white group-hover:transition-colors", "group-hover:" + colors.text)}>{med.name}</h4>
                              {med.tradeName && <p className="text-[10px] font-bold text-slate-500 italic mt-0.5">{med.tradeName}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-950/50 px-5 py-3 border-t border-white/5 grid grid-cols-2 gap-4">
                        <div 
                          className="space-y-1 cursor-help active:bg-white/5 p-1 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMedInfo({ 
                              title: "التفسير العلمي", 
                              text: med.scientificExplanation || med.benefits || "لا يتوفر تفسير حالياً"
                            });
                          }}
                        >
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">التفسير العلمي</span>
                          <p className="text-[10px] font-bold text-slate-300 leading-relaxed italic line-clamp-3">
                            {med.scientificExplanation || med.benefits}
                          </p>
                        </div>
                        <div className="space-y-2">
                           <div 
                              className="cursor-help active:bg-white/5 p-1 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMedInfo({ 
                                  title: "قواعد الخلط", 
                                  text: med.mixingRules || med.mixing || "بدون قواعد خلط خاصة"
                                });
                              }}
                           >
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">قواعد الخلط</span>
                              <p className="text-[10px] font-bold text-white flex items-center gap-1.5">
                                <Droplets size={10} className="text-cyan-500 flex-shrink-0" />
                                <span className="truncate">{med.mixingRules || med.mixing}</span>
                              </p>
                           </div>
                           <div 
                              className="cursor-help active:bg-white/5 p-1 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMedInfo({ 
                                  title: "التتابع الفني", 
                                  text: med.technicalSequence || med.sequence || "لا يتوفر تتابع فني حالياً"
                                });
                              }}
                           >
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">التتابع الفني</span>
                              <p className="text-[10px] font-bold text-slate-400 truncate">
                                {med.technicalSequence || med.sequence}
                              </p>
                           </div>
                           <div 
                              className="cursor-help active:bg-white/5 p-1 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMedInfo({ 
                                  title: "أسماء الأدوية المقترحة", 
                                  text: med.tradeNames || "يمكن استخدام أي منتج بديل يحتوي على نفس المادة الفعالة."
                                });
                              }}
                           >
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">أسماء الأدوية المقترحة</span>
                              <p className="text-[10px] font-bold text-amber-500 truncate">
                                {med.tradeNames || "بدائل تجارية"}
                              </p>
                           </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {MEDICATIONS.filter((m: any) => m.targetDays.includes(toNum(state.age)) && m.climates.includes(state.climate)).length === 0 && (
                  <Card className="p-10 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mb-4">
                      <Stethoscope size={32} />
                    </div>
                    <p className="text-sm font-black text-slate-500">لا توجد أدوية مجدولة لهذا اليوم (عمر {state.age} يوم)</p>
                    <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">استمر في المتابعة البيئية والتغذية الجيدة</p>
                  </Card>
                )}
              </div>

               <div className="px-2 space-y-4">
                  {toNum(state.age) >= 30 ? (
                    <Card className="bg-red-600 p-6 border-none flex items-start gap-4 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
                        <AlertCircle size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-white text-lg">فترة الأمان (Withdrawal Period)</h4>
                        <p className="text-xs text-red-100 font-bold mt-1 leading-relaxed">
                          أنت الآن في مرحلة التسويق. يمنع منعاً باتاً استخدام أي أدوية أو كيماويات لضمان خلو اللحم من المتبقيات الدوائية. اعتمد على الماء النقي فقط.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Card className="bg-blue-600/5 border-blue-500/10 p-5 flex gap-4">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                        <Activity size={22} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 leading-relaxed font-bold">
                          بناءً على العمر الحالي ({state.age} يوم)، يتم عرض التوصيات الدوائية والتحصينات المعتمدة لسلالة {STRAIN_NAMES[state.strain]} في نظام البطاريات.
                        </p>
                      </div>
                    </Card>
                  )}

                  <Card className="bg-amber-500/5 border border-amber-500/10 p-5 flex gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                      <Info size={22} />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">تنبيه وإخلاء مسؤولية</h5>
                      <p className="text-xs text-slate-300 leading-relaxed font-bold">
                        هذا البرنامج العلاجي الموضح هو دليل استرشادي وتعليمي فقط. نظراً لاختلاف استجابة قطعان الدواجن وحالتها الصحية الفردية بناءً على العوامل البيئية والإدارية ومكان المزرعة، يرجى دائماً استشارة الطبيب البيطري المختص والمشرف على دورتك لتأكيد الجرعات وتفاصيل بروتوكول الرعاية.
                      </p>
                    </div>
                  </Card>
               </div>
             </motion.div>
           </AnimatePresence>
          </motion.div>
        )}

          {screen === 'charts' && (
            <motion.div 
              key="charts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-32"
            >
               <header className="px-2 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter">لوحة التحليلات المتقدمة</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                    <Activity size={10} className="text-indigo-500" />
                    تحليل ذكي للبيانات الحيوية والإنتاجية
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 transition-transform hover:scale-110">
                   <BarChart2 size={24} />
                </div>
               </header>
               
               {/* Main Performance Curve */}
               <Card className="h-[320px] md:h-[400px] border-white/5 pt-6 bg-slate-900/40 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/40 via-indigo-500/40 to-emerald-500/40" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-10 px-4 md:px-6 gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-base md:text-lg font-black text-white">معدل تحويل الوزن</h3>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">الفعلي</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500/40"></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase">المعيار</span>
                    </div>
                  </div>
                </div>
                <div className="h-[210px] md:h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.slice(0, Math.min(toNum(state.age) + 7, 45))} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mainWeightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="stdWeightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.2} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#475569" 
                        fontSize={9} 
                        tickFormatter={(tick) => `يوم ${tick}`}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                        minTickGap={20}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={9} 
                        width={50}
                        tickFormatter={(tick) => `${tick}ج`}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-5}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#334155', strokeWidth: 1 }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                          backdropFilter: 'blur(12px)',
                          borderRadius: '16px', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                      />
                      <Area type="monotone" name="الأداء الفعلي" dataKey="weight" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#mainWeightGradient)" isAnimationActive={false} />
                      <Area type="monotone" name="الأداء المعياري" dataKey="standardWeight" stroke="#4f46e5" strokeWidth={2} strokeDasharray="6 4" fillOpacity={1} fill="url(#stdWeightGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
               </Card>

               {/* Bio-Metrics Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <Card className="h-64 border-white/5 pt-5 bg-slate-900/40 relative transition-all group shadow-lg">
                    <div className="flex items-center justify-between mb-6 px-5">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Droplets size={10} className="text-blue-500" />
                           استهلاك الموارد
                        </p>
                        <h4 className="text-xs font-black text-white italic">توازن العلف والماء</h4>
                      </div>
                      <div className="text-[8px] font-black text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-lg border border-blue-500/10 backdrop-blur-sm">
                        Ratio: {chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.wfRatio}
                      </div>
                    </div>
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.slice(0, Math.min(toNum(state.age) + 3, 45))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.2} />
                          <XAxis dataKey="day" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} dy={5} minTickGap={20} />
                          <YAxis stroke="#475569" fontSize={8} width={45} tickLine={false} axisLine={false} dx={-5} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '10px' }} />
                          <Line type="stepAfter" name="علف (جم)" dataKey="feed" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                          <Line type="stepAfter" name="ماء (مل)" dataKey="water" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="h-64 border-white/5 pt-5 bg-slate-900/40 relative overflow-hidden group shadow-lg">
                    <div className="flex items-center justify-between mb-6 px-5 relative z-10">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <AlertTriangle size={10} className="text-rose-500" />
                           معدل الأمان الحيوي
                        </p>
                        <h4 className="text-xs font-black text-white italic">تراكمي النفوق</h4>
                      </div>
                      <div className="text-[10px] font-black text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded-lg border border-rose-500/10">
                         {chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.mortalityRate}%
                      </div>
                    </div>
                    <div className="h-[160px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.slice(0, Math.min(toNum(state.age) + 1, 45))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mortalityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.2} />
                          <XAxis dataKey="day" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} dy={5} minTickGap={20} />
                          <YAxis stroke="#475569" fontSize={8} width={45} tickFormatter={(tick) => `${tick}%`} tickLine={false} axisLine={false} dx={-5} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '10px' }} />
                          <Area type="monotone" name="النافق (%)" dataKey="mortalityRate" stroke="#f43f5e" strokeWidth={2.5} fill="url(#mortalityGradient)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
               </div>

               {/* Advanced Performance Scoring */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* EPEF Scoring */}
                  <Card className="p-6 md:p-8 bg-gradient-to-br from-indigo-600/20 to-indigo-950/40 border-indigo-500/20 relative overflow-hidden group shadow-2xl flex flex-col justify-between">
                    <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6 md:mb-8">
                         <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-lg">
                            <Zap size={20} />
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">مؤشر EPEF</p>
                            <p className="text-[8px] text-slate-500 font-bold italic mt-1">كفاءة الإنتاج</p>
                         </div>
                      </div>
                      <div className="flex items-end gap-2 mb-6">
                         <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic">
                            {chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.epef || 0}
                         </h3>
                         <div className="mb-1 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-lg glass">نقطة</div>
                      </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                       <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-500 uppercase tracking-widest">تصنيف الدورة</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px]",
                            toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.epef) >= 400 ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
                          )}>
                            {toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.epef) >= 400 ? 'احترافي ممتاز' : 'أداء قياسي'}
                          </span>
                       </div>
                       <div className="h-1.5 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min((chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.epef || 0) / 450 * 100, 100)}%` }}
                             className="h-full bg-gradient-to-r from-indigo-600 to-indigo-300 rounded-full"
                          />
                       </div>
                       <p className="text-[9px] text-slate-500 leading-relaxed font-bold">المؤشر العالمي المعتمد لتقييم نجاح دورات التسمين فنياً ومالياً.</p>
                    </div>
                  </Card>

                  {/* FCR Analysis Card */}
                  <Card className="lg:col-span-2 p-6 md:p-8 bg-slate-900/40 border-white/5 flex flex-col justify-between group overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 relative z-10 gap-4">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-xl">
                             <Scale size={24} />
                          </div>
                          <div>
                            <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">معامل التحويل (FCR)</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">كفاءة استهلاك المادة الجافة</p>
                          </div>
                       </div>
                       <div className="text-right w-full sm:w-auto">
                          <div className={cn(
                            "px-5 py-2 rounded-2xl font-black text-2xl md:text-3xl shadow-2xl transition-all inline-block sm:block",
                            toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.fcr) <= toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardFcr) ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.fcr || '0.00'}
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                       <div className="space-y-6">
                           <div className="space-y-2">
                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest px-1">
                               <span className="text-slate-500">التحويل الفعلي</span>
                               <span className="text-white bg-white/5 px-2 py-0.5 rounded-lg">{chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.fcr}</span>
                             </div>
                             <div className="h-4 bg-slate-950/60 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.fcr) / 2 * 100, 100)}%` }}
                                  className="h-full bg-gradient-to-r from-amber-600 to-orange-400 rounded-full"
                                />
                             </div>
                           </div>
                           <div className="space-y-2">
                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest px-1">
                               <span className="text-slate-500">المعيار ({STRAIN_NAMES[state.strain]})</span>
                               <span className="text-slate-400">{chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardFcr}</span>
                             </div>
                             <div className="h-4 bg-slate-950/60 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner opacity-60">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardFcr) / 2 * 100, 100)}%` }}
                                  className="h-full bg-slate-600 rounded-full"
                                />
                             </div>
                           </div>
                       </div>

                       <div className="bg-slate-950/40 rounded-3xl p-5 border border-white/5 backdrop-blur-xl flex flex-col justify-center gap-3">
                          <div className="flex items-start gap-3">
                             <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/10">
                                <Info size={16} />
                             </div>
                             <div className="space-y-1">
                               <p className="text-[10px] text-slate-400 leading-tight font-bold">
                                 كلما انخفض الرقم عن المعياري، زاد الربح الصافي.
                               </p>
                               <div className="mt-2">
                                  {(() => {
                                    const currentFcr = toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.fcr);
                                    const stdFcr = toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardFcr);
                                    if (currentFcr === 0) return <span className="text-slate-600 italic font-bold text-[8px]">بانتظار البيانات...</span>;
                                    if (currentFcr <= stdFcr) {
                                      return (
                                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                          <span className="text-[9px] font-black text-emerald-400 uppercase">أداء استثنائي</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-[9px] font-black text-amber-500 uppercase">هدر طفيف</span>
                                      </div>
                                    );
                                  })()}
                               </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </Card>
               </div>

               {/* Dynamic Performance Summary */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-1">
                  {[
                    { label: 'الوزن الحالي', value: Math.round(toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.weight)).toLocaleString(), unit: 'جم', color: 'text-white', icon: TrendingUp },
                    { label: 'انحراف المعيار', value: (toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.weight) - toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardWeight) > 0 ? '+' : '') + Math.round(toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.weight) - toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardWeight)), unit: 'جم', color: toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.weight) >= toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.standardWeight) ? "text-emerald-400" : "text-rose-400", icon: Activity },
                    { label: 'نسبة الحيوية', value: (100 - toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.mortalityRate)).toFixed(1), unit: '%', color: 'text-indigo-400', icon: ShieldCheck },
                    { label: 'العلف المستهلك', value: (toNum(chartData[Math.min(toNum(state.age) - 1, chartData.length - 1)]?.cumulativeFeed) / 1000).toFixed(2), unit: 'كجم', color: 'text-amber-400', icon: Database }
                  ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -4, backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
                      className="p-4 md:p-6 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl transition-all duration-300 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="flex items-center justify-between mb-3 relative z-10">
                         <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                            <stat.icon size={14} />
                         </div>
                         <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                      </div>
                      <p className={cn("text-xl md:text-3xl font-black italic tracking-tighter relative z-10", stat.color)}>
                        {stat.value} <span className="text-[9px] md:text-[11px] opacity-40 font-bold non-italic tracking-normal">{stat.unit}</span>
                      </p>
                    </motion.div>
                  ))}
               </div>
            </motion.div>
          )}

          {screen === 'heating' && (
            <motion.div 
              key="heating"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6 text-right pb-24"
              dir="rtl"
            >
              {/* Premium Header */}
              <header className="px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1 justify-start">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                    <h2 className="text-2xl font-black text-white tracking-tight">إدارة أنظمة التدفئة والتحضين</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    حساب متطلبات الطاقة الحرارية، معايرة كفاءة المصابيح، وتنظيم الهيترات والدفايات لتأمين التوازن الفسيولوجي للقطيع.
                  </p>
                </div>
              </header>

              {/* Heating Method Selector Card */}
              <Card className="bg-slate-900 border border-white/10 p-5 rounded-3xl text-right font-sans overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 blur-3xl rounded-full pointer-events-none" />
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4 text-right">طريقة التدفئة والتحضين بالمنشأة</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                  {[
                    { id: 'bulb', label: 'التدفئة باللمبات فقط 💡', desc: 'توزيع حراري موضعي ومثالي للأعمار الأولى', activeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40 shadow-xl shadow-yellow-950/20' },
                    { id: 'heater', label: 'الدفايات والهيترات 💨', desc: 'تحكم مركزي قوي للمساحات المتوسطة والكبيرة', activeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-xl shadow-rose-950/20' },
                    { id: 'both', label: 'التدفئة المشتركة 🔥', desc: 'الدمج الكامل للحصول على أعلى كفاءة أمان', activeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-xl shadow-amber-950/20' }
                  ].map((method) => {
                    const active = (state.heatingMethod || 'both') === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, heatingMethod: method.id as any }))}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border text-center gap-1.5 cursor-pointer ${
                          active 
                            ? `${method.activeColor} border-[1.5px]` 
                            : 'bg-slate-950/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[13px] font-black">{method.label}</span>
                        <span className="text-[9px] opacity-70 font-medium leading-normal">{method.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Quick Info Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recommended Temperature based on Chick Age */}
                <Card className="bg-slate-900 border border-white/10 p-5 rounded-3xl flex items-center gap-4 overflow-hidden relative shadow-md">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 z-10 border border-amber-500/10 shadow-inner">
                    <Thermometer size={22} />
                  </div>
                  <div className="min-w-0 flex-1 z-10">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate">الحرارة المطلوبة للمرحلة</h5>
                    <p className="text-xl font-black text-white leading-tight">
                      {toNum(state.age) <= 3 ? 33 : toNum(state.age) <= 7 ? 31 : toNum(state.age) <= 14 ? 28 : toNum(state.age) <= 21 ? 25 : toNum(state.age) <= 28 ? 22 : 20}°م
                    </p>
                    <span className="text-[10px] text-amber-500 font-bold block mt-1 truncate">
                      {toNum(state.age) <= 7 ? "مرحلة تحضين حرجة ⚠️" : "مرحلة معتدلة مستقرة ✅"}
                    </span>
                  </div>
                </Card>

                {/* Installed Power capacity */}
                <Card className="bg-slate-900 border border-white/10 p-5 rounded-3xl flex items-center gap-4 overflow-hidden relative shadow-md">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full pointer-events-none" />
                  <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 shrink-0 z-10 border border-rose-500/10 shadow-inner">
                    <Flame size={22} />
                  </div>
                  <div className="min-w-0 flex-1 z-10">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate">القدرة المتوفرة للتسخين</h5>
                    <p className="text-xl font-black text-white leading-tight">
                      {(() => {
                        const m = state.heatingMethod || 'both';
                        const bulbW = m === 'heater' ? 0 : (toNum(state.tungstenBulbCount ?? 20) * toNum(state.tungstenBulbPower ?? 200));
                        const heaterW = m === 'bulb' ? 0 : (toNum(state.heaterCount ?? 2) * toNum(state.heaterPower ?? 15000));
                        return ((bulbW + heaterW) / 1000).toFixed(1);
                      })()} كيلووات
                    </p>
                    <span className="text-[10px] text-rose-400 font-bold block mt-1 truncate">
                      {state.heatingMethod === 'bulb' ? "إضاءة حرارية تنجستين" : state.heatingMethod === 'heater' ? "نظام دفايات مركزي" : "نظام تدفئة مزدوج فعال"}
                    </span>
                  </div>
                </Card>

                {/* Barn Area */}
                <Card className="bg-slate-900 border border-white/10 p-5 rounded-3xl flex items-center gap-4 overflow-hidden relative shadow-md">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full pointer-events-none" />
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 z-10 border border-indigo-500/10 shadow-inner">
                    <Layers size={22} />
                  </div>
                  <div className="min-w-0 flex-1 z-10">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate">مساحة العنبر الإجمالية</h5>
                    <p className="text-xl font-black text-white leading-tight">
                      {(toNum(state.barnLength || 100) * toNum(state.barnWidth || 12)).toLocaleString()} م²
                    </p>
                    <span className="text-[10px] text-indigo-400 font-bold block mt-1 truncate">الأبعاد: {state.barnLength || 100}م × {state.barnWidth || 12}م</span>
                  </div>
                </Card>
              </div>

              {/* Heating Configurations Cards Grid */}
              <div className={`grid grid-cols-1 ${(state.heatingMethod || 'both') === 'both' ? 'lg:grid-cols-2' : ''} gap-6`}>
                {/* 1. Tungsten Bulbs Configuration Card */}
                {((state.heatingMethod || 'both') === 'bulb' || (state.heatingMethod || 'both') === 'both') && (
                  <Card className="bg-slate-900 border border-white/10 rounded-3xl p-6 text-right font-sans relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 shrink-0 border border-yellow-500/10 shadow-inner">
                        <Sun size={18} className={toNum(state.tungstenBulbCount) > 0 ? 'animate-pulse' : ''} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white">لمبات التنجستين الحرارية (الموضعية)</h4>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal">توزيع حراري منتظم وعالي الكثافة على الفرشة</p>
                      </div>
                    </div>

                    <div className="space-y-5 relative z-10">
                      {/* Bulb count with controls (optimized for mobile touch targets) */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إجمالي عدد اللمبات بالعنبر</label>
                          <span className="text-[11px] font-mono font-black text-yellow-400 bg-yellow-400/5 px-2.5 py-1 rounded-lg border border-yellow-400/15">{state.tungstenBulbCount ?? 20} لمبة</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <button 
                            key="dec-bulb"
                            type="button"
                            onClick={() => {
                              const current = toNum(state.tungstenBulbCount ?? 20);
                              setState(prev => ({ ...prev, tungstenBulbCount: Math.max(0, current - 1) }));
                            }}
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors font-black text-xl select-none shrink-0 border border-white/5 shadow-md active:scale-90"
                          >
                            -
                          </button>
                          <input 
                            key="bulb-count-in"
                            type="text"
                            inputMode="numeric"
                            value={state.tungstenBulbCount ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                setState(prev => ({ ...prev, tungstenBulbCount: val }));
                              }
                            }}
                            className="bg-transparent text-2xl font-black text-center text-white flex-1 outline-none font-mono focus:text-yellow-400 transition-colors w-full"
                          />
                          <button 
                            key="inc-bulb"
                            type="button"
                            onClick={() => {
                              const current = toNum(state.tungstenBulbCount ?? 20);
                              setState(prev => ({ ...prev, tungstenBulbCount: current + 1 }));
                            }}
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors font-black text-xl select-none shrink-0 border border-white/5 shadow-md active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Special battery tiers bulb configuration */}
                      {maxBatteryTiers > 0 && (
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">عدد اللمبات الموزعة لكل دور (بطارية)</label>
                            <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-400/10">إجمالي أدوار العنبر: {maxBatteryTiers}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Array.from({ length: maxBatteryTiers }).map((_, tierIdx) => {
                              const tierNum = tierIdx + 1;
                              const val = state.bulbsPerTier?.[tierNum] ?? '';
                              return (
                                <div key={tierNum} className="space-y-1 bg-slate-900/60 p-2 text-right rounded-xl border border-white/5 flex flex-col justify-between">
                                  <span className="text-[10px] font-bold text-slate-400">الدور {tierNum}</span>
                                  <div className="flex items-center gap-1.5 mt-1 bg-slate-950/60 px-2 py-1.5 rounded-lg border border-white/5">
                                    <input 
                                      type="text"
                                      inputMode="numeric"
                                      value={val}
                                      placeholder="0"
                                      onChange={e => {
                                        const inputVal = e.target.value;
                                        if (inputVal === '' || /^\d*$/.test(inputVal)) {
                                          setState(prev => {
                                            const prevBulbs = prev.bulbsPerTier || {};
                                            const nextBulbs = { ...prevBulbs, [tierNum]: inputVal };
                                            const totalBulbsSum = Object.values(nextBulbs).reduce<number>((s, curr) => s + toNum(curr), 0);
                                            return {
                                              ...prev,
                                              bulbsPerTier: nextBulbs,
                                              tungstenBulbCount: totalBulbsSum > 0 ? totalBulbsSum : prev.tungstenBulbCount
                                            };
                                          });
                                        }
                                      }}
                                      className="bg-transparent text-sm font-bold text-center text-white outline-none font-mono w-full"
                                    />
                                    <span className="text-[10px] text-slate-500 font-medium shrink-0">لمبة</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bulb Power selection/custom power inputs */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">قدرة المصباح الفردي</label>
                          <span className="text-xs font-mono font-black text-orange-400 bg-orange-400/5 px-2 py-0.5 rounded border border-orange-400/10 shrink-0">{state.tungstenBulbPower ?? 200} وات</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[100, 150, 200, 250].map((watts) => (
                            <button
                              key={watts}
                              type="button"
                              onClick={() => setState(prev => ({ ...prev, tungstenBulbPower: watts }))}
                              className={`py-2 px-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                toNum(state.tungstenBulbPower) === watts 
                                  ? 'bg-yellow-500 text-slate-950 font-black border-yellow-400 shadow-md shadow-yellow-500/10' 
                                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                              }`}
                            >
                              {watts}W
                            </button>
                          ))}
                        </div>
                        <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5">
                          <span className="text-[10px] text-slate-500 font-black shrink-0">تحديد قدرة مخصصة:</span>
                          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-xl">
                            <input 
                              type="text"
                              inputMode="numeric"
                              value={state.tungstenBulbPower ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d*$/.test(val)) {
                                  setState(prev => ({ ...prev, tungstenBulbPower: val }));
                                }
                              }}
                              placeholder="مثال: 300"
                              className="bg-transparent py-0 px-1 text-xs font-bold text-center text-white w-20 outline-none font-mono"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">W</span>
                          </div>
                        </div>
                      </div>

                      {/* Bulb Light colors */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block text-right">لون ونوع الإشعاع الحراري</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {['أصفر دافئ وجاذب', 'أحمر أشعة تحت الحمراء', 'أصفر كلاسيكي'].map((colorName) => (
                            <button
                              key={colorName}
                              type="button"
                              onClick={() => setState(prev => ({ ...prev, tungstenBulbColor: colorName }))}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all leading-tight border cursor-pointer ${
                                state.tungstenBulbColor === colorName 
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-inner' 
                                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent'
                              }`}
                            >
                              {colorName}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed mt-1 text-right">
                          📌 نصيحة الخبراء: استخدام اللمبات ذات الأشعة تحت الحمراء يؤمن كفاءة تدفئة ممتازة وعميقة دون التسبب في إزعاج ونقر غير مرغوب للصوص.
                        </p>
                      </div>

                      {/* Output Calculator Box */}
                      <div className="bg-gradient-to-l from-yellow-500/5 to-amber-500/5 p-4 rounded-2xl border border-yellow-500/10 flex justify-between items-center flex-wrap gap-2 shadow-inner">
                        <span className="text-xs font-bold text-slate-400">إجمالي قدرة التدفئة من المصابيح:</span>
                        <span className="text-sm font-mono font-black text-yellow-400">
                          {((toNum(state.tungstenBulbCount ?? 20) * toNum(state.tungstenBulbPower ?? 200)) / 1000).toFixed(2)} كيلووات
                        </span>
                      </div>

                    </div>
                  </Card>
                )}

                {/* 2. Gas Heater / Dafaia Configuration Card */}
                {((state.heatingMethod || 'both') === 'heater' || (state.heatingMethod || 'both') === 'both') && (
                  <Card className="bg-slate-900 border border-white/10 rounded-3xl p-6 text-right font-sans relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                      <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 shrink-0 border border-red-500/10 shadow-inner">
                        <Flame size={18} className={toNum(state.heaterCount) > 0 ? 'animate-bounce' : ''} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white">الدفايات، الدفايات النفاثة والأنابيب</h4>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal">التدفئة المركزية بقوة السولار والغاز لتأمين العنبر بالكامل</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Heater count with controls (touch target sized) */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2 shadow-inner">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">عدد الدفايات الفعالة بالعنبر</label>
                          <span className="text-[11px] font-mono font-black text-red-400 bg-red-400/5 px-2.5 py-1 rounded-lg border border-red-400/15">{state.heaterCount ?? 2} هيتر / دفاية</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <button 
                            key="dec-heater"
                            type="button"
                            onClick={() => {
                              const current = toNum(state.heaterCount ?? 2);
                              setState(prev => ({ ...prev, heaterCount: Math.max(0, current - 1) }));
                            }}
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors font-black text-xl select-none shrink-0 border border-white/5 shadow-md active:scale-90"
                          >
                            -
                          </button>
                          <input 
                            key="heater-count-in"
                            type="text"
                            inputMode="numeric"
                            value={state.heaterCount ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                setState(prev => ({ ...prev, heaterCount: val }));
                              }
                            }}
                            className="bg-transparent text-2xl font-black text-center text-white flex-1 outline-none font-mono focus:text-red-400 transition-colors w-full"
                          />
                          <button 
                            key="inc-heater"
                            type="button"
                            onClick={() => {
                              const current = toNum(state.heaterCount ?? 2);
                              setState(prev => ({ ...prev, heaterCount: current + 1 }));
                            }}
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors font-black text-xl select-none shrink-0 border border-white/5 shadow-md active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Heater Power selection with chips */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">قدرة الهيتر الواحد بالوات</label>
                          <span className="text-xs font-mono font-black text-rose-400 bg-rose-400/5 px-2 py-0.5 rounded border border-rose-400/10 shrink-0">{(toNum(state.heaterPower ?? 15000)).toLocaleString()} وات</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[5000, 10000, 15000, 20000].map((watts) => (
                            <button
                              key={watts}
                              type="button"
                              onClick={() => setState(prev => ({ ...prev, heaterPower: watts }))}
                              className={`py-2 px-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                toNum(state.heaterPower) === watts 
                                  ? 'bg-red-500 text-white font-black border-red-400 shadow-md shadow-red-500/10' 
                                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                              }`}
                            >
                              {(watts / 1000)} kW
                            </button>
                          ))}
                        </div>
                        <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5">
                          <span className="text-[10px] text-slate-500 font-black shrink-0">تحديد قدرة مخصصة:</span>
                          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-xl">
                            <input 
                              type="text"
                              inputMode="numeric"
                              value={state.heaterPower ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d*$/.test(val)) {
                                  setState(prev => ({ ...prev, heaterPower: val }));
                                }
                              }}
                              placeholder="مثال: 25000"
                              className="bg-transparent py-0 px-1 text-xs font-bold text-center text-white w-24 outline-none font-mono"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">W</span>
                          </div>
                        </div>
                      </div>

                      {/* Educational panel */}
                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed text-right p-4 bg-slate-950/20 rounded-2xl border border-white/5">
                        💡 تلميح: أنظمة التدفئة المركزية النفاثة (الهيترات) ممتازة في تأمين كسر سريع لموجات البرد الصقيعي داخل العنابر الكبيرة، وهي كفاءة يعتمد عليها في العنابر المحكمة بفضل التحكم الإلكتروني الدقيق.
                      </p>

                      {/* Power sum card */}
                      <div className="bg-gradient-to-l from-red-500/5 to-rose-500/5 p-4 rounded-2xl border border-red-500/10 flex justify-between items-center flex-wrap gap-2 shadow-inner">
                        <span className="text-xs font-bold text-slate-400">إجمالي قدرة الدفايات الفعلية:</span>
                        <span className="text-sm font-mono font-black text-rose-400">
                          {((toNum(state.heaterCount ?? 2) * toNum(state.heaterPower ?? 15000)) / 1000).toFixed(2)} كيلووات
                        </span>
                      </div>

                    </div>
                  </Card>
                )}
              </div>

              {/* Thermal Load Diagnostic (Intel Engine Card) */}
              {(() => {
                const area = toNum(state.barnLength || 100) * toNum(state.barnWidth || 12);
                const actualArea = area > 0 ? area : 1200;
                const recommendedW = actualArea * 120;
                
                const m = state.heatingMethod || 'both';
                const bulbW = m === 'heater' ? 0 : (toNum(state.tungstenBulbCount ?? 20) * toNum(state.tungstenBulbPower ?? 200));
                const heaterW = m === 'bulb' ? 0 : (toNum(state.heaterCount ?? 2) * toNum(state.heaterPower ?? 15000));
                const totalInstalledW = bulbW + heaterW;
                
                const ratio = recommendedW > 0 ? (totalInstalledW / recommendedW) : 1;
                const percentage = Math.min(100, Math.round(ratio * 100));
                
                let ratingColor = "text-red-400";
                let ratingBg = "bg-red-500/10 border-red-500/20";
                let ratingLabel = "تغطية حرارية غير كافية للتحضين 🚨";
                let ratingAdvice = "سعة التدفئة الحالية في عنبرك منخفضة وتحت التحديد الآمن! قد ينجم عن هذا تفاوت في درجات حرارة الفرشة، تكدس القطعان حول مناطق الدفء وزيادة التعرض للنزلة الهوائية المعوية. ننصح بزيادة لمبات التنجستين الساخنة أو تشغيل دفاية إضافية لإكساب الصوص حيوية ممتازة.";
                
                if (ratio >= 0.9) {
                  ratingColor = "text-emerald-400";
                  ratingBg = "bg-emerald-500/10 border-emerald-500/20";
                  ratingLabel = "تغطية تدفئة مثالية ومضمونة ✅";
                  ratingAdvice = "تهانينا! لديك سعة توازن حرارية ممتازة قادرة على تغطية مساحة العنبر بالكامل في أقسى نوات البرد. هذا يضمن توزيع فرشة دافئة موحدة ومعدل نمو متجانس.";
                } else if (ratio >= 0.6) {
                  ratingColor = "text-yellow-400";
                  ratingBg = "bg-yellow-500/10 border-yellow-500/20";
                  ratingLabel = "التغطية مقبولة مع التنبيه للحذر ⚠️";
                  ratingAdvice = "قدرة التدفئة توفر المعدل الاعتيادي بنجاح، لكنها قد تتعرض للقصور النسبي في نوات الصقيع العاتية ليلاً. ننصح برفع العزل الحراري لمنافذ العنبر أو تجهيز بدائل للتدفئة كأمان إضافي.";
                }

                return (
                  <Card className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 blur-3xl pointer-events-none rounded-full" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" />
                          <h4 className="text-md font-black text-white">الكفاءة المعايرة وموازنة الاحتباس الحراري</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                          بناءً على مساحة العنبر المقدرة بـ <span className="text-white underline font-mono">{actualArea} م²</span>، وحساب متطلبات الفرشة والتحضين المعيارية بـ <span className="text-orange-400 font-bold font-sans">120 وات/م²</span>، تكون السعة المستهدفة لعنبرك هي <span className="text-white underline font-mono">{(recommendedW / 1000).toFixed(1)} كيلووات</span>.
                        </p>
                        
                        {/* Rating block */}
                        <div className={`p-4 rounded-2xl border ${ratingBg} space-y-1`}>
                          <p className={`text-[13px] font-black ${ratingColor}`}>{ratingLabel}</p>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">{ratingAdvice}</p>
                        </div>
                      </div>

                      {/* Visual gauge percentage circle */}
                      <div className="flex flex-col items-center justify-center shrink-0 bg-slate-950/50 p-6 rounded-3xl border border-white/5 w-full md:w-56 shadow-inner">
                        <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                          {/* Circle Background & Track with precise viewBox */}
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                            <circle 
                              cx="56" 
                              cy="56" 
                              r="46" 
                              className="stroke-slate-800" 
                              strokeWidth="8" 
                              fill="transparent" 
                            />
                            <circle 
                              cx="56" 
                              cy="56" 
                              r="46" 
                              className={ratio >= 0.9 ? "stroke-emerald-500" : ratio >= 0.6 ? "stroke-yellow-500" : "stroke-red-500"} 
                              strokeWidth="8" 
                              fill="transparent" 
                              strokeDasharray={`${2 * Math.PI * 46}`}
                              strokeDashoffset={`${2 * Math.PI * 46 * (1 - percentage / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white font-mono">{percentage}%</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">كفاءة التغطية</span>
                          </div>
                        </div>
                        
                        <div className="text-center font-bold text-xs space-y-1 w-full border-t border-white/5 pt-2 mt-1">
                          <p className="text-[10px] text-slate-400 flex justify-between px-2"><span>القدرة الفعلية:</span> <span className="text-white font-sans">{(totalInstalledW / 1000).toFixed(1)} kW</span></p>
                          <p className="text-[10px] text-slate-400 flex justify-between px-2"><span>القدرة المستهدفة:</span> <span className="text-orange-400 font-sans">{(recommendedW / 1000).toFixed(1)} kW</span></p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            </motion.div>
          )}

          {screen === 'climate' && (
             <motion.div 
             key="climate"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
           >
              <header className="px-2 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">إدارة الحرارة والتشخيص الذكي</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">عقل العنبر: ربط الحرارة بالحالة الفسيولوجية</p>
                </div>
              </header>

              {/* Input Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">درجات الحرارة المقاسة</p>
                       <Thermometer size={16} className="text-orange-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1 text-center">
                          <span className="text-[9px] font-bold text-slate-400 block">الداخلية</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={state.internalTemp}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                setState(prev => ({ ...prev, internalTemp: val }));
                              }
                            }}
                            className="bg-transparent text-2xl font-black text-white w-full outline-none text-center"
                          />
                       </div>
                       <div className="space-y-1 text-center">
                          <span className="text-[9px] font-bold text-slate-400 block">الخارجية</span>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={state.externalTemp}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                setState(prev => ({ ...prev, externalTemp: val }));
                              }
                            }}
                            className="bg-transparent text-2xl font-black text-white w-full outline-none text-center"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">بيانات الطائر الآلية</p>
                       <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">{state.age}</span>
                          <span className="text-[10px] font-bold text-slate-500">يوم</span>
                       </div>
                       <p className="text-[9px] text-emerald-400 font-bold">الوزن: {Math.round(dailyStats.weight)} جرام</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">حمولة اللحم</p>
                       <p className="text-md font-black text-white">{Math.round(herdBiomass).toLocaleString()} <span className="text-[9px] opacity-40">كجم</span></p>
                    </div>
                 </div>
              </div>

              {/* Heat Load Analysis Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="bg-slate-900/60 border-white/5 p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -z-10 group-hover:bg-orange-500/10 transition-colors duration-1000" />
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                          <Zap size={20} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-white">تحليل الأحمال الحرارية للقطيع</h4>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">إنتاج الحرارة الحيوية (Biological Heat)</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 shadow-inner">
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">الحرارة المحسوسة</span>
                          <div className="flex items-baseline gap-1">
                             <span className="text-xl font-black text-white">{(environmentalLoad.qSensibleBird / 1000).toFixed(2)}</span>
                             <span className="text-[8px] text-slate-500 font-bold">kW</span>
                          </div>
                       </div>
                       <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 shadow-inner">
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">الحرارة الكامنة</span>
                          <div className="flex items-baseline gap-1">
                             <span className="text-xl font-black text-blue-400">{(environmentalLoad.qLatentBird / 1000).toFixed(2)}</span>
                             <span className="text-[8px] text-slate-500 font-bold">kW</span>
                          </div>
                       </div>
                    </div>

                    <div className="mt-4 p-4 rounded-2xl bg-slate-950/40 border border-white/5">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الحرارة المنتجة</span>
                          <span className="text-xl font-black text-orange-400">{(environmentalLoad.qTotalBird / 1000).toFixed(1)} kW</span>
                       </div>
                       <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(environmentalLoad.qSensibleBird / (environmentalLoad.qTotalBird || 1)) * 100}%` }}
                            className="h-full bg-white transition-all duration-1000" 
                          />
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(environmentalLoad.qLatentBird / (environmentalLoad.qTotalBird || 1)) * 100}%` }}
                            className="h-full bg-blue-500 transition-all duration-1000" 
                          />
                       </div>
                       <div className="flex justify-between mt-2 opacity-50 px-1">
                         <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">الحرارة الجافة (جسم الطائر)</span>
                         <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">الحرارة الكامنة (تنفس وبخار)</span>
                       </div>
                    </div>
                 </Card>

                 <Card className="bg-slate-900/60 border-white/5 p-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -z-10 group-hover:bg-blue-500/10 transition-colors duration-1000" />
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <Wind size={20} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-white">اكتساب الحرارة الكلي للعنبر</h4>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">الحمل الحراري الإجمالي (House Load)</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-baseline justify-between mb-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الحمل الحراري</span>
                          <span className="text-3xl font-black text-white tracking-tighter">{(environmentalLoad.qTotalHouse / 1000).toFixed(1)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">kW</span></span>
                       </div>
                       
                       <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                          <div className="flex items-center gap-2 mb-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">توصية فنية</span>
                          </div>
                          <p className="text-[10.5px] font-bold text-slate-400 leading-relaxed text-right">
                            {state.environmentalLoadInsulation 
                              ? "⚠️ العزل الرديء يزيد بشكل كبير من الحرارة المكتسبة من جدران العنبر. يوصى بزيادة كثافة التبريد (الخلايا) لتعويض هذا النقص."
                              : "✅ العزل الجيد يحافظ على درجة الحرارة المستهدفة بكفاءة ويقلل من استهلاك الكهرباء في الشفاطات."
                            }
                            {" "}حمولة اللحم الكبيرة تتطلب سرعة هواء لا تقل عن 2.5 م/ث في الأعمار الكبيرة.
                          </p>
                       </div>
                    </div>
                 </Card>
              </div>

              {/* Diagnostic Engine Table */}
              <Card className="bg-slate-900/80 border-white/5 overflow-hidden">
                 <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500">
                          <Activity size={18} />
                       </div>
                       <h3 className="font-black text-white text-sm">محرك التشخيص اللحظي</h3>
                    </div>
                    <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                       المستهدف: {targetTemp}°م
                    </div>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                       <thead>
                          <tr className="bg-slate-950/50">
                             <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">العنصر</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-x border-white/5">القيمة الحالية</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">الحالة والتشخيص</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          <tr>
                             <td className="px-6 py-5 font-black text-white text-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                الحرارة الداخلية
                             </td>
                             <td className="px-6 py-5 border-x border-white/5">
                                <span className={cn(
                                   "text-lg font-black",
                                   tempDelta > 4 ? "text-red-500" : tempDelta > 1 ? "text-orange-400" : "text-emerald-400"
                                )}>{state.internalTemp}°م</span>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                   {tempDelta > 0 ? (
                                      <>
                                         <span className="w-6 h-6 bg-red-500/10 rounded flex items-center justify-center text-red-500"><AlertCircle size={14} /></span>
                                         <p className="text-xs font-bold text-red-400">⚠️ <span className="font-black">+{tempDelta.toFixed(1)} درجة</span> عن المثالي لعمر {state.age} يوم</p>
                                      </>
                                   ) : (
                                      <>
                                         <span className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-400"><Activity size={14} /></span>
                                         <p className="text-xs font-bold text-emerald-400">🟢 درجة حرارة مثالية لطائر في هذا العمر</p>
                                      </>
                                   )}
                                </div>
                             </td>
                          </tr>
                          <tr>
                             <td className="px-6 py-5 font-black text-white text-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                الحرارة الخارجية
                             </td>
                             <td className="px-6 py-5 border-x border-white/5">
                                <span className="text-lg font-black text-white">{state.externalTemp}°م</span>
                             </td>
                             <td className="px-6 py-5">
                                <p className={cn(
                                   "text-xs font-bold",
                                   toNum(state.externalTemp) < targetTemp ? "text-emerald-400" : "text-orange-400"
                                )}>
                                   {toNum(state.externalTemp) < targetTemp ? "🟢 مناسبة جداً لعمليات التبريد والتهوية" : "🟡 ضغط حراري خارجي مرتفع؛ اعتمد على الخلايا"}
                                </p>
                             </td>
                          </tr>
                          <tr>
                             <td className="px-6 py-5 font-black text-white text-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                الحرارة المحسوسة
                             </td>
                             <td className="px-6 py-5 border-x border-white/5">
                                <span className={cn(
                                   "text-lg font-black",
                                   realFeelTemp > targetTemp + 3 ? "text-red-500" : "text-emerald-400"
                                )}>{realFeelTemp}°م</span>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                   <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                                      Wind Chill: -{coolingFactor.toFixed(1)}°م
                                   </div>
                                   <p className="text-xs font-bold text-slate-400 italic">✅ وضع مستقر بفضل سرعة الهواء</p>
                                </div>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </Card>

              {/* Dynamic Alerts Section */}
              <div className="space-y-4">
                 <AnimatePresence>
                    {realFeelTemp > targetTemp + 3.5 && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="p-5 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-start gap-5"
                       >
                          <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                             <AlertCircle size={28} />
                          </div>
                          <div>
                             <h5 className="font-black text-red-400 text-sm">حالة إجهاد حراري مؤكدة!</h5>
                             <p className="text-xs text-slate-300 font-bold mt-1 leading-relaxed">
                                انتباه: خطر إجهاد حراري؛ كتلة اللحم الحالية ({Math.round(herdBiomass)} كجم) تنتج حرارة ذاتية عالية جداً. ارفع سرعة الهواء فوراً لتخفيف العبء الحراري.
                             </p>
                          </div>
                       </motion.div>
                    )}

                    {toNum(state.internalTemp) < targetTemp - 2 && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-start gap-5"
                       >
                          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                             <Droplets size={28} />
                          </div>
                          <div>
                             <h5 className="font-black text-blue-400 text-sm">خطر برودة (Cold Risk)</h5>
                             <p className="text-xs text-slate-300 font-bold mt-1 leading-relaxed">
                                الكتكوت في هذا العمر ({state.age} يوم) يحتاج لتدفئة إضافية؛ درجة الحرارة المستهدفة هي {targetTemp}°م. أغلق فتحات التهوية الزائدة فوراً.
                             </p>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* Action Plan */}
              <Card className="bg-blue-600 p-8 border-none relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                 
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-4">التوصية التشغيلية (Action Plan)</h4>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div className="flex-1 space-y-4">
                          <p className="text-2xl font-black text-white leading-tight">
                             بناءً على الفارق بين الحرارة الداخلية ({state.internalTemp}) والمستهدفة ({targetTemp})، 
                             yجب اتخاذ إجراء فوري.
                          </p>
                          <div className="bg-blue-700/50 p-4 rounded-xl border border-white/10">
                             <p className="text-sm font-black text-blue-100">
                                💡 الإجراء المقترح: <span className="text-white">
                                   {(() => {
                                     const cycleMinutes = 60 / toNum(state.cyclesPerHour);
                                     if (tempDelta > 4) {
                                       return `رفع التهوية للحد الأقصى عبر تشغيل عدد ${Math.ceil(maxFans)} شفاطات بكامل طاقتها (${cycleMinutes.toFixed(0)} دقيقة/دورة) دون توقف.`;
                                     }
                                     if (tempDelta > 1) {
                                       if (minFans < 0.9) {
                                         return "حول الشفاط الحالي لوضع التشغيل المستمر (إلغاء المؤقت) بدلاً من الدورات المتقطعة لتخفيف الحرارة.";
                                       }
                                       return `تشغيل شفاط إضافي (بإجمالي ${Math.ceil(minFans + 1)} شفاط) وتفعيل نظام التبريد لمدة 3 دقائق كل دورة.`;
                                     }
                                     return "الحفاظ على وضع التهوية الحالي ومراقبة الرطوبة.";
                                   })()}
                                </span>
                             </p>

                             {/* Timing Comparison Section */}
                             <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                                <div className="bg-blue-900/40 p-3 rounded-xl border border-white/5 text-right">
                                   <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">التشغيل الحالي</p>
                                   <div className="flex items-baseline gap-1 justify-end">
                                      <span className="text-xl font-black text-white">{(((minVentilation / totalActiveCapacity) * 60) / toNum(state.cyclesPerHour)).toFixed(1)}</span>
                                      <span className="text-[10px] font-bold text-blue-400">د/دورة</span>
                                   </div>
                                </div>
                                <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-400/20 text-right">
                                   <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 text-emerald-400">المطلوب للحل</p>
                                   <div className="flex items-baseline gap-1 justify-end">
                                      <span className="text-xl font-black text-white">
                                         {(() => {
                                            const currentOn = ((minVentilation / totalActiveCapacity) * 60) / toNum(state.cyclesPerHour);
                                            const maxOn = 60 / toNum(state.cyclesPerHour);
                                            if (tempDelta > 1) return maxOn.toFixed(1);
                                            if (tempDelta > 0) return Math.min(maxOn, currentOn + (tempDelta * 3)).toFixed(1);
                                            return currentOn.toFixed(1);
                                         })()}
                                      </span>
                                      <span className="text-[10px] font-bold text-emerald-500">د/دورة</span>
                                   </div>
                                </div>
                             </div>
                             <p className="text-[9px] text-blue-200/50 font-bold mt-2 text-center italic">
                                * دورة التهوية المعتمدة هي {(60 / toNum(state.cyclesPerHour)).toFixed(0)} دقيقة (يجب استمرار العمل حتى استقرار الحرارة)
                             </p>
                          </div>
                       </div>
                       
                          
                    </div>
                 </div>
              </Card>
            </motion.div>
          )}

          {screen === 'ventilation' && (
             <motion.div 
             key="ventilation"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="space-y-6"
           >
              <header className="px-2 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">نظام التهوية الذكي</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">إحصائيات وقدرات الشفاطات وإدارة التوزيع المتقطع</p>
                </div>
              </header>
              
              {/* Engineering Ventilation Load Section */}
              <Card className="border-s-4 border-s-indigo-600 bg-slate-900/60 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -z-10" />
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500">
                    <Wind size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white">متطلبات التهوية الهندسية</h4>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">بناءً على الحمل الحراري و Delta T</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الهواء المطلوب للتبريد</span>
                       <span className="text-3xl font-black text-white tracking-tighter">{Math.round(environmentalLoad.requiredAirflow).toLocaleString()} <span className="text-[10px] text-slate-500 font-bold uppercase ms-1">م³/ساعة</span></span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(100, (environmentalLoad.requiredAirflow / (totalActiveCapacity || 1)) * 100)}%` }}
                         className={cn(
                           "h-full transition-all duration-1000",
                           environmentalLoad.requiredAirflow <= totalActiveCapacity ? "bg-emerald-500" : "bg-red-500"
                         )}
                       />
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-40 italic">
                       <span>Delta T: {state.environmentalLoadDeltaT}</span>
                       <span>الحمل المحسوس: {(environmentalLoad.qSensibleHouse / 1000).toFixed(1)} kW</span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-2xl border flex flex-col gap-2 transition-all duration-500 shadow-lg shadow-black/20",
                    environmentalLoad.requiredAirflow <= totalActiveCapacity ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-red-500/5 border-red-500/10 text-red-400"
                  )}>
                     <div className="flex items-center gap-2">
                       {environmentalLoad.requiredAirflow <= totalActiveCapacity ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                       <span className="text-xs font-black">تحليل القدرة التشغيلية</span>
                     </div>
                     <p className="text-[10.5px] font-bold leading-relaxed opacity-80">
                        {environmentalLoad.requiredAirflow <= totalActiveCapacity 
                          ? `الشفاطات الحالية تغطي الاحتياج بكفاءة. سعة الفائض المتاحة: ${Math.round(totalActiveCapacity - environmentalLoad.requiredAirflow).toLocaleString()} م³/س.`
                          : `تحذير: القدرة المتوفرة (${totalActiveCapacity.toLocaleString()}) غير كافية لسحب الحرارة المكتسبة بناءً على فرق Delta T الحالي.`
                        }
                     </p>
                  </div>
                </div>
              </Card>

              <Card className="border-s-4 border-s-blue-600 bg-slate-900/60 border-white/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white">إحصائيات التهوية لكل طائر</h4>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">الاحتياج الفردي في عمر {state.age} يوم</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">احتياج الكتكوت الواحد</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">{(dailyStats.weight / 1000 * 0.7).toFixed(3)}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase">م³/ساعة</span>
                    </div>
                    <p className="text-[8px] text-blue-400 font-bold mt-1">تهوية صغرى</p>
                  </div>
                  <div className="p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">إجمالي احتياج القطيع</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-blue-400">{((dailyStats.weight / 1000 * 0.7) * toNum(state.totalChicks)).toFixed(0)}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase">م³/ساعة</span>
                    </div>
                    <p className="text-[8px] text-slate-500 font-bold mt-1">لعدد {toNum(state.totalChicks).toLocaleString()} طائر</p>
                  </div>
                </div>
              </Card>

              <Card className="border-s-4 border-s-emerald-600 bg-slate-900/60 border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-white">ساعة التهوية المتقطعة (Spec v2)</h4>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">توزيع زمن التشغيل لضمان استقرار جودة الهواء</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Input Side */}
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">قائمة الشفاطات</label>
                           <button 
                             onClick={() => {
                               const newFan: Fan = { id: `fan-${Date.now()}`, name: `شفاط جديد`, capacity: 5000, count: 1, isActive: true };
                               setState(prev => ({ ...prev, fans: [...(prev.fans || []), newFan] }));
                             }}
                             className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[8px] font-black hover:bg-emerald-600/30 transition-all"
                           >
                             <Plus size={10} />
                             إضافة شفاط
                           </button>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                           {(state.fans || []).map((fan, idx) => (
                             <div key={fan.id} className={cn("p-3 rounded-2xl border transition-all", fan.isActive ? "bg-slate-900 border-white/10" : "bg-slate-950/50 border-white/5 opacity-60")}>
                               <div className="flex items-center justify-between mb-3">
                                 <input 
                                   type="text"
                                   value={fan.name}
                                   onChange={e => {
                                     const newFans = [...(state.fans || [])];
                                     newFans[idx].name = e.target.value;
                                     setState(prev => ({ ...prev, fans: newFans }));
                                   }}
                                   className="bg-transparent border-none p-0 text-[11px] font-black text-white focus:ring-0 w-32"
                                 />
                                 <div className="flex items-center gap-2">
                                   <button 
                                     onClick={() => {
                                       const newFans = [...(state.fans || [])];
                                       newFans[idx].isActive = !newFans[idx].isActive;
                                       setState(prev => ({ ...prev, fans: newFans }));
                                     }}
                                     className={cn("w-8 h-4 rounded-full relative transition-colors", fan.isActive ? "bg-emerald-600" : "bg-slate-800")}
                                   >
                                     <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", fan.isActive ? "left-4.5" : "left-0.5")} />
                                   </button>
                                   <button 
                                       onClick={() => setFanToDeleteId(fan.id)}
                                       className="text-slate-600 hover:text-red-500 transition-colors p-1"
                                     >
                                       <Trash2 size={12} />
                                     </button>
                                 </div>
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                 <div>
                                   <label className="text-[7px] font-black text-slate-600 uppercase block mb-1">القدرة (م³/س)</label>
                                   <input 
                                     type="text"
                                     inputMode="decimal"
                                     value={fan.capacity}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                          const newFans = [...(state.fans || [])];
                                          newFans[idx].capacity = val;
                                          setState(prev => ({ ...prev, fans: newFans }));
                                        }
                                      }}
                                       className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-white font-black text-[10px] focus:border-emerald-500/50 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-black text-slate-600 uppercase block mb-1">العدد</label>
                                    <input 
                                      type="text"
                                      inputMode="numeric"
                                      value={fan.count}
                                     onChange={e => {
                                       const val = e.target.value;
                                       if (val === '' || /^\d*$/.test(val)) {
                                         const newFans = [...(state.fans || [])];
                                         newFans[idx].count = val;
                                         setState(prev => ({ ...prev, fans: newFans }));
                                       }
                                     }}
                                     className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1.5 text-white font-black text-[10px] focus:border-emerald-500/50 outline-none"
                                   />
                                 </div>
                               </div>
                             </div>
                           ))}
                           {(state.fans || []).length === 0 && (
                             <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-3xl">
                               <p className="text-[8px] font-black text-slate-600 uppercase">لا توجد شفاطات مضافة</p>
                             </div>
                           )}
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">إجمالي القدرة المتاحة:</span>
                            <span className="text-xs font-black text-emerald-400">{totalActiveCapacity.toLocaleString()} <span className="text-[7px] opacity-60">م³/س</span></span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">عدد مرات التشغيل بالساعة</label>
                         <div className="flex items-center gap-4">
                            <input 
                              type="range"
                              min="1"
                              max="12"
                              value={state.cyclesPerHour}
                              onChange={e => setState(prev => ({ ...prev, cyclesPerHour: parseInt(e.target.value) }))}
                              className="flex-1 appearance-none h-2 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.3)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 shadow-inner"
                               style={{
                                 background: `linear-gradient(to left, #10b981 0%, #10b981 ${( ( (Number(state.cyclesPerHour)) - 1) / (12 - 1) ) * 100}%, #1e293b ${( ( (Number(state.cyclesPerHour)) - 1) / (12 - 1) ) * 100}%, #1e293b 100%)`
                               }}
                            />
                            <span className="bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-lg min-w-[3rem] text-center shadow-lg shadow-emerald-500/20">{state.cyclesPerHour}</span>
                         </div>
                         <p className="text-[8px] text-slate-600 font-bold mt-1 text-right">
                           * يفضل 4-6 دورات بالساعة (كل 10-15 دقيقة) لضمان تجانس الهواء.
                         </p>
                       </div>

                       <div className="pt-4 border-t border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">الاحتياج (Min):</span>
                            <span className="text-sm font-black text-white">{minVentilation.toLocaleString()} <span className="text-[9px] opacity-40">م³/س</span></span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">الاحتياج (Max):</span>
                            <span className="text-sm font-black text-white">{maxVentilation.toLocaleString()} <span className="text-[9px] opacity-40">م³/س</span></span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Visual Clock */}
                  <div className="lg:col-span-2 bg-slate-950/80 p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                    <div className="relative w-64 h-64 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="58" fill="#020617" />
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        
                        {(() => {
                           const onRatio = Math.min(1, minVentilation / totalActiveCapacity);
                           const cycles = Math.max(1, toNum(state.cyclesPerHour));
                           const cycleDeg = 360 / cycles;
                           const onDeg = cycleDeg * onRatio;
                           
                           return Array.from({ length: cycles }).map((_, i) => {
                             const startAngle = i * cycleDeg;
                             const splitAngle = startAngle + onDeg;
                             return (
                               <g key={i}>
                                 <path 
                                   d={describeArc(60, 60, 48, splitAngle, startAngle + cycleDeg)} 
                                   className="fill-red-500/10 stroke-red-500/20" 
                                   strokeWidth="0.5"
                                 />
                                 {onRatio > 0 && (
                                   <path 
                                     d={describeArc(60, 60, 48, startAngle, splitAngle)} 
                                     className="fill-emerald-500 stroke-emerald-400 font-bold" 
                                     strokeWidth="0.5"
                                   />
                                 )}
                               </g>
                             );
                           });
                        })()}
                      </svg>
                      
                      {/* Hour labels */}
                      <div className="absolute inset-0 pointer-events-none">
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                          const angle = (i * 30 - 90) * (Math.PI / 180);
                          const r = 40;
                          return (
                            <div 
                              key={h}
                              className="absolute text-[9px] font-black text-slate-700 transform -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }}
                            >
                              {h}
                            </div>
                          );
                        })}
                      </div>

                      {/* CENTER COUNTDOWN */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         {(() => {
                            const now = currentTime;
                            const totalSecs = (now.getMinutes() * 60 + now.getSeconds() + (typeof state.ventilationOffset === 'number' ? state.ventilationOffset : 0));
                            const cycles = Math.max(1, toNum(state.cyclesPerHour));
                            const cycleSecs = 3600 / cycles; 
                            const onRatio = minVentilation / (totalActiveCapacity || 1);
                            const onSecs = onRatio * cycleSecs;
                            const progress = ((totalSecs % cycleSecs) + cycleSecs) % cycleSecs;
                            const active = progress < onSecs;
                            const remaining = active ? onSecs - progress : cycleSecs - progress;
                            
                             const formatFullTime = (s: number) => {
                                const h = Math.floor(s / 3600);
                                const m = Math.floor((s % 3600) / 60);
                                const sc = Math.floor(s % 60);
                                return { h, m, s: sc };
                             };

                             const timeObj = formatFullTime(remaining);

                             if (isEditingTimer) {
                               return (
                                 <div className="text-center bg-slate-900/90 backdrop-blur-sm p-4 rounded-3xl border border-emerald-500/30 z-10 shadow-2xl scale-110 pointer-events-auto">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-3">تعديل المؤقت</p>
                                    <div className="flex items-center gap-1 justify-center mb-4">
                                       <div className="flex flex-col items-center">
                                          <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, h: Math.min(99, p.h + 1) }))} className="text-slate-500 hover:text-white pb-1"><ChevronUp size={14} /></button>
                                          <input 
                                            type="text" 
                                            value={editTimerTime.h.toString().padStart(2, '0')}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => {
                                              const v = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                              setEditTimerTime(p => ({ ...p, h: Math.min(99, v) }));
                                            }}
                                            className="w-8 bg-slate-800 border border-white/10 rounded-md text-center text-sm font-black py-1 focus:border-emerald-500 outline-none"
                                          />
                                         <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, h: Math.max(0, p.h - 1) }))} className="text-slate-500 hover:text-white pt-1"><ChevronDown size={14} /></button>
                                      </div>
                                      <span className="text-slate-500 font-bold">:</span>
                                      <div className="flex flex-col items-center">
                                         <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, m: (p.m + 1) % 60 }))} className="text-slate-500 hover:text-white pb-1"><ChevronUp size={14} /></button>
                                         <input 
                                           type="text" 
                                           value={editTimerTime.m.toString().padStart(2, '0')}
                                           onFocus={(e) => e.target.select()}
                                           onChange={e => {
                                             const v = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                             setEditTimerTime(p => ({ ...p, m: Math.min(59, v) }));
                                           }}
                                           className="w-8 bg-slate-800 border border-white/10 rounded-md text-center text-sm font-black py-1 focus:border-emerald-500 outline-none"
                                         />
                                         <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, m: (p.m + 59) % 60 }))} className="text-slate-500 hover:text-white pt-1"><ChevronDown size={14} /></button>
                                      </div>
                                      <span className="text-slate-500 font-bold">:</span>
                                      <div className="flex flex-col items-center">
                                         <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, s: (p.s + 1) % 60 }))} className="text-slate-500 hover:text-white pb-1"><ChevronUp size={14} /></button>
                                         <input 
                                           type="text" 
                                           value={editTimerTime.s.toString().padStart(2, '0')}
                                           onFocus={(e) => e.target.select()}
                                           onChange={e => {
                                             const v = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                             setEditTimerTime(p => ({ ...p, s: Math.min(59, v) }));
                                           }}
                                           className="w-8 bg-slate-800 border border-white/10 rounded-md text-center text-sm font-black py-1 focus:border-emerald-500 outline-none"
                                         />
                                         <button type="button" onClick={() => setEditTimerTime(p => ({ ...p, s: (p.s + 59) % 60 }))} className="text-slate-500 hover:text-white pt-1"><ChevronDown size={14} /></button>
                                      </div>
                                   </div>
                                   <div className="flex gap-2">
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const newSecs = editTimerTime.h * 3600 + editTimerTime.m * 60 + editTimerTime.s;
                                          const targetProgress = active ? onSecs - newSecs : cycleSecs - newSecs;
                                          const currentRawSecs = now.getMinutes() * 60 + now.getSeconds();
                                          const newOffset = targetProgress - currentRawSecs;
                                          setState(prev => ({ ...prev, ventilationOffset: newOffset }));
                                          setIsEditingTimer(false);
                                        }}
                                        className="bg-emerald-600 px-3 py-1.5 rounded-lg text-[8px] font-black hover:bg-emerald-500 transition-colors text-white"
                                      >
                                        تأكيد
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => setIsEditingTimer(false)}
                                        className="bg-slate-800 px-3 py-1.5 rounded-lg text-[8px] font-black hover:bg-slate-700 transition-colors text-slate-300"
                                      >
                                        إلغاء
                                      </button>
                                   </div>
                                </div>
                              );
                            }
                            return (
                              <div className="text-center pointer-events-auto">
                                 <div className={cn(
                                   "mb-2 px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-[0.2em] inline-block transition-all",
                                   active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 animate-pulse" : "bg-red-500/20 text-red-400 border border-red-500/10"
                                 )}>
                                   {active ? "يتم التشغيل الآن" : "في دورة السكون"}
                                 </div>
                                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    مؤقت التشغيل الرقمي
                                 </p>
                                 <div className="relative mb-4">
                                   <p className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                     {formatTime(state.manualTimerSeconds)}
                                   </p>
                                 </div>

                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => setState(prev => ({ ...prev, isManualTimerRunning: !prev.isManualTimerRunning }))}
                                      className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg",
                                        state.isManualTimerRunning ? "bg-red-600/20 text-red-400 border border-red-500/30" : "bg-emerald-600 text-white shadow-emerald-500/20"
                                      )}
                                    >
                                      {state.isManualTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                    </button>
                                    
                                    <button 
                                      onClick={() => setState(prev => ({ ...prev, manualTimerSeconds: 0, isManualTimerRunning: false }))}
                                      className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border border-white/10 hover:bg-slate-700 transition-all active:scale-95"
                                    >
                                      <RotateCcw size={16} />
                                    </button>
                                 </div>

                                 <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                                   <div className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter">
                                     {active ? "باقي على الإيقاف" : "باقي على التشغيل"}: {timeObj.h > 0 ? `${timeObj.h}:${timeObj.m.toString().padStart(2, '0')}:${timeObj.s.toString().padStart(2, '0')}` : `${timeObj.m}:${timeObj.s.toString().padStart(2, '0')}`}
                                   </div>
                                   <div className="text-[6px] font-bold text-slate-700 italic cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => setIsEditingTimer(true)}>
                                      انقر للتعديل • دورة الـ {(cycleSecs / 60).toFixed(0)} دقيقة
                                   </div>
                                   {state.ventilationOffset !== 0 && (
                                     <button 
                                       type="button" 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setState(prev => ({ ...prev, ventilationOffset: 0 }));
                                       }}
                                       className="block w-full text-[6px] font-black text-slate-500 uppercase hover:text-emerald-400 mt-1"
                                     >
                                       إعادة ضبط للوقت الفعلي
                                     </button>
                                   )}
                                 </div>
                              </div>
                            );
                         })()}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {screen === 'humidity' && (
             <motion.div 
             key="humidity"
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 1.02 }}
             className="space-y-6 pb-24"
           >
              <header className="flex items-center justify-between px-2 py-4 border-b border-white/5 bg-slate-900/40 -mx-4 sm:-mx-6 mb-6">
                <div className="flex items-center gap-4 px-4 sm:px-6">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <Droplets size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">مؤشر الإجهاد والرطوبة</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 grayscale opacity-70">
                      <Settings size={10} /> تشخيص الحالة الحرارية الحالية للعنبر
                    </p>
                  </div>
                </div>
              </header>

              {/* DASHBOARD GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. INPUT & GAUGE SECTION */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* MAIN STATUS CARD */}
                  <Card className="bg-slate-900 border-white/5 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] -z-10 transition-all duration-1000" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
                      {/* Gauge Area */}
                      <div className="flex flex-col items-center justify-center space-y-6 bg-slate-950/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                        <div className="relative w-48 h-48">
                          <svg className="w-full h-full transform -rotate-225" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeDasharray="198 264" strokeLinecap="round" />
                            <motion.circle 
                              cx="50" cy="50" r="42" fill="none" 
                              stroke={thi < targetThi - 0.5 ? "#3b82f6" : thi < targetThi + 1.5 ? "#10b981" : thi <= targetThi + 4 ? "#f59e0b" : "#ef4444"} 
                              strokeWidth="10" 
                              strokeDasharray={`${Math.max(0, Math.min(198, (thi / 100) * 198))} 264`} 
                              strokeLinecap="round" 
                              className="transition-all duration-1000 ease-out"
                              initial={{ strokeDasharray: "0 264" }}
                              animate={{ strokeDasharray: `${Math.max(0, Math.min(198, (thi / 100) * 198))} 264` }}
                            />
                            <motion.circle 
                              cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" 
                              strokeDasharray="1 264" strokeDashoffset={-((targetThi / 100) * 198)} strokeLinecap="round"
                            />
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">المؤشر الحالي</p>
                            <div className="flex items-baseline gap-0.5">
                              <span className={cn(
                                "text-4xl font-black tracking-tighter",
                                thi < targetThi - 0.5 ? "text-blue-400" : thi < targetThi + 1.5 ? "text-emerald-400" : thi <= targetThi + 4 ? "text-orange-400" : "text-red-500"
                              )}>
                                {Math.round(thi)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600">THI</span>
                            </div>
                            <div className={cn(
                              "mt-2 px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                              thi < targetThi - 2 ? "bg-blue-600/10 border-blue-500/20 text-blue-400" :
                              thi < targetThi - 0.5 ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                              thi < targetThi + 1.5 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                              thi <= targetThi + 4 ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                              "bg-red-500/10 border-red-500/20 text-red-500"
                            )}>
                              {thi < targetThi - 2 ? "برودة شديدة" : thi < targetThi - 0.5 ? "مائل للبرودة" : thi < targetThi + 1.5 ? "مثالي" : thi <= targetThi + 4 ? "تنبيه" : "خطر"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">المؤشر المستهدف للعمر</span>
                            <span className="text-white">{targetThi} THI</span>
                          </div>
                          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                             <div 
                               className="h-full bg-cyan-500 transition-all duration-500" 
                               style={{ width: `${Math.min(100, (targetThi / 120) * 100)}%` }}
                             />
                          </div>
                        </div>
                      </div>

                      {/* Inputs Area */}
                      <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                               <Thermometer size={16} />
                             </div>
                             <h4 className="text-sm font-black text-white">قراءة العنبر الحالية</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block pr-2">درجة الحرارة المستمرة</label>
                               <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                                  <button onClick={() => {
                                    const currentVal = toNum(state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp);
                                    const newVal = (currentVal - 0.1).toFixed(1);
                                    setState(prev => ({ 
                                      ...prev, 
                                      dailyInternalTemp: { ...prev.dailyInternalTemp, [currentAgeStr]: newVal },
                                      internalTemp: newVal // Update global too for first-time sync
                                    }));
                                  }} className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shadow-orange-500/5 group/btn shrink-0"><Minus size={14} strokeWidth={4} className="group-active/btn:scale-75 transition-transform" /></button>
                                  <input type="text" inputMode="decimal" value={state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp} onChange={e => { 
                                    const val = e.target.value; 
                                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                      setState(prev => ({ 
                                        ...prev, 
                                        dailyInternalTemp: { ...prev.dailyInternalTemp, [currentAgeStr]: val },
                                        internalTemp: val // Update global too for first-time sync
                                      }));
                                    }
                                  }} className="bg-transparent text-center font-black text-white text-2xl flex-1 outline-none font-mono min-w-0" />
                                  <button onClick={() => {
                                    const currentVal = toNum(state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp);
                                    const newVal = (currentVal + 0.1).toFixed(1);
                                    setState(prev => ({ 
                                      ...prev, 
                                      dailyInternalTemp: { ...prev.dailyInternalTemp, [currentAgeStr]: newVal },
                                      internalTemp: newVal // Update global too for first-time sync
                                    }));
                                  }} className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shadow-orange-500/5 group/btn shrink-0"><Plus size={14} strokeWidth={4} className="group-active/btn:scale-75 transition-transform" /></button>
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block pr-2">الرطوبة النسبية (%)</label>
                               <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                                  <button onClick={() => {
                                    const currentVal = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                                    const newVal = Math.max(0, currentVal - 1).toFixed(0);
                                    setState(prev => ({ 
                                      ...prev, 
                                      dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: newVal },
                                      currentHumidity: newVal // Update global too for first-time sync
                                    }));
                                  }} className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shadow-cyan-500/5 group/btn shrink-0"><Minus size={14} strokeWidth={4} className="group-active/btn:scale-75 transition-transform" /></button>
                                  <input type="text" inputMode="decimal" value={state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity} onChange={e => { 
                                    const val = e.target.value; 
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                      setState(prev => ({ 
                                        ...prev, 
                                        dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: val },
                                        currentHumidity: val // Update global too for first-time sync
                                      }));
                                    }
                                  }} className="bg-transparent text-center font-black text-white text-2xl flex-1 outline-none font-mono min-w-0" />
                                  <button onClick={() => {
                                    const currentVal = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                                    const newVal = Math.min(100, currentVal + 1).toFixed(0);
                                    setState(prev => ({ 
                                      ...prev, 
                                      dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: newVal },
                                      currentHumidity: newVal // Update global too for first-time sync
                                    }));
                                  }} className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shadow-cyan-500/5 group/btn shrink-0"><Plus size={14} strokeWidth={4} className="group-active/btn:scale-75 transition-transform" /></button>
                               </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                           <div className="text-[9px] font-black text-slate-500 leading-relaxed">
                            * أدخل القراءات الحالية التي تظهر على لوحة التحكم أو الحساسات في العنبر للحصول على تشخيص دقيق.
                           </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* DIAGNOSTIC ALERT SECTION */}
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={`${state.age}-${thi < targetThi - 0.5 ? "cold" : "heat"}`}
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "p-6 rounded-[2.5rem] border backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-6",
                        thi < targetThi - 2 ? "bg-blue-500/5 border-blue-500/20" :
                        thi < (targetThi + 1.5) ? "bg-emerald-500/5 border-emerald-500/20" :
                        "bg-red-500/5 border-red-500/20"
                      )}
                    >
                      {/* Status Accent Bar */}
                      <div className={cn(
                        "absolute top-0 bottom-0 left-0 w-1.5 opacity-40",
                        thi < targetThi - 2 ? "bg-blue-500" : thi < targetThi + 1.5 ? "bg-emerald-500" : "bg-red-500"
                      )} />

                      <div className="flex items-center gap-5 flex-1 w-full">
                        <div className={cn(
                          "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 border",
                          thi < targetThi - 2 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                          thi < targetThi + 1.5 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          <AlertCircle size={32} />
                        </div>
                        
                        <div className="space-y-1.5 text-right sm:text-right flex-1">
                           <div className="flex items-center justify-between sm:justify-start gap-2">
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 block">تحليل الحالة لعمر {state.age} يوم</span>
                           </div>
                           <h4 className="text-base font-black text-white leading-tight">
                              {thi < targetThi - 2 ? (
                                <>الوضع <span className="text-blue-400">تحت النطاق المستهدف</span></>
                              ) : thi < targetThi - 0.5 ? (
                                <>الوضع <span className="text-cyan-400">أبرد من المطلوب</span></>
                              ) : thi < targetThi + 1.5 ? (
                                <>الوضع <span className="text-emerald-400">ضمن النطاق المثالي</span></>
                              ) : (
                                <>الوضع <span className="text-red-400">يتجاوز النطاق الآمن</span></>
                              )}
                           </h4>
                           <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-sm">
                              {thi < targetThi - 2 ? "يجب زيادة التدفئة فوراً وإغلاق أي تسريبات هواء بارد لمنع الإجهاد البردي." :
                               thi < targetThi - 0.5 ? "تأكد من عدم وجود تيارات هوائية مباشرة على الكتاكيت ورفع الحرارة تدريجياً." :
                               thi < targetThi + 1.5 ? "الطيور في حالة راحة تامة. استمر في مراقبة النظام والتهوية بانتظام." :
                               "خطر إجهاد حراري! يجب زيادة سرعة الهواء وتفعيل تبريد الخلايا فوراً."}
                           </p>
                        </div>
                      </div>
                      
                      {/* Metric Comparison Box */}
                      <div className="flex flex-col items-center justify-center bg-slate-950/50 px-6 py-4 rounded-3xl border border-white/5 shrink-0 w-full sm:w-auto">
                         <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">الفرق عن الهدف</div>
                         <div className="flex items-center gap-3">
                            <div className={cn(
                              "text-3xl font-black tabular-nums tracking-tighter",
                              Math.abs(thi - targetThi) < 1.5 ? "text-emerald-400" : 
                              thi > targetThi ? "text-red-400" : "text-blue-400"
                            )}>
                              {thi > targetThi ? "+" : ""}{(thi - targetThi).toFixed(1)}
                            </div>
                            <div className={cn(
                              "w-1.5 h-10 rounded-full",
                              thi > targetThi ? "bg-red-500" : "bg-blue-500"
                            )} />
                         </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Moisture Production Insight */}
                  <Card className="bg-slate-900 border-white/5 p-6 border-b-4 border-b-cyan-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[40px] -z-10" />
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                         <Droplet size={20} />
                       </div>
                       <div>
                         <h4 className="text-sm font-black text-white leading-none">إنتاج الرطوبة الهيكلي</h4>
                         <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">الميزان المائي للقطيع</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex items-baseline justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المعدل اليومي للقطيع</span>
                         <span className="text-3xl font-black text-cyan-400 tracking-tighter">{Math.round(environmentalLoad.moisturePerDayKg)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">كجم / يوم</span></span>
                       </div>
                       
                       <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                          <p className="text-[10.5px] font-bold text-slate-400 leading-relaxed text-right">
                             {(() => {
                                const currentH = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                                if (currentH > targetHumidity.max) {
                                   return "⚠️ الرطوبة مرتفعة؛ الطيور تفرز بخار ماء بمعدل عالٍ. يجب زيادة معدلات سحب الهواء لتجنب ابتلال الفرشة وإصابة الطيور بأمراض تنفسية.";
                                 } else if (currentH < targetHumidity.min) {
                                   return "⚠️ الرطوبة منخفضة؛ العنبر جاف جداً مما قد يؤدي لجفاف الطيور وانتشار الغبار. يوصى بتشغيل المرطبات (Humidifiers) أو تقليل التهوية الزائدة عن الحد الأدنى.";
                                 } else {
                                   return "✅ الرطوبة مثالية؛ تأكد من استمرار التهوية بالحد الأدنى لسحب الرطوبة الناتجة عن تنفس القطيع وفضلاته للحفاظ على هذا النطاق.";
                                 }
                             })()}
                          </p>
                       </div>
                    </div>
                  </Card>
                </div>

                {/* 2. TARGET PROFILE SECTION */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-cyan-500">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                          <Target size={20} />
                        </div>
                        <h3 className="text-lg font-black text-white">الاحتياج المثالي لهذا العمر</h3>
                     </div>

                     <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الحرارة المستهدفة</span>
                              <span className="text-orange-400 font-black">{targetTemp}°م</span>
                           </div>
                           <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${(targetTemp / 40) * 100}%` }} />
                           </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الرطوبة المستهدفة</span>
                              <span className="text-cyan-400 font-black">{targetHumidity.min}-{targetHumidity.max}%</span>
                           </div>
                           <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${(targetHumidity.min + targetHumidity.max) / 2}%` }} />
                           </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 space-y-3">
                           <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Info size={12} /> معلومة حيوية
                           </h5>
                           <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                            في هذا العمر ({state.age} يوم)، يحتاج الطائر لبيئة حرارية مستقرة. مؤشر {targetThi} هو الذي يضمن عدم استنزاف طاقة الطائر في تنظيم حرارة جسمه، وتوجيهها بدلاً من ذلك للنمو.
                           </p>
                        </div>
                        
                        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase">يوم الدورة</span>
                            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-black text-white">{state.age} يوم</span>
                        </div>
                     </div>
                  </Card>

                  {/* WIND CHILL CARD */}
                  <Card className="bg-slate-900 border-white/5 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-orange-600/5 blur-[50px] -z-10 group-hover:bg-orange-600/10 transition-all" />
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Wind size={18} />
                      </div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-widest">إحساس البرودة (Wind Chill)</h4>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-baseline justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">سرعة الهواء المطلوبة</p>
                          <p className="text-4xl font-black text-white tracking-tighter">
                            {toNum(state.currentHumidity) > 75 ? "2.5" : toNum(state.currentHumidity) > 60 ? "2.0" : "1.5"}
                            <span className="text-[10px] text-slate-600 font-bold ms-2 uppercase">م/ثانية</span>
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">خفض حرارة شعوري</p>
                          <p className="text-2xl font-black text-orange-500">-{coolingFactor.toFixed(1)} <span className="text-xs">°م</span></p>
                        </div>
                      </div>

                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex gap-1 p-0.5">
                         {[1, 2, 3, 4, 5].map(i => (
                           <div key={i} className={cn(
                             "flex-1 rounded-full transition-all duration-700",
                             (toNum(state.currentHumidity) > 60 && i <= 3) || (toNum(state.currentHumidity) > 75 && i <= 5) || (toNum(state.currentHumidity) <= 60 && i <= 2)
                             ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                             : "bg-slate-800"
                           )} />
                         ))}
                      </div>

                      <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-right italic">
                          {toNum(state.currentHumidity) > 75 
                            ? "⚠️ الرطوبة المرتفعة تمنع تبخر العرق. يجب زيادة سرعة الهواء لتبريد الطيور بالحمل الحراري."
                            : "الرطوبة في نطاق يسمح بالتبريد بتبخير الماء، سرعة هوائية معتدلة كافية."}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* SMART ALERTS PANEL */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">تنبيهات النظام الذكية</h4>
                       <div className="flex gap-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", toNum(state.currentHumidity) > 75 ? "bg-red-500 animate-pulse" : "bg-slate-700")} />
                          <div className={cn("w-1.5 h-1.5 rounded-full", toNum(state.internalTemp) > 33 ? "bg-orange-500 animate-pulse" : "bg-slate-700")} />
                       </div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {toNum(state.currentHumidity) > 75 && (
                          <motion.div 
                            key="high-humidity-alert"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 group hover:bg-red-500/10 transition-colors"
                          >
                             <div className="p-2 bg-red-500/20 rounded-xl text-red-500 shadow-lg shadow-red-500/10 transition-transform group-hover:scale-110">
                                <Droplets size={16} />
                             </div>
                             <div>
                                <p className="text-xs font-black text-red-400">تنبيه الرطوبة الحرجة</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-snug">أوقف طلمبات التبريد فوراً لمنع اختناق الطيور. اعتمد على سحب الشفاطات فقط.</p>
                             </div>
                          </motion.div>
                        )}

                        {toNum(state.internalTemp) > 30 && toNum(state.currentHumidity) > 65 && (
                          <motion.div 
                            key="condensation-alert"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-3 group hover:bg-orange-500/10 transition-colors"
                          >
                             <div className="p-2 bg-orange-500/20 rounded-xl text-orange-500 shadow-lg shadow-orange-500/10 transition-transform group-hover:scale-110">
                                <Thermometer size={16} />
                             </div>
                             <div>
                                <p className="text-xs font-black text-orange-400">خطر تكثيف المياه</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-snug">احتمالية عالية لتبلل الفرشة. ارفع درجة حرارة حساس التبريد +1 درجة.</p>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="p-5 bg-gradient-to-br from-slate-900/80 to-slate-950 border border-white/5 rounded-[2rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/10 rounded-full blur-xl group-hover:w-20 group-hover:h-20 transition-all duration-700" />
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                             <Info size={18} />
                           </div>
                           <div className="flex-1">
                             <p className="text-[11px] text-white font-black leading-tight">توصية الخبير</p>
                             <p className="text-[9px] text-slate-500 font-bold mt-1 leading-relaxed">
                                {thi > targetThi + 2 
                                  ? "يفضل تقديم فيتامين C في ماء الشرب لمساعدة الطيور على تحمل الإجهاد الناتج عن الرطوبة العالية."
                                  : "حافظ على دورية عمل شفاطات التهوية الدنيا لضمان تبدل الهواء دون تبريد مفاجئ."}
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECONDARY TOOLS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COOLING PADS EFFICIENCY */}
                <Card className="bg-slate-900 border-white/5 border-b-4 border-b-blue-600/50 p-6 flex flex-col group">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 shadow-inner ring-1 ring-white/5">
                             <Layers size={20} />
                           </div>
                           <div>
                             <h4 className="font-black text-lg text-white">كفاءة خلايا التبريد</h4>
                             <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">توازن الضغط والسحب</p>
                           </div>
                         </div>
                         <button 
                           onClick={() => {
                             const newPad: CoolingPad = { id: `cp-${Date.now()}`, name: `خلية ${state.coolingPads.length + 1}`, area: 5 };
                             setState(prev => ({ ...prev, coolingPads: [...prev.coolingPads, newPad] }));
                           }}
                           className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center hover:bg-blue-600/20 transition-all active:scale-95 border border-blue-500/20"
                         >
                           <Plus size={16} />
                         </button>
                      </div>

                      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                        {state.coolingPads.map((pad, idx) => (
                          <div key={pad.id} className="p-3 bg-slate-950/30 rounded-xl border border-white/5 group transition-all hover:border-blue-500/30 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-600 border border-white/5">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <input 
                                type="text"
                                value={pad.name}
                                onChange={e => {
                                  const newName = e.target.value;
                                  setState(prev => ({ ...prev, coolingPads: prev.coolingPads.map(p => p.id === pad.id ? { ...p, name: newName } : p) }));
                                }}
                                className="bg-transparent border-none text-[11px] font-black text-slate-300 w-full focus:outline-none focus:text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-white/5 focus-within:border-blue-500/50 transition-colors">
                                <input 
                                  type="text" inputMode="decimal" value={pad.area}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                      setState(prev => ({ ...prev, coolingPads: prev.coolingPads.map(p => p.id === pad.id ? { ...p, area: val } : p) }));
                                    }
                                  }}
                                  className="w-12 bg-transparent border-none text-right font-black text-white focus:outline-none text-xs"
                                />
                                <span className="text-[8px] font-black text-slate-500">م²</span>
                              </div>
                              <button 
                                onClick={() => setPadToDelete(pad)}
                                className="w-7 h-7 rounded-lg bg-red-500/5 text-slate-500 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
                         <div className="flex items-end justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الإجمالي الحالي</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-white">{totalCoolingPadArea.toFixed(1)}</span>
                                <span className="text-[10px] font-bold text-slate-600">M²</span>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المطلوب للسحب</p>
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-black text-slate-400">{(totalActiveCapacity / 5000).toFixed(1)}</span>
                                <span className="text-[10px] font-bold text-slate-600">M²</span>
                              </div>
                            </div>
                         </div>

                         {(() => {
                           const requiredArea = totalActiveCapacity / 5000;
                           const balance = (totalCoolingPadArea / requiredArea) * 100;
                           const sufficiency = totalCoolingPadArea >= requiredArea;
                           return (
                             <div className="space-y-3">
                               <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min(100, balance)}%` }}
                                   className={cn(
                                     "h-full transition-all duration-1000",
                                     sufficiency ? "bg-emerald-500" : "bg-red-500"
                                   )}
                                 />
                               </div>
                               <div className={cn(
                                 "p-3 rounded-xl border flex items-center gap-3 transition-all",
                                 sufficiency ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500/80" : "bg-red-500/5 border-red-500/10 text-red-400"
                               )}>
                                 {sufficiency ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                 <p className="text-[10px] font-black leading-tight uppercase tracking-wide">
                                   {sufficiency ? "تم تحقيق المساحة المطلوبة" : "مساحة الخلايا غير كافية للسحب الحالي"}
                                 </p>
                               </div>
                             </div>
                           );
                         })()}
                      </div>
                    </Card>

                    {/* PUMP TIMER CONTROL */}
                    <Card className="bg-slate-900 border-white/5 border-b-4 border-b-cyan-600/50 p-6 flex flex-col">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-cyan-600/10 rounded-xl flex items-center justify-center text-cyan-500 shadow-inner ring-1 ring-white/5">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-white">مؤقت الطلمبة</h4>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">التحكم في مستويات الرطوبة</p>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center py-4">
                        <div className="relative w-40 h-40">
                           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                              <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeDasharray="314 314" />
                              
                              {(() => {
                                 const sumTimes = toNum(state.pumpOnTime) + toNum(state.pumpOffTime);
                                 if (sumTimes <= 0) return null;
                                 const cycles = 60 / sumTimes;
                                 const cycleDeg = 360 / cycles;
                                 const onRatio = toNum(state.pumpOnTime) / sumTimes;
                                 const onDeg = cycleDeg * onRatio;
                                 
                                 return Array.from({ length: Math.ceil(cycles) }).map((_, i) => {
                                   const startAngle = i * cycleDeg;
                                   const endAngle = startAngle + onDeg;
                                   return (
                                     <path 
                                       key={i}
                                       d={describeArc(60, 60, 50, startAngle, endAngle)} 
                                       className="fill-none stroke-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                                       strokeWidth="6"
                                       strokeLinecap="round"
                                     />
                                   );
                                 });
                              })()}
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping mb-2 shadow-[0_0_15px_rgba(6,182,212,1)]" />
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">تلقائي</p>
                              <p className="text-[8px] font-bold text-slate-500 mt-0.5">{(toNum(state.pumpOnTime) + toNum(state.pumpOffTime)) > 0 ? (60 / (toNum(state.pumpOnTime) + toNum(state.pumpOffTime))).toFixed(0) : 0} دورات/س</p>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block text-center">تشغيل (دقيقة)</label>
                           <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
                              <button 
                                onClick={() => setState(prev => ({ ...prev, pumpOnTime: Math.max(0, toNum(prev.pumpOnTime) - 0.5) }))}
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-all border border-emerald-500/20 active:scale-90 shrink-0"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <div className="flex-1 flex justify-center items-center px-1 overflow-hidden">
                                <input 
                                  type="text" inputMode="decimal" value={state.pumpOnTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) setState(prev => ({ ...prev, pumpOnTime: val }));
                                  }}
                                  className="bg-transparent text-center font-black text-white text-xl outline-none w-full"
                                />
                              </div>
                              <button 
                                onClick={() => setState(prev => ({ ...prev, pumpOnTime: (toNum(prev.pumpOnTime) + 0.5) }))}
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-all border border-emerald-500/20 active:scale-90 shrink-0"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-red-500 uppercase tracking-widest block text-center">إيقاف (دقيقة)</label>
                           <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-red-500/20 transition-all shadow-inner">
                              <button 
                                onClick={() => setState(prev => ({ ...prev, pumpOffTime: Math.max(0, toNum(prev.pumpOffTime) - 0.5) }))}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-500/20 active:scale-90 shrink-0"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <div className="flex-1 flex justify-center items-center px-1 overflow-hidden">
                                <input 
                                  type="text" inputMode="decimal" value={state.pumpOffTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) setState(prev => ({ ...prev, pumpOffTime: val }));
                                  }}
                                  className="bg-transparent text-center font-black text-white text-xl outline-none w-full"
                                />
                              </div>
                              <button 
                                onClick={() => setState(prev => ({ ...prev, pumpOffTime: (toNum(prev.pumpOffTime) + 0.5) }))}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 transition-all border border-red-500/20 active:scale-90 shrink-0"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                           </div>
                        </div>
                      </div>
                    </Card>

                    {/* POULTRY HOUSE MOISTURE INDICATOR / SMART HUMIDITY MANAGEMENT */}
                    <Card className="bg-slate-900 border-white/5 border-b-4 border-b-indigo-500/50 p-6 flex flex-col group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[30px] -z-10 group-hover:bg-indigo-500/10 transition-all" />
                      
                      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shadow-inner ring-1 ring-white/5">
                            <Droplet size={20} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-white">إدارة رطوبة العنبر ذكياً 💧</h4>
                            <p className="text-[9px] text-slate-500 font-bold mt-1">تحليل ذكي يربط قراءة الحساس الحالي بكتالوج عمر الطيور</p>
                          </div>
                        </div>

                        {/* Sync Button */}
                        <button 
                          onClick={() => {
                            setHumidityTotalBirds(String(finances.birdsAlive || state.totalChicks || 360));
                            setHumidityAvgWeight(String(dailyStats.weight || 180));
                          }}
                          className="px-2.5 py-1 text-[9px] font-black tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center gap-1 shrink-0"
                          title="مزامنة مع قطيع اليوم"
                        >
                          <RefreshCw size={10} className="animate-spin-slow" />
                          مزامنة القطيع
                        </button>
                      </div>

                      <div className="space-y-5 flex-1">
                        
                        {/* INPUTS PANEL */}
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-4">
                          <h5 className="text-[11px] font-bold text-slate-400 text-right pr-1">بيانات العنبر ومؤشرات الحساسات الحالية</h5>
                          
                          {/* 1. Sensor Humidity (RH) Input with plus/minus */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 block text-right pr-1">
                              قراءة رطوبة الحساس الحالية (%) - شاملة الكتاكيت:
                            </label>
                            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                              <button 
                                onClick={() => {
                                  const currentVal = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                                  const newVal = Math.max(0, currentVal - 1).toFixed(0);
                                  setState(prev => ({ 
                                    ...prev, 
                                    dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: newVal },
                                    currentHumidity: newVal
                                  }));
                                }}
                                className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <input 
                                type="text" 
                                inputMode="decimal" 
                                value={state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity} 
                                onChange={e => { 
                                  const val = e.target.value; 
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setState(prev => ({ 
                                      ...prev, 
                                      dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: val },
                                      currentHumidity: val
                                    }));
                                  }
                                }} 
                                className="bg-transparent text-center font-black text-white text-lg flex-1 outline-none font-mono min-w-0" 
                              />
                              <button 
                                onClick={() => {
                                  const currentVal = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                                  const newVal = Math.min(100, currentVal + 1).toFixed(0);
                                  setState(prev => ({ 
                                    ...prev, 
                                    dailyHumidity: { ...prev.dailyHumidity, [currentAgeStr]: newVal },
                                    currentHumidity: newVal
                                  }));
                                }}
                                className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            </div>
                          </div>

                          {/* 2. Flock Age & Rate Rows */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Flock Age Input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-slate-400 block text-right pr-1">عمر القطيع (يوم):</label>
                              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <button 
                                  onClick={() => {
                                    const currentAge = toNum(state.age);
                                    const newAge = Math.max(1, currentAge - 1);
                                    setState(prev => ({ ...prev, age: newAge }));
                                  }}
                                  className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                                >
                                  <Minus size={12} strokeWidth={3} />
                                </button>
                                <input 
                                  type="text" 
                                  inputMode="numeric" 
                                  value={state.age}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*$/.test(val)) {
                                      setState(prev => ({ ...prev, age: parseInt(val, 10) || 1 }));
                                    }
                                  }}
                                  className="bg-transparent text-center font-bold text-white text-sm flex-1 outline-none font-mono min-w-0" 
                                />
                                <button 
                                  onClick={() => {
                                    const currentAge = toNum(state.age);
                                    const newAge = currentAge + 1;
                                    setState(prev => ({ ...prev, age: newAge }));
                                  }}
                                  className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                                >
                                  <Plus size={12} strokeWidth={3} />
                                </button>
                              </div>
                            </div>

                            {/* Average Weight */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-slate-400 block text-right pr-1">وزن الطائر (جرام):</label>
                              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <button 
                                  onClick={() => setHumidityAvgWeight(prev => String(Math.max(10, (parseFloat(prev) || 0) - 5)))}
                                  className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                                >
                                  <Minus size={12} strokeWidth={3} />
                                </button>
                                <input 
                                  type="text" 
                                  inputMode="decimal" 
                                  value={humidityAvgWeight}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) setHumidityAvgWeight(val);
                                  }}
                                  className="bg-transparent text-center font-bold text-white text-sm flex-1 outline-none font-mono min-w-0" 
                                />
                                <button 
                                  onClick={() => setHumidityAvgWeight(prev => String((parseFloat(prev) || 0) + 5))}
                                  className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                                >
                                  <Plus size={12} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Birds total */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 block text-right pr-1">عدد الطيور بالكامل:</label>
                            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                              <button 
                                onClick={() => setHumidityTotalBirds(prev => String(Math.max(0, (parseInt(prev, 10) || 0) - 100)))}
                                className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <input 
                                type="text" 
                                inputMode="numeric" 
                                value={humidityTotalBirds}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*$/.test(val)) setHumidityTotalBirds(val);
                                }}
                                className="bg-transparent text-center font-black text-white text-md flex-1 outline-none font-mono min-w-0" 
                              />
                              <button 
                                onClick={() => setHumidityTotalBirds(prev => String((parseInt(prev, 10) || 0) + 100))}
                                className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm shrink-0"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Analysis Outcomes */}
                        {(() => {
                          const birdsCountNum = parseInt(humidityTotalBirds, 10) || 0;
                          const avgWeightNum = parseFloat(humidityAvgWeight) || 0;
                          
                          let moisturePerBirdPerHour = 0;
                          if (avgWeightNum <= 100) {
                            moisturePerBirdPerHour = 1.39;
                          } else if (avgWeightNum >= 2000) {
                            moisturePerBirdPerHour = 8.5;
                          } else {
                            const weightFactor = (avgWeightNum - 100) / (2000 - 100);
                            moisturePerBirdPerHour = 1.39 + weightFactor * (8.5 - 1.39);
                          }
                          
                          const totalMoisturePerHour = Math.round(moisturePerBirdPerHour * birdsCountNum);
                          const totalMoisturePerDayInLiters = ((totalMoisturePerHour * 24) / 1000).toFixed(1);
                          
                          const barnL = toNum(state.barnLength || 100);
                          const barnW = toNum(state.barnWidth || 12);
                          const barnH = toNum(state.barnHeight || 3);
                          const barnVol = barnL * barnW * barnH;
                          const currentTempC = toNum(state.dailyInternalTemp?.[currentAgeStr] ?? state.internalTemp) || 28;
                          const addedRHPercent = calculateExactNewRH(currentTempC, 0, totalMoisturePerHour, barnVol);

                          // Interactive Target Determination by Age Map requested:
                          const getTargetHumidityByAge = (age: number): number => {
                            if (age <= 7) return 65;  // الأسبوع الأول
                            if (age <= 14) return 60; // الأسبوع الثاني
                            if (age <= 21) return 55; // الأسبوع الثالث
                            return 50;                // الأعمار الكبيرة
                          };

                          const rhCurrentNum = toNum(state.dailyHumidity?.[currentAgeStr] ?? state.currentHumidity);
                          const ageNum = toNum(state.age) || 1;
                          const targetRH = getTargetHumidityByAge(ageNum);
                          const rhDifference = parseFloat((rhCurrentNum - targetRH).toFixed(1));

                          let statusMessage = '';
                          let statusColorClass = '';
                          let statusBorderClass = '';
                          let statusTextClass = '';

                          if (rhDifference > 5) {
                            statusMessage = `⚠️ الرطوبة مرتفعة عن المطلوب بـ ${rhDifference}% (خطر كتمة)`;
                            statusColorClass = 'bg-red-500/10';
                            statusBorderClass = 'border-red-500/20';
                            statusTextClass = 'text-red-400';
                          } else if (rhDifference < -5) {
                            statusMessage = `⚠️ الجو جاف؛ أقل من المطلوب بـ ${Math.abs(rhDifference)}% (خطر جفاف)`;
                            statusColorClass = 'bg-amber-500/10';
                            statusBorderClass = 'border-amber-500/20';
                            statusTextClass = 'text-amber-400';
                          } else {
                            statusMessage = '🟢 الرطوبة في النطاق المثالي لعمر الطيور';
                            statusColorClass = 'bg-emerald-500/10';
                            statusBorderClass = 'border-emerald-500/20';
                            statusTextClass = 'text-emerald-400';
                          }

                          // Future Danger Forecast:
                          const predictedRHAfterOneHour = Math.min(100, parseFloat((rhCurrentNum + addedRHPercent).toFixed(1)));

                          return (
                            <div className="space-y-4">
                              
                              {/* REALTIME EVALUATION CARD */}
                              <div className={cn("p-4 rounded-xl border text-right space-y-2", statusColorClass, statusBorderClass)}>
                                <p className={cn("text-xs font-black", statusTextClass)}>{statusMessage}</p>
                                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-400">
                                  <span>الرطوبة الحالية: <strong className="text-white font-mono">{rhCurrentNum}%</strong></span>
                                  <span>المستهدفة لعمر {ageNum} أيام: <strong className="text-white font-mono">{targetRH}%</strong></span>
                                </div>
                              </div>

                              {/* DANGER FORECAST CARD */}
                              <div className="p-4 bg-red-950/20 border border-red-500/10 rounded-2xl text-right space-y-3">
                                <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                                  <AlertTriangle size={14} />
                                  <span>⚠️ سيناريو الخطر (إذا توقفت التهوية)</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  القطيع يفرز رطوبة بمعدل <strong className="text-white font-mono font-black">{addedRHPercent.toFixed(1)}%</strong> في الساعة.
                                </p>
                                <div className="h-[1px] bg-white/5" />
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500 font-bold">الرطوبة المتوقعة بعد ساعة بدون شفاط:</span>
                                  <span className={cn(
                                    "text-lg font-black px-2.5 py-1 rounded-lg font-mono",
                                    predictedRHAfterOneHour >= 75 ? "bg-red-500/0 text-red-400 border border-red-500/20 animate-pulse" : "bg-emerald-500/10 text-emerald-400"
                                  )}>
                                    {predictedRHAfterOneHour.toFixed(1)}%
                                  </span>
                                </div>
                                {predictedRHAfterOneHour >= 95 && (
                                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 font-bold leading-relaxed text-right">
                                    💥 تنبيه: سيحدث تشبع كامل (100%) وتبدأ المياه بالتكثف على الجدران وتغريق الفرشة!
                                  </div>
                                )}
                              </div>

                              {/* METRIC FACTOR WRAPPER */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 text-center">
                                  <p className="text-[9px] text-slate-500 font-semibold uppercase">الزيادة في الساعة (فيزيائية)</p>
                                  <p className="text-sm font-mono font-black text-emerald-400">+{addedRHPercent.toFixed(1)}%</p>
                                </div>
                                <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 text-center">
                                  <p className="text-[9px] text-slate-500 font-semibold uppercase">معدل التبخر الكلي</p>
                                  <p className="text-sm font-mono font-black text-indigo-400">{(totalMoisturePerHour / 1000).toFixed(2)} لتر/س</p>
                                </div>
                              </div>

                              <div className="w-full bg-slate-950/30 p-3 rounded-xl border border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">حجم الهواء:</span>
                                  <span className="font-mono text-slate-300">{barnVol.toLocaleString()} م³</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">الإنتاج اليومي:</span>
                                  <span className="font-mono text-indigo-400">{totalMoisturePerDayInLiters} لتر</span>
                                </div>
                              </div>

                              <p className="text-[9px] text-slate-500 font-bold leading-relaxed text-right">
                                * يستند الموديل للحرارة الحالية ({currentTempC}°م). هذه النسبة تعبر عن مقدار الرطوبة المضافة إلى هواء العنبر كل ساعة (بدون تهوية). يجب الالتزام بحد الشفاطات الأدنى باستمرار لتلافي تجمع الرطوبة.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </Card>
                  </div>

              </motion.div>
          )}

          {screen === 'environmental_load' && (
             <motion.div 
             key="environmental_load"
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 1.02 }}
             className="space-y-6 pb-24"
           >
               <header className="flex items-center justify-between px-2 py-4 border-b border-white/5 bg-slate-900/40 -mx-4 sm:-mx-6 mb-6">
                <div className="flex items-center gap-4 px-4 sm:px-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">وحدة الحمل الحراري والرطوبة</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 grayscale opacity-70">
                      <Settings size={10} /> حسابات الحمل الحراري وإنتاج الرطوبة الهندسية
                    </p>
                  </div>
                </div>
              </header>

              {/* HEAT STRESS ALERT */}
              {environmentalLoad.heatStress && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 shadow-2xl relative overflow-hidden mb-6"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] -z-10" />
                  <div className="flex items-center gap-4 text-red-500 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center animate-pulse">
                      <AlertTriangle size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">خطر إجهاد حراري مرتفع!</h3>
                      <p className="text-xs font-bold opacity-80">درجة الحرارة تتجاوز الحد الآمن لهذا العمر ({Math.max(32, Math.round(targetTemp + 2)) + 1} درجة مئوية)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-2">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">توصيات هندسية:</h4>
                       <ul className="text-xs font-bold text-white space-y-1.5 list-disc pr-4 opacity-90">
                         <li>زيادة سرعة الهواء (التهوية الطولية)</li>
                         <li>تقليل الكثافة العددية للمتر المربع</li>
                         <li>استخدام أنظمة التبريد التبخيري</li>
                         <li>التغذية الليلية فقط</li>
                       </ul>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex items-center justify-center">
                       <p className="text-sm font-black text-red-400 text-center leading-relaxed">
                         يجب التدخل الفوري لخفض الحرارة الشعورية للطيور للحفاظ على استهلاك العلف ومنع النفوق.
                       </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. INPUTS SECTION */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-indigo-500 shadow-xl">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                      <Sliders size={20} className="text-indigo-400 opacity-60" />
                      مدخلات الحساب الهندسية
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">فرق الحرارة (Delta T)</label>
                        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 shadow-inner">
                           <button onClick={() => setState(prev => ({ ...prev, environmentalLoadDeltaT: Math.max(1, toNum(prev.environmentalLoadDeltaT || 3) - 0.5) }))} className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0">
                             <Minus size={14} strokeWidth={4} />
                           </button>
                           <input type="text" inputMode="decimal" value={state.environmentalLoadDeltaT} onChange={e => {
                             const val = e.target.value;
                             if (val === '' || /^\d*\.?\d*$/.test(val)) {
                               setState(prev => ({ ...prev, environmentalLoadDeltaT: val }));
                             }
                           }} className="bg-transparent text-center font-black text-white text-xl flex-1 outline-none font-mono min-w-0" />
                           <button onClick={() => setState(prev => ({ ...prev, environmentalLoadDeltaT: Math.min(10, toNum(prev.environmentalLoadDeltaT || 3) + 0.5) }))} className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0">
                             <Plus size={14} strokeWidth={4} />
                           </button>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold px-2">الفرق المسموح به بين حرارة الداخل والخارج (3-5 مئوي)</p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">الكثافة (كجم/متر²)</label>
                        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 shadow-inner">
                           <button onClick={() => setState(prev => ({ ...prev, environmentalLoadDensity: Math.max(0, toNum(prev.environmentalLoadDensity || 30) - 1) }))} className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0">
                             <Minus size={14} strokeWidth={4} />
                           </button>
                           <input type="text" inputMode="decimal" value={state.environmentalLoadDensity} onChange={e => {
                             const val = e.target.value;
                             if (val === '' || /^\d*\.?\d*$/.test(val)) {
                               setState(prev => ({ ...prev, environmentalLoadDensity: val }));
                             }
                           }} className="bg-transparent text-center font-black text-white text-xl flex-1 outline-none font-mono min-w-0" />
                           <button onClick={() => setState(prev => ({ ...prev, environmentalLoadDensity: Math.min(50, toNum(prev.environmentalLoadDensity || 30) + 1) }))} className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0">
                             <Plus size={14} strokeWidth={4} />
                           </button>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold px-2">يؤثر في تصحيح إنتاج الحرارة الكلي (خاصة فوق 35 كجم/م²)</p>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/40 border border-white/10">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                               <ShieldAlert size={18} />
                             </div>
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-white">العزل الحراري</span>
                               <span className="text-[9px] text-slate-500 font-bold">جودة بناء وتجهيز العنبر</span>
                             </div>
                           </div>
                           <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 shrink-0">
                              <button 
                                onClick={() => setState(prev => ({ ...prev, environmentalLoadInsulation: false }))}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                  !state.environmentalLoadInsulation 
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                    : "text-slate-500 hover:text-slate-300"
                                )}
                              >
                                جيد
                              </button>
                              <button 
                                onClick={() => setState(prev => ({ ...prev, environmentalLoadInsulation: true }))}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                  state.environmentalLoadInsulation 
                                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                                    : "text-slate-500 hover:text-slate-300"
                                )}
                              >
                                ضعيف
                              </button>
                            </div>
                        </div>
                        {state.environmentalLoadInsulation && (
                          <p className="text-[9px] text-orange-500 font-black mt-2 pr-2 animate-pulse bg-orange-500/5 py-1 px-2 rounded-lg inline-block">
                            * العزل الضعيف يرفع الإنتاج الحراري المحسوس بنسبة 10%
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 2. RESULTS SECTION */}
                <div className="lg:col-span-8 space-y-6">
                   {/* ROW 1: HEAT PRODUCTION */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-orange-500 relative overflow-hidden group hover:border-orange-500/50 transition-all">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-[40px] -z-10" />
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <Thermometer size={14} className="text-orange-500" /> إنتاج الحرارة (للطائر الواحد)
                       </h4>
                       <div className="space-y-6">
                         <div className="flex items-baseline justify-between">
                            <span className="text-xs font-bold text-slate-300">إجمالي الحرارة</span>
                            <span className="text-3xl font-black text-white tracking-tighter">{environmentalLoad.qTotalBird.toFixed(2)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">واط</span></span>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 shadow-sm">المحسوسة (Sensible)</p>
                             <p className="text-xl font-black text-orange-400 tabular-nums tracking-tight">{environmentalLoad.qSensibleBird.toFixed(2)} واط</p>
                           </div>
                           <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 shadow-sm">الكامنة (Latent)</p>
                             <p className="text-xl font-black text-cyan-400 tabular-nums tracking-tight">{environmentalLoad.qLatentBird.toFixed(2)} واط</p>
                           </div>
                         </div>
                       </div>
                     </Card>

                     <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-indigo-500 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[40px] -z-10" />
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <Layout size={14} className="text-indigo-500" /> إجمالي أحمال العنبر
                       </h4>
                       <div className="space-y-6">
                         <div className="flex items-baseline justify-between">
                            <span className="text-xs font-bold text-slate-300">الحمل الحراري الكلي</span>
                            <span className="text-3xl font-black text-white tracking-tighter">{(environmentalLoad.qTotalHouse / 1000).toFixed(1)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">كيلو واط</span></span>
                         </div>
                         <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                            <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">الحمل المحسوس للعنبر</p>
                              <p className="text-base font-black text-white tabular-nums">{(environmentalLoad.qSensibleHouse / 1000).toFixed(1)} كيلو واط</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">عامل الحرارة المحسوسة</p>
                              <p className="text-base font-black text-indigo-400 tabular-nums tracking-tighter">{environmentalLoad.sensibleFactor.toFixed(2)} SHF</p>
                            </div>
                         </div>
                       </div>
                     </Card>
                   </div>

                   {/* ROW 2: AIRFLOW & MOISTURE */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-cyan-500 relative overflow-hidden group hover:border-cyan-500/50 transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[40px] -z-10" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Droplet size={14} className="text-cyan-500" /> إنتاج الرطوبة (بخار الماء)
                        </h4>
                        <div className="space-y-4">
                           <div className="flex items-baseline justify-between">
                              <span className="text-xs font-bold text-slate-300">إنتاج الرطوبة يومياً</span>
                              <span className="text-3xl font-black text-cyan-400 tracking-tighter">{Math.round(environmentalLoad.moisturePerDayKg)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">كجم / يوم</span></span>
                           </div>
                           <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 shadow-inner">
                              <p className="text-[10.5px] font-bold text-white leading-relaxed text-right italic opacity-90">
                                <Info size={12} className="inline-block ms-1 text-cyan-500" />
                                هذا الميزان من بخار الماء يجب سحبه من العنبر دورياً عبر التهوية لتجنب الفرشة المبللة.
                              </p>
                           </div>
                        </div>
                     </Card>

                     <Card className="bg-slate-900 border-white/5 p-6 border-t-4 border-t-emerald-500 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -z-10" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Wind size={14} className="text-emerald-500" /> التهوية اللازمة للتبريد
                        </h4>
                        <div className="space-y-4">
                           <div className="flex items-baseline justify-between">
                              <span className="text-xs font-bold text-slate-300">سحب الهواء المكتسب</span>
                              <span className="text-3xl font-black text-emerald-400 tracking-tighter">{Math.round(environmentalLoad.requiredAirflow)} <span className="text-[10px] text-slate-600 font-bold uppercase ms-1">م³ / ساعة</span></span>
                           </div>
                           <div className="flex items-center gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-[10px] font-black text-slate-400 shadow-inner">
                             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                             يتم حسابه بناءً على {state.environmentalLoadDeltaT} فرق درجة حرارة وحمل الطيور المحسوس.
                           </div>
                        </div>
                     </Card>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'expert' && (
            <motion.div 
              key="expert"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ExpertScreen age={toNum(state.age)} onNavigate={setScreen} />
            </motion.div>
          )}

          {screen === 'workshop' && (
            <motion.div 
              key="workshop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WorkshopScreen onNavigate={setScreen} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals Container */}
      <AnimatePresence>
        {fanToDeleteId && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFanToDeleteId(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full sm:max-w-xs bg-slate-900 border-x border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl p-8 sm:p-6 shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30 mb-2">
                <Trash2 size={32} className="text-red-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">تأكيد الحذف</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed px-4 sm:px-0">
                  هل أنت متأكد من حذف الشفاط <span className="text-white">"{state.fans?.find(f => f.id === fanToDeleteId)?.name}"</span>؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:pt-2 pb-6 sm:pb-0">
                <button 
                  onClick={() => {
                    setState(prev => ({ ...prev, fans: (prev.fans || []).filter(f => f.id !== fanToDeleteId) }));
                    setFanToDeleteId(null);
                  }}
                  className="w-full py-4 sm:py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                  نعم، احذف الشفاط
                </button>
                <button 
                  onClick={() => setFanToDeleteId(null)}
                  className="w-full py-4 sm:py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all border border-white/5 active:scale-[0.98]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Day Navigation Arrows */}
      {(screen as string) !== 'landing' && (screen as string) !== 'finances' && (
        <>
          {/* Previous Day */}
          {toNum(state.age) > 1 && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isNavVisible ? 1 : 0, x: 0 }}
              onClick={goToPrevDay}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-90"
              title="اليوم السابق"
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}

          {/* Next Day */}
          {toNum(state.age) < 60 && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: isNavVisible ? 1 : 0, x: 0 }}
              onClick={goToNextDay}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-90"
              title="اليوم التالي"
            >
              <ChevronRight size={24} />
            </motion.button>
          )}
        </>
      )}

      {/* Bottom Navigation */}
      <motion.nav 
        initial={false}
        animate={{ 
          y: isNavVisible ? 0 : 100,
          opacity: isNavVisible ? 1 : 0,
          scale: isNavVisible ? 1 : 0.95
        }}
        transition={{ 
          duration: 0.2, 
          ease: "easeOut"
        }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl h-16 bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] flex items-center gap-1 px-4 z-40 ring-1 ring-white/5 overflow-x-auto no-scrollbar flex-nowrap"
      >
        <NavButton 
          active={(screen as string) === 'landing'} 
          onClick={() => {
            setScreen('landing');
            setIsNavVisible(true);
          }} 
          icon={RefreshCw} 
          label="الدورات" 
        />
        <NavButton 
          active={screen === 'dashboard'} 
          onClick={() => {
            setScreen('dashboard');
            setIsNavVisible(true);
          }} 
          icon={LayoutDashboard} 
          label="الرئيسية" 
        />
        <NavButton 
          active={screen === 'medication'} 
          onClick={() => {
            setScreen('medication');
            setIsNavVisible(true);
          }} 
          icon={Stethoscope} 
          label="الأدوية" 
        />
        {state.breedingSystem !== 'Floor' && (
          <NavButton 
            active={screen === 'battery'} 
            onClick={() => {
              setScreen('battery');
              setIsNavVisible(true);
            }} 
            icon={Layers} 
            label="البطاريات" 
          />
        )}
        <NavButton 
          active={screen === 'heating'} 
          onClick={() => {
            setScreen('heating');
            setIsNavVisible(true);
          }} 
          icon={Flame} 
          label="التدفئة" 
        />
        <NavButton 
          active={screen === 'climate'} 
          onClick={() => {
            setScreen('climate');
            setIsNavVisible(true);
          }} 
          icon={Thermometer} 
          label="المناخ" 
        />
        <NavButton 
          active={screen === 'weather'} 
          onClick={() => {
            setScreen('weather');
            setIsNavVisible(true);
          }} 
          icon={Cloud} 
          label="الطقس" 
        />
        <NavButton 
          active={screen === 'ventilation'} 
          onClick={() => {
            setScreen('ventilation');
            setIsNavVisible(true);
          }} 
          icon={Wind} 
          label="التهوية" 
        />
        <NavButton 
          active={screen === 'humidity'} 
          onClick={() => {
            setScreen('humidity');
            setIsNavVisible(true);
          }} 
          icon={Droplets} 
          label="الرطوبة" 
        />
        <NavButton 
          active={screen === 'environmental_load'} 
          onClick={() => {
            setScreen('environmental_load');
            setIsNavVisible(true);
          }} 
          icon={Activity} 
          label="الحمل الحراري" 
        />
        <NavButton 
          active={screen === 'finances'} 
          onClick={() => {
            setScreen('finances');
            setIsNavVisible(true);
          }} 
          icon={Wallet} 
          label="الأرباح" 
        />
        <NavButton 
          active={screen === 'expert'} 
          onClick={() => {
            setScreen('expert');
            setIsNavVisible(true);
          }} 
          icon={MessageSquare} 
          label="اسأل خبير" 
        />
        <NavButton 
          active={screen === 'market'} 
          onClick={() => {
            setScreen('market');
            setIsNavVisible(true);
          }} 
          icon={TrendingUp} 
          label="البورصة" 
        />
        <NavButton 
          active={screen === 'charts'} 
          onClick={() => {
            setScreen('charts');
            setIsNavVisible(true);
          }} 
          icon={BarChart2} 
          label="الإحصائيات" 
        />
        <NavButton 
          active={screen === 'workshop'} 
          onClick={() => {
            setScreen('workshop');
            setIsNavVisible(true);
          }} 
          icon={Wrench} 
          label="خدمة العملاء" 
        />
      </motion.nav>

      <AnimatePresence>
        {selectedMedInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMedInfo(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                    <Info size={20} />
                  </div>
                  <h3 className="font-black text-xl text-white">{selectedMedInfo.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedMedInfo(null)}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8">
                <p className="text-lg font-bold text-slate-200 leading-relaxed text-right">
                  {selectedMedInfo.text}
                </p>
              </div>
              <div className="p-6 bg-slate-800/30 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedMedInfo(null)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  فهمت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteStep > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-6 text-center"
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${deleteStep === 1 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                <AlertTriangle size={40} className="animate-pulse" />
              </div>

              <div className="space-y-2" dir="rtl">
                <h3 className="text-2xl font-black text-white">
                  {deleteStep === 1 ? 'تحذير مسح الدورة' : 'تأكيد الحذف النهائي'}
                </h3>
                <p className="text-slate-400 font-medium">
                  {deleteStep === 1 
                    ? 'هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا العمل.' 
                    : 'هذا الإجراء سيمسح جميع بيانات هذه الدورة نهائياً من جزيئات التطبيق. هل أنت متأكد تماماً؟'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={deleteStep === 1 ? confirmDeleteStep1 : finalDeleteCycle}
                  className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg ${deleteStep === 1 ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                >
                  {deleteStep === 1 ? 'نعم، تابع للمرحلة التالية' : 'نعم، احذف نهائياً'}
                </button>
                <button 
                  onClick={cancelDelete}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-black transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legacy Cycle Deletion Confirmation Modals Reference (Removed) */}
      <AnimatePresence>
        {billToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setBillToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto ring-8 ring-red-500/5">
                <Trash2 size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">تأكيد الحذف</h3>
                <p className="text-slate-400 text-sm font-bold leading-relaxed">
                  هل أنت متأكد من حذف {billToDelete.section === 'emergencyMeds' ? 'هذه الجرعة' : billToDelete.section === 'salesRecords' ? 'هذا السجل' : 'هذه الفاتورة'}؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setBillToDelete(null)}
                  className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all font-sans"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    setState(prev => ({ 
                      ...prev, 
                      [billToDelete.section]: (prev[billToDelete.section as keyof AppState] as any[]).filter(b => b.id !== billToDelete.id) 
                    }));
                    setBillToDelete(null);
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all active:scale-95 font-sans"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showNotificationsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
            onClick={() => setShowNotificationsModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl space-y-6 overflow-y-auto max-h-[85vh] no-scrollbar text-right"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <Bell size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight text-right">مركز التنبيهات الإرشادية</h3>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-1 text-right">إشعارات الهاتف المحمول والمشرف</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNotificationsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Actions (Test Native Notification) */}
              <div className="bg-[linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))] border border-violet-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg" dir="rtl">
                <div className="text-right flex-1">
                  <span className="text-xs font-black text-white block">اختبار الإشعارات على موبايلك</span>
                  <span className="text-[9px] font-bold text-slate-400 block mt-1">اضغط للتجربة وسيصلك إشعار فوري بحالة الحرارة والجرعات حالاً للتحقق من الموبايل</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const notifyTitle = "🔔 تجربة الإشعار المباشر!";
                    const notifyBody = `فحص المربّي: الرطوبة ${toNum(state.dailyHumidity?.[String(state.age)] ?? state.currentHumidity)}% والحرارة ${toNum(effectiveTemp)}°م ممتازة ومستقرة!`;
                    
                    if (Capacitor.isNativePlatform()) {
                      try {
                        const check = await LocalNotifications.checkPermissions();
                        if (check.display !== 'granted') {
                          await LocalNotifications.requestPermissions();
                        }
                        await LocalNotifications.schedule({
                          notifications: [{
                            title: notifyTitle,
                            body: notifyBody,
                            id: 1110002,
                            schedule: { at: new Date(Date.now() + 500) },
                            sound: 'beep.wav'
                          }]
                        });
                        await Toast.show({ text: "تم إرسال إشعار تجريبي بنجاح عبر نظام الهاتف!" });
                      } catch (err) {
                        await Toast.show({ text: "حدث خطأ في طلب الصلاحيات بالهاتف" });
                      }
                    } else if ('Notification' in window) {
                      if (Notification.permission === 'granted') {
                        new Notification(notifyTitle, { body: notifyBody, icon: '/assets/icon.png' });
                      } else {
                        const perm = await Notification.requestPermission();
                        if (perm === 'granted') {
                          new Notification(notifyTitle, { body: notifyBody, icon: '/assets/icon.png' });
                        } else {
                          alert("يرجى منح صلاحية الإشعارات للموقع في المتصفح أولاً من إعدادات القفل في العنوان.");
                        }
                      }
                    } else {
                      alert("الإشعارات غير مدعومة على هذا المتصفح.");
                    }
                  }}
                  className="py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black text-[11px] tracking-wide transition-all active:scale-95 shadow-md shadow-violet-600/20 flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
                >
                  <BellRing size={14} />
                  تجربة إشعار فوري
                </button>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3" dir="rtl">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 text-right">إعدادات قنوات الإشعارات</h4>
                
                {/* Temp */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Flame size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block text-right">الحرارة والبرودة المفرطة</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5 text-right">الاحترار والإجهاد الحراري وموجات الصقيع والبرد</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    dir="ltr"
                    onClick={() => setNotificationSettings(p => ({ ...p, tempAlerts: !p.tempAlerts }))}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center flex-shrink-0 relative",
                      notificationSettings.tempAlerts ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                      notificationSettings.tempAlerts ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Humidity */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Droplets size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block text-right">مستوى الرطوبة والجفاف</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5 text-right">تنبيهات الفرشة الرطبة والأتربة في الجو</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    dir="ltr"
                    onClick={() => setNotificationSettings(p => ({ ...p, humidityAlerts: !p.humidityAlerts }))}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center flex-shrink-0 relative",
                      notificationSettings.humidityAlerts ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                      notificationSettings.humidityAlerts ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Medication */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block text-right">مواعيد وجرعات الأدوية</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5 text-right">تذكير بانتهاء الجرعة بـ 30 دقيقة وقبل موعد الجرعة التالية</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    dir="ltr"
                    onClick={() => setNotificationSettings(p => ({ ...p, medicationAlerts: !p.medicationAlerts }))}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center flex-shrink-0 relative",
                      notificationSettings.medicationAlerts ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                      notificationSettings.medicationAlerts ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Feed and Water */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Wheat size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block text-right">إرشادات وأعطال المياه والعلف</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5 text-right">مقارنة معايير الأكل والشرب والتحقق من انسداد الخطوط</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    dir="ltr"
                    onClick={() => setNotificationSettings(p => ({ ...p, feedWaterAlerts: !p.feedWaterAlerts }))}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center flex-shrink-0 relative",
                      notificationSettings.feedWaterAlerts ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                      notificationSettings.feedWaterAlerts ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* System states */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
                      <Activity size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block text-right">مراقبة استقرار العنبر</span>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5 text-right">إشعار فوري وتلقائي كلما طرأت أي تغييرات بالاوزان أو الطقس</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    dir="ltr"
                    onClick={() => setNotificationSettings(p => ({ ...p, systemChanges: !p.systemChanges }))}
                    className={cn(
                      "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center flex-shrink-0 relative",
                      notificationSettings.systemChanges ? "bg-emerald-500" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md",
                      notificationSettings.systemChanges ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Active Warnings Section */}
              <div className="space-y-3 pt-2" dir="rtl">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider text-right">الإنذارات والتشخيصات النشطة حالياً</h4>
                
                {inAppNotifications.length === 0 ? (
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center space-y-2">
                    <span className="text-2xl block">😊</span>
                    <span className="text-xs font-black text-emerald-400 block">جميع الأنظمة مستقرة والقطيع بصحة ممتازة</span>
                    <span className="text-[9px] font-bold text-slate-500 block">درجة الحرارة والرطوبة ومواعيد الأدوية متلائمة تماماً مع أوزان الكتاكيت اليوم</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {inAppNotifications.map((alItem, idxIdx) => (
                      <div 
                        key={`${alItem.id}-${idxIdx}`} 
                        className={cn(
                          "p-3 rounded-2xl border flex items-start gap-3 transition-all",
                          alItem.type === 'temp' ? "bg-red-500/5 border-red-500/10 text-red-100" :
                          alItem.type === 'humidity' ? "bg-blue-500/5 border-blue-500/10 text-blue-100" :
                          alItem.type === 'medication' ? "bg-violet-500/5 border-violet-500/10 text-violet-100" :
                          alItem.type === 'change' ? "bg-slate-500/5 border-slate-500/10 text-slate-100" :
                          "bg-amber-500/5 border-amber-500/10 text-amber-100"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-xl flex-shrink-0 mt-0.5",
                          alItem.type === 'temp' ? "bg-red-500/10 text-red-400" :
                          alItem.type === 'humidity' ? "bg-blue-500/10 text-blue-400" :
                          alItem.type === 'medication' ? "bg-violet-500/10 text-violet-400" :
                          alItem.type === 'change' ? "bg-slate-500/10 text-slate-400" :
                          "bg-amber-500/10 text-amber-500"
                        )}>
                          {alItem.type === 'temp' ? <Flame size={14} /> :
                           alItem.type === 'humidity' ? <Droplets size={14} /> :
                           alItem.type === 'medication' ? <Stethoscope size={14} /> :
                           alItem.type === 'change' ? <Sliders size={14} /> :
                           <AlertTriangle size={14} />}
                        </div>
                        <div className="flex-1 text-right">
                          <span className="text-xs font-black block">{alItem.title}</span>
                          <p className="text-[10px] font-medium leading-relaxed mt-1 opacity-80">{alItem.body}</p>
                          <span className="text-[8px] font-bold text-slate-500 block mt-1.5">{alItem.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ok Button */}
              <button 
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
              >
                تطبيق وحفظ الإعدادات
              </button>
            </motion.div>
          </motion.div>
        )}

        {padToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setPadToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto ring-8 ring-red-500/5">
                <AlertCircle size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">تأكيد حذف الخلية</h3>
                <p className="text-slate-400 text-sm font-bold leading-relaxed px-2">
                  هل أنت متأكد من رغبتك في حذف <span className="text-white">"{padToDelete.name}"</span>؟ سيؤثر هذا على إجمالي مساحة التبريد المحسوبة.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPadToDelete(null)}
                  className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    setState(prev => ({ 
                      ...prev, 
                      coolingPads: prev.coolingPads.filter(p => p.id !== padToDelete.id) 
                    }));
                    setPadToDelete(null);
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all active:scale-95"
                >
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 min-w-[5.5rem] h-16 rounded-[1.25rem] transition-all duration-700 relative group flex-shrink-0",
        active ? "text-indigo-400" : "text-slate-600 hover:text-slate-400"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-bg"
          className="absolute inset-0 bg-white/[0.05] rounded-[1.25rem] -z-10 border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.2)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
        />
      )}
      <div className={cn(
        "relative transition-all duration-700",
        active ? "scale-110 -translate-y-0.5" : "scale-100 group-hover:scale-105"
      )}>
        {active && (
          <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full -z-10" />
        )}
        <Icon 
          size={22} 
          strokeWidth={active ? 2.5 : 2} 
          className={cn(
            "transition-all duration-700", 
            active ? "drop-shadow-[0_0_10px_rgba(99,102,241,0.6)]" : ""
          )} 
        />
      </div>
      <span className={cn(
        "text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-700", 
        active ? "opacity-100 translate-y-0" : "opacity-30 group-hover:opacity-60"
      )}>
        {label}
      </span>
    </button>
  );
}

// Missing Lucide icons shim
function PieChartIcon(props: any) {
  return <BarChart2 {...props} />
}

function ScaleIcon(props: any) {
  return <Scale {...props} />
}

function ContainerIcon(props: any) {
  return <LayoutDashboard {...props} />
}

function FeedSection({ 
  title, 
  bills, 
  onAdd, 
  onRemove, 
  onUpdate 
}: { 
  title: string, 
  bills: FeedBill[], 
  onAdd: () => void, 
  onRemove: (id: string) => void, 
  onUpdate: (id: string, field: string, val: any) => void 
}) {
  return (
    <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <button 
          type="button"
          onClick={onAdd}
          className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
        >
          <Plus size={14} />
        </button>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</span>
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      <div className="space-y-3">
        {bills.map(bill => (
          <div key={bill.id} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-4">
             <div className="flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => onRemove(bill.id)}
                  className="text-slate-600 hover:text-red-500 transition-colors"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
                <input 
                  type="text"
                  value={bill.company}
                  onChange={e => onUpdate(bill.id, 'company', e.target.value)}
                  placeholder="اسم شركة العلف..."
                  className="bg-transparent text-xs font-bold text-white text-right outline-none flex-1 ms-2"
                />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-sans">
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-500 text-right block uppercase">السعر للشكارة (ج.م)</label>
                   <input 
                    type="text"
                    inputMode="decimal"
                    value={bill.amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        onUpdate(bill.id, 'amount', val);
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white text-center outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-500 text-right block uppercase">الكمية (شكارة)</label>
                   <input 
                    type="text"
                    inputMode="numeric"
                    value={bill.quantity ?? 1}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        onUpdate(bill.id, 'quantity', val);
                      }
                    }}
                    placeholder="1"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white text-center outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-500 text-right block uppercase">وزن الشكارة (كجم)</label>
                   <input 
                    type="text"
                    inputMode="decimal"
                    value={bill.weight}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        onUpdate(bill.id, 'weight', val);
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white text-center outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-500 text-right block uppercase">نسبة البروتين (%)</label>
                   <input 
                    type="text"
                    inputMode="decimal"
                    value={bill.proteinPercentage ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 100)) {
                        onUpdate(bill.id, 'proteinPercentage', val);
                      }
                    }}
                    placeholder="%"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white text-center outline-none focus:border-emerald-500/50"
                  />
                </div>
             </div>

             {/* FIXED: Improved layout with flex-wrap and better min-width for date field to avoid clipping */}
             <div className="flex flex-row flex-wrap items-end justify-between gap-3 mt-2">
                <div className="flex-1 min-w-[130px] space-y-1">
                   <label className="text-[9px] font-bold text-slate-500 text-center block uppercase">تاريخ الإضافة</label>
                   <input 
                    type="date"
                    value={bill.entryDate || new Date().toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => onUpdate(bill.id, 'entryDate', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-1.5 text-[11px] font-black text-white text-center outline-none focus:border-emerald-500/50"
                  />
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {toNum(bill.weight) > 0 && toNum(bill.amount) > 0 && (
                     <div className="bg-slate-950/80 p-1.5 rounded-lg border border-white/5 text-center shadow-inner min-w-[70px]">
                        <p className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">سعر الكيلو</p>
                        <p className="text-[10px] text-emerald-400 font-black">{(toNum(bill.amount) / toNum(bill.weight)).toFixed(2)} <span className="text-[7px]">ج.م</span></p>
                     </div>
                  )}
                  {toNum(bill.amount) > 0 && toNum(bill.quantity) > 1 && (
                     <div className="bg-slate-950/80 p-1.5 rounded-lg border border-white/5 text-center shadow-inner min-w-[80px]">
                        <p className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">إجمالي الفاتورة</p>
                        <p className="text-[10px] text-blue-400 font-black">{(toNum(bill.amount) * toNum(bill.quantity)).toLocaleString()} <span className="text-[7px]">ج.م</span></p>
                     </div>
                  )}
                </div>
             </div>
          </div>
        ))}
        {bills.length === 0 && (
          <p className="text-[9px] text-slate-700 font-bold py-2 text-center uppercase tracking-widest italic">لا توجد سجلات شراء</p>
        )}
      </div>
    </div>
  );
}

function BillSection({ title, bills, icon: Icon, onAdd, onRemove, onUpdate }: { title: string, bills: Bill[], icon: any, onAdd: () => void, onRemove: (id: string) => void, onUpdate: (id: string, field: string, val: any) => void }) {
  return (
    <Card className="bg-slate-900 border-white/5 p-6 text-right">
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button"
          onClick={onAdd}
          className="p-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
        >
          <Plus size={16} />
        </button>
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest">{title}</h4>
          <div className="p-2 bg-slate-950 rounded-lg text-slate-400">
            <Icon size={16} />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {bills.map(bill => (
          <div key={bill.id} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(bill.id);
                }}
                className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
              <input 
                type="text"
                value={bill.label ?? ''}
                onChange={e => onUpdate(bill.id, 'label', e.target.value)}
                className="bg-transparent text-sm font-bold text-white text-right outline-none w-full ms-2"
                placeholder="وصف الفاتورة..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-end gap-1">
                    المبلغ (ج.م)
                    <Banknote size={10} />
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={bill.amount ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        onUpdate(bill.id, 'amount', val);
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white text-center focus:border-blue-500/50 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-center gap-1">
                    تاريخ إدخال الفاتورة
                    <Calendar size={10} />
                  </label>
                  <input 
                    type="date"
                    value={bill.entryDate ?? new Date().toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => onUpdate(bill.id, 'entryDate', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-6 py-2.5 text-[12px] font-black text-white text-center focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-end gap-1">
                  فترة الاستهلاك (من يوم - إلى يوم)
                  <Calendar size={10} />
                </label>
                <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl p-1 shrink-0">
                   <div className="flex-1 flex items-center bg-slate-950 rounded-lg border border-white/5 overflow-hidden">
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={bill.startDay ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*$/.test(val)) {
                          onUpdate(bill.id, 'startDay', val);
                        }
                      }}
                      placeholder="إلى"
                      className="w-full bg-transparent px-2 py-1.5 text-[11px] font-black text-white text-center outline-none"
                    />
                  </div>
                  <span className="text-slate-600 font-bold text-xs">-</span>
                  <div className="flex-1 flex items-center bg-slate-950 rounded-lg border border-white/5 overflow-hidden">
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={bill.endDay ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*$/.test(val)) {
                          onUpdate(bill.id, 'endDay', val);
                        }
                      }}
                      placeholder="من"
                      className="w-full bg-transparent px-2 py-1.5 text-[11px] font-black text-white text-center outline-none"
                    />
                  </div>
                </div>
                {toNum(bill.startDay) > toNum(bill.endDay) && (
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[8px] font-bold text-blue-400">
                        ({(toNum(bill.startDay) - toNum(bill.endDay) + 1)} يوم)
                      </span>
                      <span className="text-[8px] font-bold text-slate-600 italic">مدة التغطية</span>
                   </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {bills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <Plus size={24} className="text-slate-800 mb-2" />
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">لا توجد سجلات حالياً</p>
          </div>
        )}
      </div>
      {bills.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center px-2">
          <p className="text-sm font-black text-white">{bills.reduce((acc, b) => acc + toNum(b.amount), 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">ج.م</span></p>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-slate-500 uppercase">إجمالي {title}</span>
            <div className="w-1 h-3 bg-slate-700 rounded-full" />
          </div>
        </div>
      )}
    </Card>
  );
}
