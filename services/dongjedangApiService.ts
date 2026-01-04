/**
 * 동제당 API 서비스
 * - 환자 검색
 * - 환자 상세 조회
 * - 당일 접수 조회
 */

// Cloudflare Workers 프록시 사용
const API_BASE_URL = 'https://dongjedang-api-proxy.dongjedangmainn.workers.dev/api/v1';

// API Key는 환경 변수에서 가져옴 (Origin 기반 인증 시 불필요)
const getApiKey = (): string => {
    // Vite 환경 변수
    return import.meta.env.VITE_DONGJEDANG_API_KEY || '';
};

// 공통 헤더 (Origin 기반 인증 시 API Key 없어도 됨)
const getHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const apiKey = getApiKey();
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }

    return headers;
};

// 응답 타입 정의
export interface Patient {
    patient_id: number;
    chart_id: string;
    name: string;
    birth: string;
    phone: string;
    gender?: string;
    memo?: string;
}

export interface PatientSearchResult {
    patients: Patient[];
    count: number;
}

export interface AcceptedPatient {
    diag_id: number;
    patient_id: number;
    chart_id: string;
    name: string;
    accept_date: string;
    accept_time: string;
}

export interface TodayAcceptsResult {
    accepts: AcceptedPatient[];
    count: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * 환자 검색
 * @param params 검색 조건 (name, phone, chart_id 중 최소 하나)
 */
export async function searchPatients(params: {
    name?: string;
    phone?: string;
    chart_id?: string;
}): Promise<ApiResponse<PatientSearchResult>> {
    try {
        const queryParams = new URLSearchParams();
        if (params.name) queryParams.append('name', params.name);
        if (params.phone) queryParams.append('phone', params.phone);
        if (params.chart_id) queryParams.append('chart_id', params.chart_id);

        const response = await fetch(
            `${API_BASE_URL}/patients/search?${queryParams.toString()}`,
            {
                method: 'GET',
                headers: getHeaders(),
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('환자 검색 실패:', error);
        console.error('API URL:', `${API_BASE_URL}/patients/search`);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: `네트워크 오류: ${errorMessage}`,
            },
        };
    }
}

/**
 * 환자 상세 조회
 * @param patientId 환자 ID
 */
export async function getPatientDetail(patientId: number): Promise<ApiResponse<Patient>> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/patients/${patientId}`,
            {
                method: 'GET',
                headers: getHeaders(),
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('환자 상세 조회 실패:', error);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: '네트워크 오류가 발생했습니다.',
            },
        };
    }
}

/**
 * 당일 접수 환자 조회
 * @param date 조회 날짜 (YYYY-MM-DD), 기본값: 오늘
 */
export async function getTodayAccepts(date?: string): Promise<ApiResponse<TodayAcceptsResult>> {
    try {
        const queryParams = new URLSearchParams();
        if (date) queryParams.append('date', date);

        const url = date
            ? `${API_BASE_URL}/patients?${queryParams.toString()}`
            : `${API_BASE_URL}/patients`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('당일 접수 조회 실패:', error);
        console.error('API URL:', `${API_BASE_URL}/patients`);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: `네트워크 오류: ${errorMessage}`,
            },
        };
    }
}

/**
 * 생년월일 파싱 (YYMMDD 또는 YYMMDDN 형식)
 */
export function parseBirthDate(birth: string): { year: number; month: number; day: number; age: number } | null {
    if (!birth || birth.length < 6) return null;

    const yy = parseInt(birth.substring(0, 2), 10);
    const mm = parseInt(birth.substring(2, 4), 10);
    const dd = parseInt(birth.substring(4, 6), 10);

    // 성별 코드로 세기 판별 (1,2: 1900년대, 3,4: 2000년대)
    const genderCode = birth.length >= 7 ? parseInt(birth.substring(6, 7), 10) : 0;
    const century = genderCode >= 3 ? 2000 : 1900;
    const year = century + yy;

    const today = new Date();
    let age = today.getFullYear() - year;
    const birthThisYear = new Date(today.getFullYear(), mm - 1, dd);
    if (today < birthThisYear) age--;

    return { year, month: mm, day: dd, age };
}

/**
 * 성별 파싱
 */
export function parseGender(birth: string): '남' | '여' | null {
    if (!birth || birth.length < 7) return null;
    const genderCode = parseInt(birth.substring(6, 7), 10);
    // 1, 3: 남자, 2, 4: 여자
    if (genderCode === 1 || genderCode === 3) return '남';
    if (genderCode === 2 || genderCode === 4) return '여';
    return null;
}
