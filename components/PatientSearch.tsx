import React, { useState, useEffect, useCallback } from 'react';
import {
    searchPatients,
    getTodayAccepts,
    parseBirthDate,
    parseGender,
    Patient,
    AcceptedPatient,
} from '../services/dongjedangApiService';

interface PatientSearchProps {
    onPatientSelect: (patient: Patient & { age?: number }) => void;
    isOpen: boolean;
    onClose: () => void;
}

// 아이콘 컴포넌트
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export const PatientSearch: React.FC<PatientSearchProps> = ({
    onPatientSelect,
    isOpen,
    onClose,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [todayAccepts, setTodayAccepts] = useState<AcceptedPatient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingToday, setIsLoadingToday] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'search' | 'today'>('today');

    // 오늘 접수 환자 로드
    const loadTodayAccepts = useCallback(async () => {
        setIsLoadingToday(true);
        setError(null);
        try {
            const result = await getTodayAccepts();
            if (result.success && result.data) {
                setTodayAccepts(result.data.accepts);
            } else {
                setError(result.error?.message || '오늘 접수 환자를 불러올 수 없습니다.');
            }
        } catch (err) {
            setError('오늘 접수 환자를 불러올 수 없습니다.');
        } finally {
            setIsLoadingToday(false);
        }
    }, []);

    // 모달 열릴 때 오늘 접수 환자 로드
    useEffect(() => {
        if (isOpen) {
            loadTodayAccepts();
        }
    }, [isOpen, loadTodayAccepts]);

    // 환자 검색
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        try {
            // 숫자만 있으면 차트번호 또는 전화번호로 검색
            const isNumeric = /^\d+$/.test(searchQuery.replace(/-/g, ''));

            let result;
            if (isNumeric && searchQuery.length >= 6) {
                // 6자리 이상 숫자면 차트번호로 먼저 시도
                result = await searchPatients({ chart_id: searchQuery });
                if (!result.success || !result.data?.patients.length) {
                    // 차트번호로 못 찾으면 전화번호로 검색
                    result = await searchPatients({ phone: searchQuery });
                }
            } else {
                // 그 외에는 이름으로 검색
                result = await searchPatients({ name: searchQuery });
            }

            if (result.success && result.data) {
                setSearchResults(result.data.patients);
                if (result.data.patients.length === 0) {
                    setError('검색 결과가 없습니다.');
                }
            } else {
                setError(result.error?.message || '검색에 실패했습니다.');
            }
        } catch (err) {
            setError('검색에 실패했습니다.');
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    // Enter 키로 검색
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // 환자 선택
    const handleSelectPatient = (patient: Patient) => {
        const birthInfo = parseBirthDate(patient.birth);
        const gender = parseGender(patient.birth) || patient.gender;

        onPatientSelect({
            ...patient,
            gender: gender || undefined,
            age: birthInfo?.age,
        });
        onClose();
    };

    // 오늘 접수 환자에서 선택
    const handleSelectAcceptedPatient = async (accepted: AcceptedPatient) => {
        // 상세 정보 가져오기 위해 검색
        const result = await searchPatients({ chart_id: accepted.chart_id });
        if (result.success && result.data?.patients.length) {
            handleSelectPatient(result.data.patients[0]);
        } else {
            // 검색 실패 시 기본 정보만 전달
            onPatientSelect({
                patient_id: accepted.patient_id,
                chart_id: accepted.chart_id,
                name: accepted.name,
                birth: '',
                phone: '',
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <UserIcon className="w-6 h-6" />
                        환자 검색
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'today'
                            ? 'text-brand-primary border-b-2 border-brand-primary bg-gray-700/50'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        오늘 내원
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'search'
                            ? 'text-brand-primary border-b-2 border-brand-primary bg-gray-700/50'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <SearchIcon className="w-4 h-4" />
                        환자 검색
                    </button>
                </div>

                {/* 검색창 (검색 탭일 때만) */}
                {activeTab === 'search' && (
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="환자명, 전화번호, 차트번호로 검색"
                                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                autoFocus
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <SearchIcon className="w-4 h-4" />
                                검색
                            </button>
                        </div>
                    </div>
                )}

                {/* 에러 메시지 */}
                {error && (
                    <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* 결과 목록 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'today' ? (
                        // 오늘 내원 환자 목록
                        isLoadingToday ? (
                            <div className="text-center text-gray-400 py-8">
                                오늘 내원 환자를 불러오는 중...
                            </div>
                        ) : todayAccepts.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                오늘 내원한 환자가 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayAccepts.map((patient) => (
                                    <button
                                        key={patient.diag_id}
                                        onClick={() => handleSelectAcceptedPatient(patient)}
                                        className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-gray-300" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{patient.name}</div>
                                                <div className="text-gray-400 text-sm">
                                                    차트번호: {patient.chart_id}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                            {patient.accept_time.substring(0, 5)} 접수
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        // 검색 결과
                        isSearching ? (
                            <div className="text-center text-gray-400 py-8">
                                검색 중...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                {searchQuery ? '검색 결과가 없습니다.' : '환자명, 전화번호, 차트번호로 검색하세요.'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {searchResults.map((patient) => {
                                    const birthInfo = parseBirthDate(patient.birth);
                                    const gender = parseGender(patient.birth) || patient.gender;

                                    return (
                                        <button
                                            key={patient.patient_id}
                                            onClick={() => handleSelectPatient(patient)}
                                            className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                                    <UserIcon className="w-5 h-5 text-gray-300" />
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">
                                                        {patient.name}
                                                        {gender && <span className="ml-2 text-gray-400 text-sm">({gender})</span>}
                                                        {birthInfo && <span className="ml-2 text-gray-400 text-sm">{birthInfo.age}세</span>}
                                                    </div>
                                                    <div className="text-gray-400 text-sm">
                                                        차트번호: {patient.chart_id} | {patient.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-gray-700 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientSearch;
