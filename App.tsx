
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeWithGemini, generateSoapChart, verifyAndCorrectTranscript } from './services/geminiService.ts';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { PatientSearch } from './components/PatientSearch';
import { Patient } from './services/dongjedangApiService';
import {
    MicrophoneIcon,
    StopIcon,
    CopyIcon,
    SaveIcon,
    Spinner,
    SettingsIcon,
    GeminiIcon,
    CloseIcon,
    DjdLogoIcon,
    EditIcon,
    CheckIcon,
    AttachmentIcon,
    GoogleIcon,
    GoogleTasksIcon,
    TrashIcon,
    PlusIcon,
    NotionIcon,
    RevisitIcon,
    GoogleSheetsIcon,
    DoctalkIcon,
    RefreshIcon,
    SlackIcon
} from './components/icons.tsx';

// TypeScript type definitions for Google API objects
declare global {
    interface Window {
        gapi: any;
        google: any;
        tokenClient: any;
    }
}

interface Settings {
    geminiKey: string;
    googleApiKey: string;
    googleClientId: string;
    googleClientSecret: string;
}

const SettingsModal = ({ isOpen, onClose, onSave, currentSettings }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: Settings) => void;
    currentSettings: Settings;
}) => {
    const [geminiKey, setGeminiKey] = useState(currentSettings.geminiKey);
    const [googleApiKey, setGoogleApiKey] = useState(currentSettings.googleApiKey);
    const [googleClientId, setGoogleClientId] = useState(currentSettings.googleClientId);
    const [googleClientSecret, setGoogleClientSecret] = useState(currentSettings.googleClientSecret);

    useEffect(() => {
        setGeminiKey(currentSettings.geminiKey);
        setGoogleApiKey(currentSettings.googleApiKey);
        setGoogleClientId(currentSettings.googleClientId);
        setGoogleClientSecret(currentSettings.googleClientSecret);
    }, [currentSettings, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ geminiKey, googleApiKey, googleClientId, googleClientSecret });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <SettingsIcon className="w-6 h-6 mr-3" />
                        설정
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-3 flex items-center">
                            <GeminiIcon className="w-5 h-5 mr-2" />
                            Google Gemini API
                        </h3>
                        <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-300 mb-1">API Key (음성전사 및 차트생성용)</label>
                        <input
                            id="gemini-key"
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="Google Gemini API 키를 입력하세요"
                        />
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-brand-accent mt-1">
                            API 키 발급받기
                        </a>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-3 flex items-center">
                            <GoogleIcon className="w-5 h-5 mr-2" />
                            Google Calendar & Tasks API
                        </h3>
                        <label htmlFor="google-api-key" className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                        <input
                            id="google-api-key"
                            type="password"
                            value={googleApiKey}
                            onChange={(e) => setGoogleApiKey(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="Google Cloud API 키"
                        />
                        <label htmlFor="google-client-id" className="block text-sm font-medium text-gray-300 mb-1 mt-4">Client ID</label>
                        <input
                            id="google-client-id"
                            type="password"
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="Google Cloud OAuth 2.0 클라이언트 ID"
                        />
                        <label htmlFor="google-client-secret" className="block text-sm font-medium text-gray-300 mb-1 mt-4">Client Secret (자동 로그인 유지용)</label>
                        <input
                            id="google-client-secret"
                            type="password"
                            value={googleClientSecret}
                            onChange={(e) => setGoogleClientSecret(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="Google Cloud OAuth 2.0 클라이언트 Secret"
                        />
                        <p className="text-xs text-gray-500 mt-1">입력하면 Refresh Token으로 자동 로그인 유지됩니다.</p>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-brand-accent mt-1">
                            API 키 및 클라이언트 ID 발급받기
                        </a>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-6 rounded-md transition-colors"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

const CalendarModal = ({ isOpen, onClose, isSignedIn, isApiLoading, apiError, onAuthClick }: {
    isOpen: boolean;
    onClose: () => void;
    isSignedIn: boolean;
    isApiLoading: boolean;
    apiError: string;
    onAuthClick: () => void;
}) => {
    const [events, setEvents] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const calendarColorMap: { [key: string]: string } = {
        '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
        '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
        '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
    };
    const defaultCalendarColor = '#039be5';

    const formatEventTime = (start: any, end: any): string => {
        if (!start.dateTime) {
            return "하루 종일";
        }
        try {
            const startTime = new Date(start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const endTime = new Date(end.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `${startTime} - ${endTime}`;
        } catch (e) {
            return "시간 정보 없음";
        }
    };

    const fetchEvents = useCallback(async () => {
        if (!isSignedIn) return;
        setIsFetching(true);
        setFetchError('');
        try {
            const today = new Date();
            const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, -1).toISOString();
            const response = await window.gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            });
            setEvents(response.result.items || []);
        } catch (err) {
            console.error(err);
            setFetchError('일정을 불러오는 데 실패했습니다. 권한을 확인하거나 다시 로그인해주세요.');
        } finally {
            setIsFetching(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (isOpen && isSignedIn) {
            fetchEvents();
        }
        if (!isOpen) {
            setEvents([]);
            setFetchError('');
        }
    }, [isOpen, isSignedIn, fetchEvents]);

    if (!isOpen) return null;

    const currentError = apiError || fetchError;
    const currentIsLoading = isApiLoading || isFetching;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <GoogleIcon className="w-6 h-6 mr-3" />
                        Google Calendar
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="h-64 overflow-y-auto bg-gray-900 rounded-md p-3 border border-gray-700">
                    {currentIsLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Spinner className="w-8 h-8 text-brand-google-blue" />
                        </div>
                    ) : currentError ? (
                        <div className="flex justify-center items-center h-full text-red-400 p-4 text-center">{currentError}</div>
                    ) : !isSignedIn ? (
                        <div className="flex justify-center items-center h-full">
                            <button
                                onClick={onAuthClick}
                                className="flex items-center justify-center gap-x-3 bg-gray-700 text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            >
                                <GoogleIcon className="w-6 h-6" />
                                Google 계정으로 로그인
                            </button>
                        </div>
                    ) : events.length > 0 ? (
                        <ul className="space-y-2">
                            {events.map((event) => (
                                <li key={event.id} className="p-3 bg-gray-700 rounded-md text-gray-200 shadow-sm border border-gray-600 flex items-start space-x-3">
                                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: calendarColorMap[event.colorId] || defaultCalendarColor }}></div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{event.summary}</p>
                                        <p className="text-sm text-gray-400">{formatEventTime(event.start, event.end)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            오늘 등록된 일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MedicationCalendarModal = ({ isOpen, onClose, isSignedIn, isApiLoading, apiError, onAuthClick }: {
    isOpen: boolean;
    onClose: () => void;
    isSignedIn: boolean;
    isApiLoading: boolean;
    apiError: string;
    onAuthClick: () => void;
}) => {
    const [events, setEvents] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const MEDICATION_CALENDAR_ID = 'd80e1cf61366f84cd933fd47cd684ba45ad8b9267195ded427cec993dadc67a1@group.calendar.google.com';

    const calendarColorMap: { [key: string]: string } = {
        '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
        '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
        '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
    };
    const defaultCalendarColor = '#33b679'; // 녹색 (복약용)

    const formatEventTime = (start: any, end: any): string => {
        if (!start.dateTime) {
            return "하루 종일";
        }
        try {
            const startTime = new Date(start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const endTime = new Date(end.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `${startTime} - ${endTime}`;
        } catch (e) {
            return "시간 정보 없음";
        }
    };

    const fetchEvents = useCallback(async () => {
        if (!isSignedIn) return;
        setIsFetching(true);
        setFetchError('');
        try {
            const today = new Date();
            const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, -1).toISOString();
            const response = await window.gapi.client.calendar.events.list({
                'calendarId': MEDICATION_CALENDAR_ID,
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            });
            setEvents(response.result.items || []);
        } catch (err) {
            console.error(err);
            setFetchError('복약 일정을 불러오는 데 실패했습니다. 권한을 확인하거나 다시 로그인해주세요.');
        } finally {
            setIsFetching(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (isOpen && isSignedIn) {
            fetchEvents();
        }
        if (!isOpen) {
            setEvents([]);
            setFetchError('');
        }
    }, [isOpen, isSignedIn, fetchEvents]);

    if (!isOpen) return null;

    const currentError = apiError || fetchError;
    const currentIsLoading = isApiLoading || isFetching;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <span className="w-6 h-6 mr-3 text-green-400">💊</span>
                        복약 캘린더
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="h-64 overflow-y-auto bg-gray-900 rounded-md p-3 border border-gray-700">
                    {currentIsLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Spinner className="w-8 h-8 text-green-400" />
                        </div>
                    ) : currentError ? (
                        <div className="flex justify-center items-center h-full text-red-400 p-4 text-center">{currentError}</div>
                    ) : !isSignedIn ? (
                        <div className="flex justify-center items-center h-full">
                            <button
                                onClick={onAuthClick}
                                className="flex items-center justify-center gap-x-3 bg-gray-700 text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            >
                                <GoogleIcon className="w-6 h-6" />
                                Google 계정으로 로그인
                            </button>
                        </div>
                    ) : events.length > 0 ? (
                        <ul className="space-y-2">
                            {events.map((event) => (
                                <li key={event.id} className="p-3 bg-gray-700 rounded-md text-gray-200 shadow-sm border border-gray-600 flex items-start space-x-3">
                                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: calendarColorMap[event.colorId] || defaultCalendarColor }}></div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{event.summary}</p>
                                        <p className="text-sm text-gray-400">{formatEventTime(event.start, event.end)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            오늘 등록된 복약 일정이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TasksModal = ({ isOpen, onClose, isSignedIn, isApiLoading, apiError, onAuthClick }: {
    isOpen: boolean;
    onClose: () => void;
    isSignedIn: boolean;
    isApiLoading: boolean;
    apiError: string;
    onAuthClick: () => void;
}) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [editingTask, setEditingTask] = useState<{ id: string; title: string } | null>(null);

    const fetchTasks = useCallback(async () => {
        if (!isSignedIn) return;
        setIsFetching(true);
        setFetchError('');
        try {
            const response = await window.gapi.client.tasks.tasks.list({
                tasklist: '@default'
            });
            setTasks(response.result.items || []);
        } catch (err) {
            setFetchError('작업을 불러오는 데 실패했습니다.');
            console.error(err);
        } finally {
            setIsFetching(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (isOpen && isSignedIn) {
            fetchTasks();
        }
        if (!isOpen) {
            setTasks([]);
            setFetchError('');
        }
    }, [isOpen, isSignedIn, fetchTasks]);

    const handleAddTask = async () => {
        if (newTaskTitle.trim() === '') return;
        try {
            await window.gapi.client.tasks.tasks.insert({
                tasklist: '@default',
                title: newTaskTitle,
            });
            setNewTaskTitle('');
            fetchTasks();
        } catch (error) {
            setFetchError('작업 추가에 실패했습니다.');
        }
    };

    const handleUpdateTaskStatus = async (task: any, completed: boolean) => {
        try {
            await window.gapi.client.tasks.tasks.update({
                tasklist: '@default',
                task: task.id,
                id: task.id,
                status: completed ? 'completed' : 'needsAction'
            });
            fetchTasks();
        } catch (error) {
            setFetchError('작업 상태 업데이트에 실패했습니다.');
        }
    };

    const handleUpdateTaskTitle = async () => {
        if (!editingTask || editingTask.title.trim() === '') return;
        try {
            await window.gapi.client.tasks.tasks.update({
                tasklist: '@default',
                task: editingTask.id,
                id: editingTask.id,
                title: editingTask.title,
            });
            setEditingTask(null);
            fetchTasks();
        } catch (error) {
            setFetchError('작업 제목 업데이트에 실패했습니다.');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await window.gapi.client.tasks.tasks.delete({
                tasklist: '@default',
                task: taskId,
            });
            fetchTasks();
        } catch (error) {
            setFetchError('작업 삭제에 실패했습니다.');
        }
    };

    if (!isOpen) return null;

    const currentError = apiError || fetchError;
    const currentIsLoading = isApiLoading || isFetching;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4 flex flex-col" style={{ height: '500px' }}>
                <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <GoogleTasksIcon className="w-6 h-6 mr-3 text-blue-500" />
                        Google Tasks
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto bg-gray-900 rounded-md p-3 border border-gray-700">
                    {currentIsLoading ? (
                        <div className="flex justify-center items-center h-full"><Spinner className="w-8 h-8 text-blue-500" /></div>
                    ) : currentError ? (
                        <div className="flex justify-center items-center h-full text-red-400 p-4 text-center">{currentError}</div>
                    ) : !isSignedIn ? (
                        <div className="flex justify-center items-center h-full">
                            <button onClick={onAuthClick} className="flex items-center justify-center gap-x-3 bg-gray-700 text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm">
                                <GoogleIcon className="w-6 h-6" /> Google 계정으로 로그인
                            </button>
                        </div>
                    ) : tasks.length > 0 ? (
                        <ul className="space-y-2">
                            {tasks.map((task) => (
                                <li key={task.id} className="p-3 bg-gray-700 rounded-md shadow-sm border border-gray-600 flex items-center space-x-3 group">
                                    <input type="checkbox" checked={task.status === 'completed'} onChange={(e) => handleUpdateTaskStatus(task, e.target.checked)} className="form-checkbox h-5 w-5 text-blue-500 rounded focus:ring-blue-500 bg-gray-800 border-gray-600" />
                                    <div className="flex-grow">
                                        {editingTask?.id === task.id ? (
                                            <input type="text" value={editingTask!.title} onChange={(e) => setEditingTask({ id: editingTask!.id, title: e.target.value })} onBlur={handleUpdateTaskTitle} onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskTitle()} className="w-full border-b-2 border-blue-500 focus:outline-none bg-transparent text-white" autoFocus />
                                        ) : (
                                            <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>{task.title}</p>
                                        )}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingTask({ id: task.id, title: task.title })} className="p-1 text-gray-400 hover:text-blue-500 rounded-full"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-400">작업이 없습니다.</div>
                    )}
                </div>
                {isSignedIn && !isApiLoading && (
                    <div className="flex-shrink-0 mt-4 flex items-center gap-x-2">
                        <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} placeholder="새 작업 추가" className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={handleAddTask} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400" disabled={!newTaskTitle.trim()}><PlusIcon className="w-6 h-6" /></button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Chunk duration constant: 2 minutes in milliseconds
const CHUNK_DURATION_MS = 2 * 60 * 1000;

const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [transcript, setTranscript] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [soapChart, setSoapChart] = useState('');
    const [summary, setSummary] = useState('');
    const [patientName, setPatientName] = useState('');
    const [isEditingPatientName, setIsEditingPatientName] = useState(false);
    const [editedPatientName, setEditedPatientName] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [isMedicationCalendarOpen, setIsMedicationCalendarOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSavingToDrive, setIsSavingToDrive] = useState(false);
    const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<(Patient & { age?: number }) | null>(null);

    const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
    const [googleApiKey, setGoogleApiKey] = useState(() => localStorage.getItem('googleApiKey') || '');
    const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('googleClientId') || '');
    const [googleClientSecret, setGoogleClientSecret] = useState(() => localStorage.getItem('googleClientSecret') || '');

    // Google OAuth (PKCE)
    const {
        isSignedIn: isGoogleSignedIn,
        signIn: handleGoogleAuthClick,
        signOut: handleGoogleSignOut,
        isLoading: isGoogleApiLoading,
        error: googleApiError
    } = useGoogleAuth(googleClientId, googleApiKey);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<Date | null>(null);

    // Chunking Refs
    const completedAudioBlobsRef = useRef<Blob[]>([]);
    const chunkIntervalRef = useRef<any>(null);
    const isAutoRestartingRef = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 새 입력 - 상태 초기화 (로그인 유지, 페이지 새로고침 없음)
    const handleReset = useCallback(() => {
        setTranscript('');
        setAdditionalNotes('');
        setSoapChart('');
        setSummary('');
        setPatientName('');
        setIsEditingPatientName(false);
        setEditedPatientName('');
        setError(null);
        setIsEditing(false);
        setIsEditingTranscript(false);
        setStatusMessage('');
        setSelectedPatient(null);
        audioChunksRef.current = [];
        completedAudioBlobsRef.current = [];
        console.log('✅ 새 입력 - 상태 초기화 완료 (로그인 유지)');
    }, []);


    useEffect(() => {
        if (!geminiApiKey) {
            setIsSettingsOpen(true);
        }
    }, [geminiApiKey]);

    useEffect(() => {
        if (soapChart) {
            // "✅ 요약" block until "✅확인사항"
            const summaryRegex = /✅ 요약\s*-\s*([\s\S]*?)✅확인사항/s;
            const summaryMatch = soapChart.match(summaryRegex);
            const extractedSummary = summaryMatch ? summaryMatch[1].trim() : '';
            setSummary(extractedSummary);

            // 환자명 처리: selectedPatient가 있으면 우선 사용 (AI 추출 무시)
            if (selectedPatient) {
                // 선택된 환자가 있으면 해당 환자명 고정
                setPatientName(selectedPatient.name);
                // SOAP 차트 내의 환자명도 선택된 환자로 업데이트
                const updatedChart = soapChart.replace(
                    /(✅ 환자명:\s*)(.*)/,
                    `$1${selectedPatient.name}`
                );
                if (updatedChart !== soapChart) {
                    setSoapChart(updatedChart);
                }
            } else {
                // 이머전시 모드: 선택된 환자 없으면 AI가 추출한 이름 사용
                const nameRegex = /✅ 환자명:\s*(.*)/;
                const nameMatch = soapChart.match(nameRegex);
                const extractedName = nameMatch ? nameMatch[1].trim() : '';
                setPatientName(extractedName);
            }

            // If we were editing, stop editing when chart re-generates
            setIsEditingPatientName(false);
        } else {
            setSummary('');
            setPatientName('');
        }
    }, [soapChart, selectedPatient]);

    const handleGenerateChart = useCallback(async (
        transcriptText: string,
        notes: string,
        startTime: Date
    ) => {
        if (!geminiApiKey) {
            setError('Gemini API 키가 설정되지 않았습니다.');
            setIsSettingsOpen(true);
            return;
        }

        setIsGenerating(true);
        setStatusMessage('SOAP 차트 생성 중...');
        setError(null);
        setSoapChart('');
        setIsEditing(false);

        try {
            const generatedChart = await generateSoapChart(geminiApiKey, transcriptText, notes, startTime);
            setSoapChart(generatedChart);
            setStatusMessage('');
        } catch (err) {
            if (err instanceof Error) {
                const lowerCaseMessage = err.message.toLowerCase();
                if (lowerCaseMessage.includes('api key')) {
                    setError(
                        <>
                            SOAP 차트 생성 실패: API 키가 잘못되었을 수 있습니다. <br />
                            설정 메뉴에서 Gemini API 키를 확인해주세요.
                        </>
                    );
                } else {
                    setError(
                        <>
                            SOAP 차트 생성에 실패했습니다. <br />
                            AI 모델 서비스에 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.
                        </>
                    );
                }
            } else {
                setError('SOAP 차트 생성 실패: 알 수 없는 오류가 발생했습니다.');
            }
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    }, [geminiApiKey]);

    const processRecordedAudio = async (blobs: Blob[], startTime: Date, stream: MediaStream) => {
        if (blobs.length === 0) {
            setStatusMessage('음성이 감지되지 않았습니다.');
            setIsGenerating(false);
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        let fullTranscript = '';
        let loopError: Error | null = null;

        try {
            for (let i = 0; i < blobs.length; i++) {
                setStatusMessage(`Gemini AI 음성 분석 중... (구간 ${i + 1}/${blobs.length})`);
                const prompt = fullTranscript.slice(-300); // Provide previous context
                const chunkText = await transcribeWithGemini(geminiApiKey, blobs[i], prompt);
                fullTranscript += (fullTranscript ? ' ' : '') + chunkText;
            }
            setTranscript(fullTranscript);
        } catch (err) {
            loopError = err instanceof Error ? err : new Error('알 수 없는 전사 오류');
            console.error(err);
        }

        if (loopError) {
            setError(`음성 전사 실패: ${loopError.message}`);
            setIsGenerating(false);
            setStatusMessage('');
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        if (fullTranscript.trim().length === 0 && additionalNotes.trim().length === 0) {
            setSoapChart('');
            setStatusMessage('음성이 감지되지 않았고 추가 정보도 없습니다.');
            setIsGenerating(false);
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        // --- Stage 1.5: Verification & Correction ---
        let textToProcess = fullTranscript;
        if (fullTranscript.trim()) {
            try {
                setStatusMessage('전사 내용 검수 및 수정 중...');
                const corrected = await verifyAndCorrectTranscript(geminiApiKey, fullTranscript);
                setTranscript(corrected);
                textToProcess = corrected;
            } catch (err) {
                setError(
                    <>
                        전사 내용 자동 검수에 실패했습니다. 원본으로 차트 생성을 계속합니다. <br />
                        ({err instanceof Error ? err.message : '알 수 없는 오류'})
                    </>
                );
            }
        }

        // --- Stage 2: SOAP Chart Generation ---
        setStatusMessage('검수 완료. SOAP 차트 생성 중...');
        await handleGenerateChart(textToProcess, additionalNotes, startTime);
        stream.getTracks().forEach(track => track.stop());
    };

    const handleToggleRecording = useCallback(async () => {
        if (!geminiApiKey) {
            setError('Gemini API 키가 설정되어야 합니다. 설정 메뉴에서 키를 입력해주세요.');
            setIsSettingsOpen(true);
            return;
        }

        if (isRecording) {
            // Stop recording (Final)
            if (chunkIntervalRef.current) {
                clearInterval(chunkIntervalRef.current);
                chunkIntervalRef.current = null;
            }
            isAutoRestartingRef.current = false;
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            setStatusMessage('녹음 중지. 처리 중...');
            setIsGenerating(true);
            setError(null);
        } else {
            // Start recording
            setError(null);
            setSoapChart('');
            setTranscript('');
            setIsEditing(false);
            setIsEditingTranscript(false);
            setStatusMessage('마이크 초기화 중...');

            // Reset Buffers
            audioChunksRef.current = [];
            completedAudioBlobsRef.current = [];
            isAutoRestartingRef.current = false;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                recordingStartTimeRef.current = new Date();
                mediaRecorderRef.current = new MediaRecorder(stream);

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    if (audioBlob.size > 0) {
                        completedAudioBlobsRef.current.push(audioBlob);
                    }
                    audioChunksRef.current = []; // Clear the chunk buffer for the next segment

                    if (isAutoRestartingRef.current) {
                        // If it was an auto-restart, start recording again immediately using the same stream
                        mediaRecorderRef.current?.start();
                    } else {
                        // Final stop, process everything
                        const startTime = recordingStartTimeRef.current || new Date();
                        await processRecordedAudio(completedAudioBlobsRef.current, startTime, stream);
                    }
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
                setStatusMessage('녹음 중... (Gemini AI가 듣고 있습니다)');

                // Set interval to restart recording every CHUNK_DURATION_MS
                chunkIntervalRef.current = setInterval(() => {
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        isAutoRestartingRef.current = true;
                        mediaRecorderRef.current.stop();
                    }
                }, CHUNK_DURATION_MS);

            } catch (err) {
                let specificMessage = '알 수 없는 오류가 발생했습니다.';
                if (err instanceof Error) {
                    switch (err.name) {
                        case 'NotAllowedError':
                            specificMessage = '마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
                            break;
                        case 'NotFoundError':
                            specificMessage = '사용 가능한 마이크를 찾을 수 없습니다.';
                            break;
                        case 'SecurityError':
                            specificMessage = '마이크 기능은 보안(HTTPS) 연결에서만 사용할 수 있습니다.';
                            break;
                        case 'NotReadableError':
                            specificMessage = '하드웨어 오류로 인해 마이크를 읽을 수 없습니다.';
                            break;
                        default:
                            specificMessage = err.message;
                            break;
                    }
                }
                const errorMessage = err instanceof Error ? specificMessage : 'An unknown error occurred.';
                setError(`녹음 시작 실패: ${errorMessage}`);
                console.error(err);
                setStatusMessage('녹음을 시작할 수 없습니다. 권한 및 연결을 확인하세요.');
            }
        }
    }, [isRecording, geminiApiKey, additionalNotes, handleGenerateChart]);

    const handleTextGenerationClick = async () => {
        if (!transcript && !additionalNotes) {
            setError('분석할 텍스트가 없습니다. 녹음을 진행하거나 추가 정보를 입력해주세요.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('텍스트 내용 검수 및 수정 중...');
        setError(null);
        setSoapChart('');

        let textToProcess = transcript;

        if (transcript.trim()) {
            try {
                const corrected = await verifyAndCorrectTranscript(geminiApiKey, transcript);
                setTranscript(corrected);
                textToProcess = corrected;
            } catch (err) {
                setError(
                    <>
                        텍스트 내용 자동 검수에 실패했습니다. 현재 내용으로 차트 생성을 계속합니다. <br />
                        ({err instanceof Error ? err.message : '알 수 없는 오류'})
                    </>
                );
            }
        }

        await handleGenerateChart(textToProcess, additionalNotes, new Date());
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chunkIntervalRef.current) {
                clearInterval(chunkIntervalRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(soapChart)
            .then(() => alert('SOAP 차트가 클립보드에 복사되었습니다!'))
            .catch(() => alert('텍스트 복사에 실패했습니다.'));
    };

    const copyTranscriptToClipboard = () => {
        navigator.clipboard.writeText(transcript)
            .then(() => alert('전사 내용이 클립보드에 복사되었습니다!'))
            .catch(() => alert('전사 내용 복사에 실패했습니다.'));
    };

    const copySummaryToClipboard = () => {
        if (!summary) return;
        navigator.clipboard.writeText(summary)
            .then(() => alert('요약 내용이 클립보드에 복사되었습니다!'))
            .catch(() => alert('요약 내용 복사에 실패했습니다.'));
    };

    const generateFilename = (prefix: string, extension: 'txt' | 'md'): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timestamp = `${year}${month}${day}_${hours}${minutes}`;

        const match = soapChart.match(/환자명:\s*(.*)/);
        const patientNameRaw = match && match[1] ? match[1].trim() : '미확인';
        // Remove brackets if they exist
        let patientName = (patientNameRaw.replace(/^\[(.*)\]$/, '$1').trim()) || '미확인';
        // Sanitize for filename
        patientName = patientName.replace(/[\\?%*:"|<>./]/g, '_');

        return `${prefix}_${timestamp}_${patientName}.${extension}`;
    };

    const handleSaveToDrive = async () => {
        if (!isGoogleSignedIn) {
            setError(
                <>
                    Google 계정에 로그인해야 Drive에 저장할 수 있습니다. <br />
                    상단의 Google 로그인 버튼을 통해 로그인해주세요.
                </>
            );
            return;
        }
        if (!soapChart || isSavingToDrive) return;

        // PKCE 토큰 가져오기
        const pkceTokenString = localStorage.getItem('google_oauth_tokens');
        let oauthToken: string | null = null;
        if (pkceTokenString) {
            try {
                const tokens = JSON.parse(pkceTokenString);
                if (tokens?.access_token) {
                    oauthToken = tokens.access_token;
                }
            } catch (e) {
                console.error('토큰 파싱 실패:', e);
            }
        }

        if (!oauthToken) {
            setError('OAuth 토큰이 없습니다. 다시 로그인해주세요.');
            return;
        }

        setIsSavingToDrive(true);
        setStatusMessage('Google Drive에 저장 중...');
        setError(null);

        try {
            const FOLDER_ID = '1XGJmZp53bm_o-zaDgEzMv36FIxEL2e1F';
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const filename = generateFilename('SOAP차트', 'txt');
            const metadata = {
                name: filename,
                mimeType: 'text/plain',
                parents: [FOLDER_ID]
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
                soapChart +
                close_delim;

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${oauthToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            alert('SOAP 차트가 Google Drive에 성공적으로 저장되었습니다!');
            setStatusMessage('Google Drive에 저장 완료.');

        } catch (err) {
            console.error('Error saving to Google Drive', err);
            const errorMessage = (err as Error).message || '알 수 없는 오류';
            setError(`Google Drive 저장 실패: ${errorMessage}`);
            setStatusMessage('저장 실패.');
        } finally {
            setIsSavingToDrive(false);
        }
    };

    const saveTranscriptAsMarkdownFile = () => {
        const filename = generateFilename('전사내용', 'md');
        const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const saveSoapChartAsMarkdownFile = () => {
        const filename = generateFilename('SOAP차트', 'md');
        const blob = new Blob([soapChart], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveChart = () => {
        if (!soapChart) return;
        saveSoapChartAsMarkdownFile();
        handleSaveToDrive();
    };

    const renderSoapChart = (chartText: string) => {
        // Add line breaks for display
        const formattedText = chartText.replace(/\n/g, '<br />');
        // Apply bold styling
        const htmlText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-brand-accent">$1</strong>');
        return <div dangerouslySetInnerHTML={{ __html: htmlText }} />;
    };

    const handleSaveSettings = (settings: Settings) => {
        localStorage.setItem('geminiApiKey', settings.geminiKey);
        setGeminiApiKey(settings.geminiKey);
        localStorage.setItem('googleApiKey', settings.googleApiKey);
        setGoogleApiKey(settings.googleApiKey);
        localStorage.setItem('googleClientId', settings.googleClientId);
        setGoogleClientId(settings.googleClientId);
        localStorage.setItem('googleClientSecret', settings.googleClientSecret);
        setGoogleClientSecret(settings.googleClientSecret);
        setIsSettingsOpen(false);
        alert('설정이 저장되었습니다. 페이지를 새로고침하여 적용해주세요.');
    };

    const handleCloseSettings = () => {
        setIsSettingsOpen(false);
    }

    const handlePatientNameEditToggle = () => {
        if (isEditingPatientName) { // When finishing edit
            if (editedPatientName.trim() && editedPatientName !== patientName) {
                const updatedChart = soapChart.replace(
                    /(✅ 환자명:\s*)(.*)/,
                    `$1${editedPatientName.trim()}`
                );
                setSoapChart(updatedChart); // This triggers useEffect to update patientName state
            }
            setIsEditingPatientName(false);
        } else { // When starting edit
            setEditedPatientName(patientName);
            setIsEditingPatientName(true);
        }
    };

    const handleFile = (file: File | null | undefined) => {
        if (!file) {
            return;
        }

        if (!file.type.startsWith('text/')) {
            setError('텍스트 파일(.txt)만 첨부할 수 있습니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setAdditionalNotes(prev => prev ? `${prev}\n\n${text}` : text);
            setError(null);
        };
        reader.onerror = () => {
            setError('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0]);
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
            <header className="w-full max-w-7xl flex justify-between items-start mb-6">
                <div className="flex-1 flex justify-start">
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={() => setIsCalendarOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="Google Calendar 일정 보기"
                            title="Google Calendar 일정 보기"
                        >
                            <GoogleIcon className="w-4 h-4" />
                            <span>Google Calendar</span>
                        </button>
                        <button
                            onClick={() => setIsTasksOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="Google Tasks 열기"
                            title="Google Tasks 열기"
                        >
                            <GoogleTasksIcon className="w-4 h-4 text-blue-400" />
                            <span>Google Tasks</span>
                        </button>
                        <button
                            onClick={() => window.open('https://docs.google.com/spreadsheets/u/0/', '_blank', 'noopener,noreferrer')}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="Google Sheets 열기"
                            title="Google Sheets 열기"
                        >
                            <GoogleSheetsIcon className="w-4 h-4" />
                            <span>Google Sheets</span>
                        </button>
                        <button
                            onClick={() => window.open('https://re-visit.kr/dongjedang/hospital/reception/list', '_blank', 'noopener,noreferrer')}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="Re-visit 열기"
                            title="Re-visit 열기"
                        >
                            <RevisitIcon className="w-4 h-4" />
                            <span>Re-visit</span>
                        </button>
                        <button
                            onClick={() => window.open('https://reservation.docfriends.com/login', '_blank', 'noopener,noreferrer')}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="doctalk 예약 열기"
                            title="doctalk 예약 열기"
                        >
                            <DoctalkIcon className="w-4 h-4" />
                            <span>doctalk 예약</span>
                        </button>
                        <button
                            onClick={() => window.open('https://www.notion.so/2c47db3c87d7812e996ee8549265544d?v=2c47db3c87d7800ea36f000c49b829fe', '_blank', 'noopener,noreferrer')}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm"
                            aria-label="Notion 위키 열기"
                            title="Notion 위키 열기"
                        >
                            <NotionIcon className="w-4 h-4" />
                            <span>Notion 위키</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-x-3 sm:gap-x-4">
                        <DjdLogoIcon className="h-9 sm:h-10 w-auto" />
                        <span className="whitespace-nowrap">DJD 차트생성 도우미</span>
                    </h1>
                </div>
                <div className="flex-1 flex justify-end">
                    <div className="flex flex-col space-y-2 items-end">
                        {googleClientId && (
                            isGoogleSignedIn ? (
                                <button
                                    onClick={handleGoogleSignOut}
                                    className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm w-full"
                                    aria-label="Google 로그아웃"
                                    title="Google 로그아웃"
                                >
                                    <GoogleIcon className="w-4 h-4" />
                                    <span>로그아웃</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleGoogleAuthClick}
                                    disabled={!!googleApiError || isGoogleApiLoading}
                                    className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm w-full disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    aria-label="Google 로그인"
                                    title="Google 로그인"
                                >
                                    <GoogleIcon className="w-4 h-4" />
                                    <span>Google 로그인</span>
                                </button>
                            )
                        )}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 bg-gray-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600 shadow-sm w-full"
                            aria-label="설정"
                            title="설정"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            <span>설정</span>
                        </button>
                        {/* 환자 검색 버튼 */}
                        <button
                            onClick={() => setIsPatientSearchOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-semibold py-1.5 px-2 rounded-md transition-colors shadow-sm w-full"
                            aria-label="환자 검색"
                            title="환자 검색"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{selectedPatient ? selectedPatient.name : '환자 검색'}</span>
                        </button>
                        {/* 복약 캘린더 버튼 */}
                        <button
                            onClick={() => setIsMedicationCalendarOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 bg-green-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-green-600 transition-colors border border-green-600 shadow-sm w-full"
                            aria-label="복약 캘린더 보기"
                            title="복약 캘린더 보기"
                        >
                            <span className="w-4 h-4">💊</span>
                            <span>복약 캘린더</span>
                        </button>
                        {/* 슬랙DM 버튼 */}
                        <button
                            onClick={() => window.open('https://app.slack.com/client/T0A188S5VQT', '_blank', 'noopener,noreferrer')}
                            className="flex items-center justify-center gap-x-1.5 bg-purple-700 text-gray-200 text-sm font-semibold py-1.5 px-2 rounded-md hover:bg-purple-600 transition-colors border border-purple-600 shadow-sm w-full"
                            aria-label="슬랙 DM 열기"
                            title="슬랙 DM 열기"
                        >
                            <SlackIcon className="w-4 h-4" />
                            <span>슬랙 DM</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl flex-grow flex flex-col items-center">
                <div className="mb-6 flex flex-col items-center">
                    <div className="flex items-center gap-x-4">
                        <button
                            onClick={handleToggleRecording}
                            disabled={isGenerating}
                            className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out shadow-lg
                ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-secondary'}
                ${isGenerating ? 'bg-gray-500 cursor-not-allowed' : ''}
              `}
                            aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
                        >
                            {isGenerating && !isRecording ? <Spinner className="w-8 h-8 text-white" /> : (
                                isRecording ? <StopIcon className="w-8 h-8 text-white" /> : <MicrophoneIcon className="w-8 h-8 text-white" />
                            )}
                            <span className="text-sm mt-1 font-semibold">
                                {isGenerating && !isRecording ? '처리중' : isRecording ? '중지' : '녹음'}
                            </span>
                        </button>
                        <button
                            onClick={handleTextGenerationClick}
                            disabled={isGenerating || isRecording || (!transcript && !additionalNotes)}
                            className="w-24 h-24 rounded-full flex flex-col items-center justify-center transition-colors duration-300 ease-in-out shadow-lg bg-brand-accent hover:bg-yellow-500 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 text-brand-dark"
                            aria-label="텍스트로 차트 생성"
                            title="텍스트로 차트 생성"
                        >
                            {isGenerating && !isRecording ? <Spinner className="w-8 h-8" /> : <EditIcon className="w-8 h-8" />}
                            <span className="text-sm mt-1 font-semibold">
                                {isGenerating && !isRecording ? '처리중' : '입력'}
                            </span>
                        </button>
                        <button
                            onClick={handleSaveChart}
                            disabled={!soapChart || isGenerating || isRecording || isSavingToDrive}
                            className="w-24 h-24 rounded-full flex flex-col items-center justify-center transition-colors duration-300 ease-in-out shadow-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 text-white"
                            aria-label="차트 저장 (PC & Google Drive)"
                            title="차트 저장 (PC & Google Drive)"
                        >
                            {isSavingToDrive ? <Spinner className="w-8 h-8" /> : <SaveIcon className="w-8 h-8" />}
                            <span className="text-sm mt-1 font-semibold">{isSavingToDrive ? '저장 중...' : '저장'}</span>
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={isGenerating || isRecording}
                            className="w-24 h-24 rounded-full flex flex-col items-center justify-center transition-colors duration-300 ease-in-out shadow-lg bg-white hover:bg-gray-100 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-800"
                            aria-label="새 입력"
                            title="새 입력 (상태 초기화)"
                        >
                            <RefreshIcon className="w-8 h-8" />
                            <span className="text-sm mt-1 font-semibold">새 입력</span>
                        </button>
                    </div>
                    <p className="mt-4 text-gray-300 text-center h-5">{statusMessage || '진료 녹음을 시작하거나 텍스트를 입력하세요.'}</p>
                    {error && <p className="mt-2 text-red-400 text-center">{error}</p>}
                </div>

                <div className="w-full flex-grow flex flex-col lg:flex-row gap-6">
                    <div className={`w-full lg:w-1/2 flex flex-col gap-6 ${isEditing ? 'hidden lg:flex' : 'flex'}`}>
                        {/* Transcription Panel */}
                        <div className="bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col flex-1">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-white">전사 내용</h2>
                                {transcript && !isGenerating && (
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setIsEditingTranscript(!isEditingTranscript)} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label={isEditingTranscript ? '수정 완료' : '수정'}>
                                            {isEditingTranscript ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                                        </button>
                                        <button onClick={copyTranscriptToClipboard} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="클립보드에 복사">
                                            <CopyIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={saveTranscriptAsMarkdownFile} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="마크다운 파일로 저장">
                                            <SaveIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow bg-gray-900 rounded-md p-4 overflow-y-auto text-gray-300">
                                {isEditingTranscript ? (
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none"
                                        spellCheck="false"
                                    />
                                ) : transcript ? (
                                    <div className="whitespace-pre-wrap">{transcript}</div>
                                ) : (
                                    <span className="text-gray-500">
                                        {isRecording ? '녹음 중... 완료 후 여기에 대화 내용이 표시됩니다.' : '녹음이 시작되면 여기에 대화 내용이 표시됩니다.'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Additional Notes Panel */}
                        <div
                            className={`bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col flex-1 relative transition-all duration-300 ${isDraggingOver ? 'border-2 border-dashed border-brand-primary ring-4 ring-brand-primary/20' : 'border-2 border-transparent'}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                            onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                            onDragLeave={() => { setIsDraggingOver(false); }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-white">추가 입력</h2>
                                <button
                                    onClick={handleAttachClick}
                                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="텍스트 파일 첨부"
                                    title="텍스트 파일 첨부"
                                    disabled={isRecording || isGenerating}
                                >
                                    <AttachmentIcon className="w-5 h-5" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".txt,text/plain"
                                    className="hidden"
                                />
                            </div>
                            <div className="flex-grow bg-gray-900 rounded-md p-4 relative">
                                {isDraggingOver && (
                                    <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center rounded-md pointer-events-none z-10">
                                        <p className="text-lg font-semibold text-brand-primary">여기에 텍스트 파일을 드롭하세요</p>
                                    </div>
                                )}
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none placeholder-gray-500"
                                    placeholder="진료 중 추가적인 메모나 키워드를 입력하거나, 여기에 텍스트 파일을 드래그 앤 드롭하세요."
                                    spellCheck="false"
                                    disabled={isRecording || isGenerating}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SOAP Chart Panel */}
                    <div className={`bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col ${isEditing ? 'w-full' : 'w-full lg:w-1/2'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">SOAP 차트</h2>
                        </div>

                        {patientName && !isGenerating && (
                            <div className="mb-4 border-b border-gray-700 pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold text-white">환자 정보</h3>
                                    <button
                                        onClick={handlePatientNameEditToggle}
                                        className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                        aria-label={isEditingPatientName ? '수정 완료' : '환자명 수정'}
                                        title={isEditingPatientName ? '수정 완료' : '환자명 수정'}
                                    >
                                        {isEditingPatientName ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-md p-3 text-gray-300 flex items-center">
                                    <span className="font-semibold mr-2">환자명:</span>
                                    {isEditingPatientName ? (
                                        <input
                                            type="text"
                                            value={editedPatientName}
                                            onChange={(e) => setEditedPatientName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handlePatientNameEditToggle(); }}
                                            onBlur={handlePatientNameEditToggle}
                                            className="w-full bg-gray-900 text-gray-300 focus:outline-none -m-3 p-3 rounded-md"
                                            autoFocus
                                        />
                                    ) : (
                                        <span>{patientName}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {summary && !isGenerating && (
                            <div className="mb-4 border-b border-gray-700 pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold text-white">한줄 요약</h3>
                                    <button
                                        onClick={copySummaryToClipboard}
                                        className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                        aria-label="요약 내용 복사"
                                        title="요약 내용 복사"
                                    >
                                        <CopyIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-md p-3 text-gray-300">
                                    <p>{summary}</p>
                                </div>
                            </div>
                        )}

                        {soapChart && !isGenerating && (
                            <div className="flex justify-end items-center space-x-2 mb-4">
                                <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label={isEditing ? '수정 완료' : '수정'}>
                                    {isEditing ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={copyToClipboard} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="클립보드에 복사">
                                    <CopyIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSaveChart}
                                    disabled={isSavingToDrive}
                                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:cursor-not-allowed"
                                    aria-label="차트 저장 (PC & Google Drive)"
                                    title="차트 저장 (PC & Google Drive)"
                                >
                                    {isSavingToDrive ? <Spinner className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        )}

                        <div className="flex-grow bg-gray-900 rounded-md p-4 overflow-y-auto text-gray-300">
                            {isEditing ? (
                                <textarea
                                    value={soapChart}
                                    onChange={(e) => setSoapChart(e.target.value)}
                                    className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none"
                                    spellCheck="false"
                                />
                            ) : soapChart ? (
                                renderSoapChart(soapChart)
                            ) : (
                                <span className="text-gray-500">
                                    {isGenerating ? 'SOAP 차트 생성 중...' : '녹음이 완료되거나 텍스트 입력 후 차트가 생성됩니다.'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full max-w-7xl mt-8 text-center text-xs text-gray-500">
                <p>© 2030 DJD Quality-improvement in Clinical Practice. All rights reserved.</p>
                <p className="mt-1">본 서비스는 진료개선화 도구이며, 임상 의사결정을 대체할 수 없습니다.</p>
            </footer>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
                onSave={handleSaveSettings}
                currentSettings={{
                    geminiKey: geminiApiKey,
                    googleApiKey: googleApiKey,
                    googleClientId: googleClientId,
                    googleClientSecret: googleClientSecret
                }}
            />
            <CalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                isSignedIn={isGoogleSignedIn}
                isApiLoading={isGoogleApiLoading}
                apiError={googleApiError || ''}
                onAuthClick={handleGoogleAuthClick}
            />
            <MedicationCalendarModal
                isOpen={isMedicationCalendarOpen}
                onClose={() => setIsMedicationCalendarOpen(false)}
                isSignedIn={isGoogleSignedIn}
                isApiLoading={isGoogleApiLoading}
                apiError={googleApiError || ''}
                onAuthClick={handleGoogleAuthClick}
            />
            <TasksModal
                isOpen={isTasksOpen}
                onClose={() => setIsTasksOpen(false)}
                isSignedIn={isGoogleSignedIn}
                isApiLoading={isGoogleApiLoading}
                apiError={googleApiError || ''}
                onAuthClick={handleGoogleAuthClick}
            />
            <PatientSearch
                isOpen={isPatientSearchOpen}
                onClose={() => setIsPatientSearchOpen(false)}
                onPatientSelect={(patient) => {
                    setSelectedPatient(patient);
                    console.log('✅ 환자 선택:', patient.name);
                }}
            />
        </div>
    );
};

export default App;
