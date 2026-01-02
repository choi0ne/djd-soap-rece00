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

// 토큰 자동 갱신 주기 (5분)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;

export const useGoogleAuth = (googleClientId: string | null, _googleApiKey: string | null) => {
    const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const refreshIntervalRef = useRef<number | null>(null);

    // 초기화 및 OAuth callback 처리
    useEffect(() => {
        const initialize = async () => {
            try {
                // URL에 code 파라미터가 있으면 OAuth callback 처리
                const wasCallback = await handleOAuthCallback();

                if (wasCallback) {
                    console.log('✅ OAuth callback 처리 완료');
                }

                // 인증 상태 확인
                const authenticated = checkIsAuthenticated();
                setIsSignedIn(authenticated);
                setIsInitialized(true);

                if (authenticated) {
                    console.log('✅ 기존 세션 복원됨');
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
    }, []);

    // 토큰 자동 갱신 타이머
    useEffect(() => {
        if (!isSignedIn) {
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
                }
            } catch (err) {
                console.error('❌ 자동 토큰 갱신 실패:', err);
                setIsSignedIn(false);
                setError('세션이 만료되었습니다. 다시 로그인해주세요.');
            }
        };

        checkAndRefreshToken();
        refreshIntervalRef.current = window.setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        };
    }, [isSignedIn]);

    // 로그인
    const signIn = useCallback(async () => {
        console.log('🔐 Sign in requested');

        if (!googleClientId) {
            setError('Google Client ID가 설정되지 않았습니다.');
            return;
        }

        try {
            setError(null);
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

    // 유효한 Access Token 가져오기
    const getValidAccessToken = useCallback(async (): Promise<string> => {
        return await ensureValidAccessToken();
    }, []);

    // 토큰이 유효한지 확인
    const isTokenValid = useCallback((): boolean => {
        const tokens = getStoredTokens();
        if (!tokens) return false;
        return Date.now() < tokens.expires_at;
    }, []);

    return {
        isSignedIn,
        isInitialized,
        isLoading,
        error,
        signIn,
        signOut,
        isTokenValid,
        getValidAccessToken,
        clearError: () => setError(null)
    };
};

export default useGoogleAuth;
