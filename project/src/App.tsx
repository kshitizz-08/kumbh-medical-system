import { useState, lazy, Suspense, useCallback, memo, useEffect } from 'react';
import { UserPlus, Search, Heart, CheckCircle2, Home, Loader2, Copy, Check, X, BarChart3, ArrowLeft, Printer, Users, Activity, AlertTriangle } from 'lucide-react';
import { Devotee, MedicalRecord, DevoteeWithRecord } from './lib/api';
import { useI18n } from './i18n/i18n';
import QRCodeDisplay from './components/QRCodeDisplay';
import { generateQRDataURL, printKumbhPass } from './utils/qrUtils';

// Lazy load heavy components for code splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const SearchInterface = lazy(() => import('./components/SearchInterface'));
const MedicalProfile = lazy(() => import('./components/MedicalProfile'));
const IncidentForm = lazy(() => import('./components/IncidentForm'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const WeatherBadge = lazy(() => import('./components/WeatherWidget').then(m => ({ default: m.WeatherBadge })));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const LostFoundDashboard = lazy(() => import('./components/LostFoundDashboard'));

// Loading fallback component
const ComponentLoader = memo(() => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-orange-100" />
      <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-slate-400 animate-pulse">Loading…</p>
  </div>
));
ComponentLoader.displayName = 'ComponentLoader';

// Live stats bar
type Stats = { total: number; incidentsToday: number; weather: { temperature: number; description: string } | null };
function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
    fetch(`${API_BASE}/devotees/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 60_000); // refresh every 60s
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-6 py-3 px-4 bg-white/60 backdrop-blur border border-orange-100 rounded-2xl shadow-sm">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-5 w-28 bg-slate-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const heatColor = stats.weather
    ? stats.weather.temperature >= 40 ? 'text-red-600' : stats.weather.temperature >= 35 ? 'text-orange-600' : 'text-amber-600'
    : 'text-amber-600';

  const statItems = [
    {
      emoji: '👥',
      value: stats.total.toLocaleString(),
      label: 'Registered',
      chipBg: 'bg-orange-100',
      valueCls: 'text-orange-700',
    },
    {
      emoji: '🚨',
      value: String(stats.incidentsToday ?? 0),
      label: 'Incidents Today',
      chipBg: 'bg-red-100',
      valueCls: stats.incidentsToday > 0 ? 'text-red-600' : 'text-slate-500',
    },
    ...(stats.weather ? [{
      emoji: '☀️',
      value: `${stats.weather.temperature}°C`,
      label: stats.weather.description,
      chipBg: 'bg-amber-100',
      valueCls: heatColor,
    }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-3 px-5 bg-white/70 backdrop-blur border border-orange-100 rounded-2xl shadow-sm text-sm">
      {statItems.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <div className="w-px h-4 bg-slate-200 hidden sm:block" />}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.chipBg}`}>
            <span>{s.emoji}</span>
            <strong className={s.valueCls}>{s.value}</strong>
            <span className="text-slate-500 font-normal">{s.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}


type View = 'home' | 'register' | 'search' | 'analytics' | 'lost-found';
type SelectedDevotee = Devotee & { medical_records: MedicalRecord | null };

function App() {
  const { lang, setLang, t } = useI18n();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedDevotee, setSelectedDevotee] = useState<SelectedDevotee | null>(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentDevoteeId, setIncidentDevoteeId] = useState<string>('');
  const [incidentDevoteeName, setIncidentDevoteeName] = useState<string>('');
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [registeredDevotee, setRegisteredDevotee] = useState<DevoteeWithRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [regQRDataURL, setRegQRDataURL] = useState<string | null>(null);

  const handleRegistrationSuccess = useCallback((data: DevoteeWithRecord) => {
    setRegistrationSuccess(data.registration_number);
    setRegisteredDevotee(data);
    setCopiedId(false);
    setRegQRDataURL(null);
    // Don't auto-dismiss - let user close manually
  }, []);

  const handleSelectDevotee = useCallback((devotee: SelectedDevotee) => {
    setSelectedDevotee(devotee);
  }, []);

  const handleRecordIncident = useCallback((devoteeId: string, devoteeName: string) => {
    setIncidentDevoteeId(devoteeId);
    setIncidentDevoteeName(devoteeName);
    setShowIncidentForm(true);
  }, []);

  const handleIncidentSuccess = useCallback(() => {
    // Close the form and refresh incidents on the open profile (if any)
    setShowIncidentForm(false);
    setProfileRefreshToken((token) => token + 1);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setSelectedDevotee(null);
  }, []);

  const handleCloseIncidentForm = useCallback(() => {
    setShowIncidentForm(false);
  }, []);

  return (
    <div className="min-h-screen bg-kumbh-pattern text-slate-900 font-sans">
      <header className="bg-kumbh-gradient shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md ring-2 ring-orange-100 flex-shrink-0">
                <Heart className="w-7 h-7 text-kumbh-deep drop-shadow-sm" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
                  {t('app.title')}
                </h1>
                <p className="text-sm text-white/90 font-medium">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop nav — white pill, readable on orange */}
              <nav
                className="hidden md:inline-flex rounded-full border border-white/30 bg-white/20 backdrop-blur-sm shadow-sm overflow-hidden text-sm font-medium"
                aria-label={t('nav.ariaMain')}
              >
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 transition-colors ${
                    currentView === 'home' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.home')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('register')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-white/20 transition-colors ${
                    currentView === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.register')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('search')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-white/20 transition-colors ${
                    currentView === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.search')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('analytics')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-white/20 transition-colors ${
                    currentView === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.analytics')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('lost-found')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-white/20 transition-colors ${
                    currentView === 'lost-found' ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.lostFound')}</span>
                </button>
              </nav>

              <div className="flex items-center gap-3">
                {/* Weather badge — always visible in header */}
                <Suspense fallback={null}>
                  <WeatherBadge />
                </Suspense>
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                    {t('lang.label')}
                  </span>
                </div>
                <div className="inline-flex rounded-xl border-2 border-orange-200 bg-white shadow-md overflow-hidden" role="group" aria-label={t('lang.label')}>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-all ${lang === 'en'
                      ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-inner'
                      : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                    aria-pressed={lang === 'en'}
                    title="English"
                  >
                    🇬🇧 <span>EN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('hi')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-all border-l border-orange-100 ${lang === 'hi'
                      ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-inner'
                      : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                    aria-pressed={lang === 'hi'}
                    title="हिंदी"
                  >
                    🇮🇳 <span>हि</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('mr')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-all border-l border-orange-100 ${lang === 'mr'
                      ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-inner'
                      : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                    aria-pressed={lang === 'mr'}
                    title="मराठी"
                  >
                    🏵️ <span>म</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-kumbh-sand/90 via-white to-amber-50/90 border border-orange-200/70 rounded-2xl shadow-lg p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-700 mb-3">
                {t('home.kumbhYear')}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-kumbh-deep mb-3">
                {t('home.heroTitle')}
              </h2>
              <p className="text-slate-700 mb-6 max-w-2xl mx-auto">
                {t('home.heroDesc')}
              </p>

              {/* Stats bar */}
              <div className="mb-8 max-w-2xl mx-auto">
                <StatsBar />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                <button
                  onClick={() => setCurrentView('register')}
                  className="group bg-gradient-to-br from-orange-400 to-amber-500 text-white p-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-orange-400/50 hover:shadow-2xl transform hover:-translate-y-2 border border-orange-300/60"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">{t('home.cta.register.title')}</h3>
                  <p className="text-orange-50 text-sm leading-relaxed">{t('home.cta.register.desc')}</p>
                </button>

                <button
                  onClick={() => setCurrentView('search')}
                  className="group bg-gradient-to-br from-slate-700 to-sky-700 text-white p-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-sky-500/50 hover:shadow-2xl transform hover:-translate-y-2 border border-sky-600/40"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">{t('home.cta.search.title')}</h3>
                  <p className="text-sky-100 text-sm leading-relaxed">{t('home.cta.search.desc')}</p>
                </button>

                <button
                  onClick={() => setCurrentView('analytics')}
                  className="group bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 hover:shadow-2xl transform hover:-translate-y-2 border border-purple-500/40"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">{t('home.cta.analytics.title')}</h3>
                  <p className="text-purple-100 text-sm leading-relaxed">{t('home.cta.analytics.desc')}</p>
                </button>

                <button
                  onClick={() => setCurrentView('lost-found')}
                  className="group bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-teal-500/50 hover:shadow-2xl transform hover:-translate-y-2 border border-teal-400/40"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">{t('home.cta.lostFound.title')}</h3>
                  <p className="text-teal-50 text-sm leading-relaxed">{t('home.cta.lostFound.desc')}</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                aria-label={t('nav.backHome')}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-kumbh-deep">{t('register.pageTitle')}</h2>
                <p className="text-base text-slate-600 mt-1">
                  {t('register.pageDesc')}
                </p>
              </div>
            </div>

            {registrationSuccess && (
              <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-2xl border-2 border-green-400 p-5 max-w-sm w-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-green-900">{t('register.successTitle')}</h3>
                    </div>
                    <button
                      onClick={() => {
                        setRegistrationSuccess(null);
                        setRegisteredDevotee(null);
                        setCurrentView('home');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-green-800 text-sm mb-2">{t('register.kumbhId')}</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200 mb-4">
                    <span className="font-mono font-bold text-sm text-gray-900 flex-1 truncate">{registrationSuccess}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(registrationSuccess);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg font-medium transition-all shadow-sm flex-shrink-0 text-xs"
                    >
                      {copiedId ? (
                        <><Check className="w-3.5 h-3.5" /><span>{t('common.copied')}</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /><span>{t('common.copy')}</span></>
                      )}
                    </button>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center bg-white rounded-xl border border-green-200 p-4 mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">🔳 QR Code</p>
                    <QRCodeDisplay
                      value={registrationSuccess}
                      size={150}
                      label={registrationSuccess}
                      downloadable
                      downloadFilename={`kumbh-pass-${registrationSuccess}`}
                      onQRReady={setRegQRDataURL}
                    />
                  </div>

                  {/* Print Kumbh Pass */}
                  {regQRDataURL && registeredDevotee && (
                    <button
                      type="button"
                      onClick={async () => {
                        const qrURL = regQRDataURL || await generateQRDataURL(registrationSuccess);
                        printKumbhPass({
                          name: registeredDevotee.full_name,
                          registrationNumber: registrationSuccess,
                          age: registeredDevotee.age,
                          gender: registeredDevotee.gender,
                          bloodGroup: registeredDevotee.medical_records?.blood_group ?? undefined,
                          phone: registeredDevotee.phone,
                          emergencyContact: registeredDevotee.emergency_contact_name,
                          emergencyPhone: registeredDevotee.emergency_contact_phone,
                          photoUrl: registeredDevotee.photo_url ?? undefined,
                          qrDataURL: qrURL,
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print Kumbh Pass
                    </button>
                  )}
                </div>
              </div>
            )}

            <Suspense fallback={<ComponentLoader />}>
              <RegistrationForm onSuccess={handleRegistrationSuccess} />
            </Suspense>
          </div>
        )}

        {currentView === 'search' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                aria-label={t('nav.backHome')}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-kumbh-deep">{t('search.pageTitle')}</h2>
                <p className="text-base text-slate-600 mt-1">
                  {t('search.pageDesc')}
                </p>
              </div>
            </div>

            <Suspense fallback={<ComponentLoader />}>
              <SearchInterface
                onSelectDevotee={handleSelectDevotee}
              />
            </Suspense>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                aria-label={t('nav.backHome')}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-kumbh-deep">{t('analytics.pageTitle')}</h2>
                <p className="text-base text-slate-600 mt-1">
                  {t('analytics.pageDesc')}
                </p>
              </div>
            </div>

            <Suspense fallback={<ComponentLoader />}>
              <AnalyticsDashboard />
            </Suspense>
          </div>
        )}

        {currentView === 'lost-found' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                aria-label={t('nav.backHome')}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-kumbh-deep">{t('lost.pageTitle')}</h2>
                <p className="text-base text-slate-600 mt-1">
                  {t('lost.pageDesc')}
                </p>
              </div>
            </div>

            <Suspense fallback={<ComponentLoader />}>
              <LostFoundDashboard />
            </Suspense>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">Kumbh Mela Medical Seva 2026</p>
                <p className="text-slate-400 text-xs">Nashik, Maharashtra, India</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="tel:108" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold transition-colors">
                🚨 Emergency: 108
              </a>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">© 2026 All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-xl flex">
        {([
          { view: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
          { view: 'register', icon: <UserPlus className="w-5 h-5" />, label: 'Register' },
          { view: 'search', icon: <Search className="w-5 h-5" />, label: 'Search' },
          { view: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Stats' },
          { view: 'lost-found', icon: <Users className="w-5 h-5" />, label: 'Lost' },
        ] as { view: View; icon: React.ReactNode; label: string }[]).map(item => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
              currentView === item.view ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`p-1 rounded-lg transition-colors ${currentView === item.view ? 'bg-orange-50' : ''}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {selectedDevotee && (
        <Suspense fallback={<ComponentLoader />}>
          <MedicalProfile
            devotee={selectedDevotee}
            refreshToken={profileRefreshToken}
            onClose={handleCloseProfile}
            onRecordIncident={handleRecordIncident}
            onDevoteeUpdate={handleSelectDevotee}
          />
        </Suspense>
      )}

      {showIncidentForm && selectedDevotee && (
        <Suspense fallback={<ComponentLoader />}>
          <IncidentForm
            devoteeId={incidentDevoteeId}
            devoteeName={incidentDevoteeName || selectedDevotee.full_name}
            onClose={handleCloseIncidentForm}
            onSuccess={handleIncidentSuccess}
          />
        </Suspense>
      )}

      {/* AI Chatbot - Available on all pages */}
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
    </div>
  );
}

export default App;
