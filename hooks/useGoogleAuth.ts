/**
 * Google OAuth Authentication Hook (PKCE Version)
 *
 * Uses OAuth 2.0 Authorization Code Flow with PKCE for secure refresh token support.
 * - Refresh Token 지원으로 장기간 재로그인 불필요
 * - 백엔드 서버 없이 프론트엔드에서 안전하게 OAuth 처리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isAuthenticated as checkIsAuthenticated,
    handleOAuthCallback,
    initiateOAuthFlow,
    signOut as oauthSignOut,
    ensureValidAccessToken,
    needsTokenRefresh,
    refreshAccessToken,
    getStoredTokens,
} from '../services/googleOAuthService';

// Window에 gapi 타입 선언
declare global {
    interface Window {
        gapi: any;
    }
}

// 토큰 자동 갱신 주기 (5분)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;

// GAPI 스크립트 로드
const loadGapiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window.gapi !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('GAPI 스크립트 로드 실패'));
        document.head.appendChild(script);
    });
};

export const useGoogleAuth = (googleClientId: string, googleDeveloperKey: string) => {
    const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isGapiReady, setIsGapiReady] = useState<boolean>(false);
    const refreshIntervalRef = useRef<number | null>(null);
    const gapiInitializedRef = useRef<boolean>(false);

    // GAPI 클라이언트 로드 및 초기화
    const initGapi = useCallback(async () => {
        if (gapiInitializedRef.current) return;

        try {
            await loadGapiScript();

            // client 로드
            await new Promise<void>((resolve) => {
                window.gapi.load('client', resolve);
            });

            // GAPI 클라이언트 초기화 (apiKey는 선택사항)
            const initConfig: { discoveryDocs: string[]; apiKey?: string } = {
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
                    'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
                ],
            };

            // Developer Key가 있으면 추가 (Picker API용)
            if (googleDeveloperKey) {
                initConfig.apiKey = googleDeveloperKey;
            }

            await window.gapi.client.init(initConfig);

            gapiInitializedRef.current = true;
            setIsGapiReady(true);
            console.log('✅ GAPI 준비 완료');
        } catch (err) {
            console.error('❌ GAPI 초기화 실패:', err);
        }
    }, [googleDeveloperKey]);

    // GAPI 클라이언트에 토큰 동기화
    const syncTokenToGapi = useCallback(async () => {
        const tokens = getStoredTokens();
        if (!tokens?.access_token) return;

        // GAPI가 초기화될 때까지 대기
        if (!gapiInitializedRef.current) {
            console.log('⏳ GAPI 초기화 대기 중...');
            await initGapi();
        }

        // GAPI가 로드될 때까지 대기
        if (typeof window.gapi === 'undefined' || !window.gapi.client) {
            console.log('⏳ GAPI 클라이언트 로드 대기 중...');
            return;
        }

        try {
            // GAPI 클라이언트에 토큰 설정
            window.gapi.client.setToken({ access_token: tokens.access_token });
            console.log('✅ GAPI 클라이언트에 토큰 동기화 완료');
        } catch (err) {
            console.warn('⚠️ GAPI 토큰 동기화 실패 (무시됨):', err);
        }
    }, [initGapi]);

    // 초기화 및 OAuth callback 처리
    useEffect(() => {
        const initialize = async () => {
            try {
                // 1. 먼저 GAPI 초기화 (Calendar/Tasks API 사용을 위해 필수)
                console.log('🔄 GAPI 초기화 시작...');
                await initGapi();

                // 2. URL에 code 파라미터가 있으면 OAuth callback 처리
                const wasCallback = await handleOAuthCallback();

                if (wasCallback) {
                    console.log('✅ OAuth callback 처리 완료');
                }

                // 3. 인증 상태 확인
                const authenticated = checkIsAuthenticated();
                setIsSignedIn(authenticated);
                setIsInitialized(true);

                if (authenticated) {
                    console.log('✅ 기존 세션 복원됨');
                    // GAPI에 토큰 동기화
                    await syncTokenToGapi();
                }
            } catch (err) {
                console.error('❌ 초기화 오류:', err);
                setError(err instanceof Error ? err.message : '초기화 실패');
                setIsSignedIn(false);
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, [initGapi, syncTokenToGapi]);

    // 토큰 자동 갱신 타이머
    useEffect(() => {
        if (!isSignedIn) {
            // 인증되지 않았으면 타이머 정리
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            return;
        }

        const checkAndRefreshToken = async () => {
            try {
                if (needsTokenRefresh()) {
                    console.log('🔄 토큰 갱신 필요, 갱신 중...');
                    await refreshAccessToken();
                    console.log('✅ 토큰 갱신 완료');
                    // 갱신된 토큰을 GAPI에 동기화
                    await syncTokenToGapi();
                }
            } catch (err) {
                console.error('❌ 자동 토큰 갱신 실패:', err);
                // 갱신 실패 시 로그아웃 처리
                setIsSignedIn(false);
                setError('세션이 만료되었습니다. 다시 로그인해주세요.');
            }
        };

        // 즉시 한 번 체크
        checkAndRefreshToken();

        // 주기적 체크 설정
        refreshIntervalRef.current = window.setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        };
    }, [isSignedIn, syncTokenToGapi]);

    // 로그인
    const signIn = useCallback(async () => {
        console.log('🔐 Sign in requested');

        if (!googleClientId) {
            setError('Google Client ID가 설정되지 않았습니다.');
            return;
        }

        try {
            setError(null);
            // PKCE OAuth 플로우 시작 (리다이렉트됨)
            await initiateOAuthFlow();
        } catch (err) {
            console.error('❌ Sign in failed:', err);
            setError(err instanceof Error ? err.message : '로그인 실패');
        }
    }, [googleClientId]);

    // 로그아웃
    const signOut = useCallback(async () => {
        console.log('🚪 Sign out requested');

        await oauthSignOut();
        setIsSignedIn(false);
        setError(null);
        console.log('✅ Signed out');
    }, []);

    // 유효한 Access Token 가져오기 (필요시 자동 갱신)
    const getValidAccessToken = useCallback(async (): Promise<string> => {
        return await ensureValidAccessToken();
    }, []);

    // 토큰이 유효한지 확인
    const isTokenValid = useCallback((): boolean => {
        const tokens = getStoredTokens();
        if (!tokens) return false;
        return Date.now() < tokens.expires_at;
    }, []);

    // 토큰 갱신
    const refreshToken = useCallback(async () => {
        console.log('🔄 Attempting to refresh token...');

        try {
            await refreshAccessToken();
            console.log('✅ Token refreshed');
        } catch (err) {
            console.error('❌ Token refresh failed:', err);
            setError('토큰 갱신 실패. 다시 로그인해주세요.');
            setIsSignedIn(false);
        }
    }, []);

    return {
        isSignedIn,
        isInitialized,
        isLoading,
        isGapiReady,
        error,
        signIn,
        signOut,
        refreshToken,
        isTokenValid,
        getValidAccessToken,
        clearError: () => setError(null)
    };
};
