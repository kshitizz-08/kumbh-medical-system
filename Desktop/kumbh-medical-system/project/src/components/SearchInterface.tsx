import { useState, useMemo } from 'react';
import { searchDevotees, searchDevoteesByFace, Devotee, MedicalRecord } from '../lib/api';
import { Search, Loader2, User, Camera } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import { useI18n } from '../i18n/i18n';

type SearchResult = Devotee & { medical_records: MedicalRecord | null };

export default function SearchInterface({ onSelectDevotee }: { onSelectDevotee: (result: SearchResult) => void }) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone' | 'registration'>('name');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFaceSearch, setShowFaceSearch] = useState(false);

  // Filter states
  const [genderFilter, setGenderFilter] = useState<'' | 'Male' | 'Female' | 'Other'>('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  // Apply filters to results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Gender filter
    if (genderFilter) {
      filtered = filtered.filter((r) => r.gender === genderFilter);
    }

    // Age filters
    const min = minAge ? parseInt(minAge, 10) : null;
    const max = maxAge ? parseInt(maxAge, 10) : null;

    if (min !== null) {
      filtered = filtered.filter((r) => r.age >= min);
    }

    if (max !== null) {
      filtered = filtered.filter((r) => r.age <= max);
    }

    return filtered;
  }, [results, genderFilter, minAge, maxAge]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const data = await searchDevotees(searchTerm, searchType);
      setResults(
        (data || []).map((devotee) => ({
          ...devotee,
          medical_records: devotee.medical_records,
        }))
      );
    } catch (error) {
      alert(t('search.fail', { message: (error as Error).message }));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
        {/* Main search row */}
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'name' | 'phone' | 'registration')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">{t('search.type.name')}</option>
            <option value="phone">{t('search.type.phone')}</option>
            <option value="registration">{t('search.type.registration')}</option>
          </select>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search.placeholder', { type: searchType })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('search.searching')}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {t('search.search')}
              </>
            )}
          </button>
        </form>

        {/* Filter row - gender and age filters inline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="genderFilter" className="block text-sm font-medium text-gray-700 mb-1">
              {t('search.filter.gender')}
            </label>
            <select
              id="genderFilter"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as '' | 'Male' | 'Female' | 'Other')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('search.filter.gender.all')}</option>
              <option value="Male">{t('search.filter.gender.male')}</option>
              <option value="Female">{t('search.filter.gender.female')}</option>
              <option value="Other">{t('search.filter.gender.other')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="minAge" className="block text-sm font-medium text-gray-700 mb-1">
              {t('search.filter.minAge')}
            </label>
            <input
              id="minAge"
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              placeholder="0"
              min="0"
              max="120"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="maxAge" className="block text-sm font-medium text-gray-700 mb-1">
              {t('search.filter.maxAge')}
            </label>
            <input
              id="maxAge"
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              placeholder="120"
              min="0"
              max="120"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Search by Face button */}
        <button
          type="button"
          onClick={() => setShowFaceSearch(true)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 text-gray-700 text-sm transition-colors"
        >
          <Camera className="w-4 h-4" />
          {t('search.byFace')}
        </button>
      </div>

      {searched && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">{t('search.noneFound')}</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">{t('search.filter.noneAfterFilter')}</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 px-2">
                {t('search.found', { count: filteredResults.length })}
                {results.length !== filteredResults.length && (
                  <span className="text-gray-400 ml-2">
                    ({results.length} {t('common.total')})
                  </span>
                )}
              </div>
              {filteredResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onSelectDevotee(result)}
                  className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{result.full_name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {result.registration_number}
                        </span>
                        {result.match_distance !== undefined && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Match: {((1 - result.match_distance) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">{t('search.age')}</span> {result.age}
                        </div>
                        <div>
                          <span className="font-medium">{t('search.gender')}</span> {result.gender}
                        </div>
                        <div>
                          <span className="font-medium">{t('search.phone')}</span> {result.phone}
                        </div>
                        {result.medical_records?.blood_group && (
                          <div>
                            <span className="font-medium">{t('search.blood')}</span> {result.medical_records.blood_group}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {showFaceSearch && (
        <SelfieCapture
          onCapture={async (_imageData, descriptor) => {
            setShowFaceSearch(false);
            if (!descriptor) {
              alert(t('search.face.noDescriptor'));
              return;
            }
            setLoading(true);
            setSearched(true);
            try {
              const data = await searchDevoteesByFace(descriptor, 0.6);
              setResults(
                (data || []).map((devotee) => ({
                  ...devotee,
                  medical_records: devotee.medical_records,
                }))
              );
            } catch (error) {
              alert(t('search.face.fail', { message: (error as Error).message }));
              setResults([]);
            } finally {
              setLoading(false);
            }
          }}
          onClose={() => setShowFaceSearch(false)}
        />
      )}
    </div>
  );
}
