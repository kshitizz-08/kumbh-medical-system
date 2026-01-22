import { useState, lazy, Suspense, useCallback, memo } from 'react';
import { UserPlus, Search, Heart, CheckCircle2, Home, Loader2, Copy, Check, X, BarChart3 } from 'lucide-react';
import { Devotee, MedicalRecord } from './lib/api';
import { useI18n } from './i18n/i18n';

// Lazy load heavy components for code splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const SearchInterface = lazy(() => import('./components/SearchInterface'));
const MedicalProfile = lazy(() => import('./components/MedicalProfile'));
const IncidentForm = lazy(() => import('./components/IncidentForm'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const WeatherWidget = lazy(() => import('./components/WeatherWidget'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const LostFoundDashboard = lazy(() => import('./components/LostFoundDashboard'));

// Loading fallback component
const ComponentLoader = memo(() => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
));
ComponentLoader.displayName = 'ComponentLoader';

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
  const [copiedId, setCopiedId] = useState(false);

  const handleRegistrationSuccess = useCallback((regNumber: string) => {
    setRegistrationSuccess(regNumber);
    setCopiedId(false);
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
    <div className="min-h-screen bg-kumbh-sunrise text-slate-900">
      <header className="bg-white/95 backdrop-blur border-b border-orange-200/70 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-gradient-to-br from-kumbh-saffron to-kumbh-marigold rounded-full flex items-center justify-center shadow-md ring-2 ring-orange-200/80 flex-shrink-0">
                <Heart className="w-6 h-6 text-white drop-shadow" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-kumbh-deep">
                  {t('app.title')}
                </h1>
                <p className="text-sm text-slate-600">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <nav
                className="hidden md:inline-flex rounded-full border border-slate-200 bg-slate-50/80 shadow-sm overflow-hidden text-sm font-medium"
                aria-label={t('nav.ariaMain')}
              >
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 transition-colors ${currentView === 'home'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-white'
                    }`}
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.home')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('register')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-slate-200 transition-colors ${currentView === 'register'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-white'
                    }`}
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.register')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('search')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-slate-200 transition-colors ${currentView === 'search'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-white'
                    }`}
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.search')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('analytics')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-slate-200 transition-colors ${currentView === 'analytics'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-white'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.analytics')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('lost-found')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 border-l border-slate-200 transition-colors ${currentView === 'lost-found'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-white'
                    }`}
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>Lost & Found</span>
                </button>
              </nav>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('lang.label')}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {t('lang.current', { code: lang.toUpperCase() })}
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden" role="group" aria-label={t('lang.label')}>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    aria-pressed={lang === 'en'}
                  >
                    {t('lang.en')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('hi')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${lang === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    aria-pressed={lang === 'hi'}
                  >
                    {t('lang.hi')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('mr')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${lang === 'mr' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    aria-pressed={lang === 'mr'}
                  >
                    {t('lang.mr')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-kumbh-sand/90 via-white to-amber-50/90 border border-orange-200/70 rounded-2xl shadow-lg p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-700 mb-3">
                {t('home.kumbhYear')}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-kumbh-deep mb-3">
                {t('home.heroTitle')}
              </h2>
              <p className="text-slate-700 mb-8 max-w-2xl mx-auto">
                {t('home.heroDesc')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <button
                  onClick={() => setCurrentView('register')}
                  className="bg-gradient-to-r from-kumbh-saffron to-kumbh-marigold text-white p-8 rounded-xl hover:from-orange-600 hover:to-amber-500 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border border-orange-300/80"
                >
                  <UserPlus className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold mb-2">{t('home.cta.register.title')}</h3>
                  <p className="text-orange-50 text-sm">
                    {t('home.cta.register.desc')}
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('search')}
                  className="bg-gradient-to-r from-kumbh-deep to-sky-700 text-white p-8 rounded-xl hover:from-slate-900 hover:to-sky-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border border-sky-500/70"
                >
                  <Search className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold mb-2">{t('home.cta.search.title')}</h3>
                  <p className="text-sky-100 text-sm">
                    {t('home.cta.search.desc')}
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/90 backdrop-blur border border-orange-200/70 rounded-2xl p-6 shadow-md">
                <h3 className="font-semibold text-orange-900 mb-2">{t('home.designedFor.title')}</h3>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('home.designedFor.1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('home.designedFor.2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('home.designedFor.3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('home.designedFor.4')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('home.designedFor.5')}
                  </li>
                </ul>
              </div>

              {/* Weather Widget */}
              <Suspense fallback={<ComponentLoader />}>
                <WeatherWidget />
              </Suspense>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-kumbh-deep">{t('register.pageTitle')}</h2>
                <p className="text-slate-600">
                  {t('register.pageDesc')}
                </p>
              </div>
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 text-slate-600 hover:text-kumbh-deep font-medium"
              >
                {t('nav.backHome')}
              </button>
            </div>

            {registrationSuccess && (
              <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
                <div className="bg-white rounded-2xl shadow-2xl border border-green-300 p-5 max-w-md">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-green-900">{t('register.successTitle')}</h3>
                        <button
                          onClick={() => {
                            setRegistrationSuccess(null);
                            setCurrentView('home');
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                          aria-label="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-green-800 text-sm mb-3">{t('register.kumbhId')}</p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <span className="font-mono font-bold text-base text-gray-900 flex-1 truncate">{registrationSuccess}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(registrationSuccess);
                            setCopiedId(true);
                            setTimeout(() => setCopiedId(false), 2000);
                          }}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex-shrink-0"
                        >
                          {copiedId ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-sm">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Suspense fallback={<ComponentLoader />}>
              <RegistrationForm onSuccess={handleRegistrationSuccess} />
            </Suspense>
          </div>
        )}

        {currentView === 'search' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-kumbh-deep">{t('search.pageTitle')}</h2>
                <p className="text-slate-600">
                  {t('search.pageDesc')}
                </p>
              </div>
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 text-slate-600 hover:text-kumbh-deep font-medium"
              >
                {t('nav.backHome')}
              </button>
            </div>

            <Suspense fallback={<ComponentLoader />}>
              <SearchInterface
                onSelectDevotee={handleSelectDevotee}
              />
            </Suspense>
          </div>
        )}

        {currentView === 'analytics' && (
          <Suspense fallback={<ComponentLoader />}>
            <AnalyticsDashboard />
          </Suspense>
        )}

        {currentView === 'lost-found' && (
          <Suspense fallback={<ComponentLoader />}>
            <LostFoundDashboard />
          </Suspense>
        )}
      </main>

      {selectedDevotee && (
        <Suspense fallback={<ComponentLoader />}>
          <MedicalProfile
            devotee={selectedDevotee}
            refreshToken={profileRefreshToken}
            onClose={handleCloseProfile}
            onRecordIncident={handleRecordIncident}
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
