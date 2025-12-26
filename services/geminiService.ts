
import { GoogleGenAI } from '@google/genai';

// Model configuration
const PRIMARY_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Helper to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const TRANSCRIPTION_SYSTEM_INSTRUCTION = `당신은 전문 의료 녹취사입니다. 당신의 임무는 제공된 오디오 파일에서 들리는 말소리를 정확하게 텍스트로 옮기는 것입니다.

[전사 원칙]
1. 오디오에서 실제로 들리는 말만 정확하게 전사하십시오. 들리지 않는 내용을 추측하거나 상상해서 추가하지 마십시오.
2. 내용을 요약하거나 의역하지 말고, 말하는 그대로 전사하십시오.
3. 불명확하거나 잘 들리지 않는 부분은 [불명확]으로 표시하십시오.
4. 어떠한 설명, 해석, 주석도 추가하지 말고 오직 전사 텍스트만 출력하십시오.
5. 의학 용어는 정확한 표기로 작성하십시오.`;

export async function transcribeWithGemini(apiKey: string, audioBlob: Blob, previousContext?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await blobToBase64(audioBlob);

    let promptText = "진료 녹음 파일을 전사해 주세요.";

    if (previousContext) {
        promptText += `\n\n[이전 대화 문맥]\n${previousContext}\n\n위의 이전 문맥을 참고하여 대화가 자연스럽게 이어지도록 전사하세요.`;
    }

    const generateRequest = (model: string) => ({
        model,
        contents: {
            parts: [
                { inlineData: { mimeType: audioBlob.type, data: base64Data } },
                { text: promptText }
            ]
        },
        config: {
            systemInstruction: TRANSCRIPTION_SYSTEM_INSTRUCTION,
        }
    });

    try {
        const response = await ai.models.generateContent(generateRequest(PRIMARY_MODEL));
        return response.text?.trim() || "";
    } catch (primaryError) {
        console.warn(`PRIMARY_MODEL 실패, FALLBACK_MODEL로 재시도: ${(primaryError as Error).message}`);
        try {
            const fallbackResponse = await ai.models.generateContent(generateRequest(FALLBACK_MODEL));
            return fallbackResponse.text?.trim() || "";
        } catch (fallbackError) {
            throw new Error(`Gemini 음성 전사 실패 (PRIMARY & FALLBACK): ${(fallbackError as Error).message}`);
        }
    }
}


const VERIFICATION_SYSTEM_INSTRUCTION = `당신은 대한민국 한의원에서 사용하는 의료 기록 전문 검수 AI입니다. 당신의 임무는 제공된 진료 대화 전사문을 검토하고, 다음과 같은 규칙에 따라 수정하는 것입니다.

[수정 규칙]
1.  명백한 오탈자 및 문법 오류를 교정합니다.
2.  의학 용어 및 한의학 용어(예: 경혈명, 약재명, 병증명 등)가 잘못 사용되었거나 오기된 경우, 문맥에 가장 적합하고 정확한 용어로 수정합니다.
3.  대화의 원래 의미나 내용을 절대 변경하거나 추가하지 마십시오. 오직 교정 작업만 수행합니다.
4.  수정이 완료된 최종 전사문 텍스트'만'을 응답으로 출력해야 합니다. 어떠한 설명이나 인사말도 포함하지 마십시오.
`;

const getVerificationPrompt = (transcript: string): string => `
아래의 진료 대화 전사문을 검토하고 수정 규칙에 따라 교정해주세요.

[전사문 원본]
---
${transcript}
---
`;

export async function verifyAndCorrectTranscript(geminiApiKey: string | undefined, transcript: string): Promise<string> {
    if (!geminiApiKey) {
        throw new Error('Gemini API 키가 없습니다.');
    }
    // Return original transcript if it's empty or just whitespace
    if (!transcript.trim()) {
        return transcript;
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const generateRequest = (model: string) => ({
        model,
        contents: getVerificationPrompt(transcript),
        config: {
            systemInstruction: VERIFICATION_SYSTEM_INSTRUCTION,
        },
    });

    try {
        const response = await ai.models.generateContent(generateRequest(PRIMARY_MODEL));
        return response.text?.trim() || transcript;
    } catch (primaryError) {
        console.warn(`PRIMARY_MODEL 실패, FALLBACK_MODEL로 재시도: ${(primaryError as Error).message}`);
        try {
            const fallbackResponse = await ai.models.generateContent(generateRequest(FALLBACK_MODEL));
            return fallbackResponse.text?.trim() || transcript;
        } catch (fallbackError) {
            throw new Error(`Gemini 전사 내용 검수 실패 (PRIMARY & FALLBACK): ${(fallbackError as Error).message}`);
        }
    }
}


const SYSTEM_INSTRUCTION = `당신은 한의원 진료를 돕는 AI 어시스턴트입니다. 당신의 임무는 제공된 진료 기록(대화 전사문, 추가 메모 등)을 바탕으로 구조화된 SOAP 차트를 작성하는 것입니다.

──────────────────────────────
� 절대 금지 사항
──────────────────────────────
⛔ 전사 내용이나 추가 메모가 없거나 비어있는 경우:
   → SOAP 차트를 작성하지 마십시오.
   → 반드시 다음 메시지만 출력하십시오: "전사 내용이 없어 SOAP 차트 생성을 진행할 수 없습니다. 녹음 파일을 전사하거나 추가 메모를 입력해주세요."
⛔ 어떠한 상황에서도 가상의 환자, 증상, 치료 내용을 만들어내는 것은 절대 금지됩니다.
⛔ 제공된 자료 없이 SOAP 차트를 창작하면 의료 기록 위조에 해당합니다.

──────────────────────────────
�📋 작동 목표
──────────────────────
1️⃣  제공된 진료 기록을 한의과 SOAP 형식에 맞춰 정리합니다.
2️⃣  기록에 있는 내용만 사용해야 하며, 절대 내용을 지어내거나 추론하지 않습니다.
3️⃣  숫자, 경혈명, 용량, 횟수 등은 원문 그대로 유지합니다.
4️⃣  기록에서 특정 정보를 찾을 수 없는 경우, 해당 항목은 "미확인"으로 표시합니다.
5️⃣  차트 마지막에는 주치의가 검토하기 쉽도록 요약과 확인사항 체크리스트를 추가합니다. 체크리스트 3개 항목에 대해서는 대화 내용을 근거로 간결하게 답변해야 합니다. 만약 특정 항목(예: 주호소)이 '미확인'이라 답변 근거가 없다면, 해당 체크리스트 답변도 '미확인'으로 통일하여 기재합니다.
6️⃣  어떠한 인사말이나 서론 없이 바로 SOAP 차트 본문으로 시작합니다.

──────────────────
📋 출력 형식 규칙
──────────────────
- 제공된 SOAP 출력 형식을 엄격하게 준수합니다.
- 깔끔하고 간결한 언어를 사용합니다.
- 실수 가능성이 있는 중요한 수치는 굵은 글씨로 강조합니다(예: **5분**, **3장**).
- 환자명은 대화에서 유추하여 기입하고, 유추가 불가능하면 "미확인"으로 표시합니다.
`;

const formatKST = (d: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).format(d);


const getUserPrompt = (transcript: string, additionalNotes: string, consultationDate: Date): string => {
    let contentSection = '';
    let mainInstruction = '아래의 출력 형식과 제공된 내용을 바탕으로 SOAP 차트를 작성해 주세요.';

    if (transcript.trim() && additionalNotes.trim()) {
        mainInstruction = '아래의 출력 형식과, [진료 대화 내용] 및 [추가 메모]를 모두 종합하여 SOAP 차트를 작성해 주세요.';
    }

    if (transcript.trim()) {
        contentSection += `
---

[진료 대화 내용]
${transcript}
`;
    }

    if (additionalNotes.trim()) {
        contentSection += `
---

[추가 메모]
${additionalNotes}
`;
    }

    return `
${mainInstruction}

[출력 형식]
환자명:
진료일시: ${formatKST(consultationDate)}
요약: (진료내용을 50자 내외 요약)

S (주관적)
- 주호소:
- 현병력:
- 악화·완화 요인:
- 관련 증상:
- 기타:

O (객관적)
- 시진:
- 촉진/압통:
- ROM/기능검사:
- 특수검사:
- 활력징후:
- 기타:

A (평가)
- 진단명:
- 의증:

P (계획)
- 시술:
- 치료 빈도/기간:
- 한약:
- 예후:
- 주의사항/금기:
- 생활지도/재활:
- 추적계획:

확인사항 (체크리스트)
1. 주소증에 대해서 정확하게 진찰했는가?
2. 예후 및 주의사항이 누락되지 않았는가?
3. 치료계획이 환자에게 충분히 설명되었는가?
${contentSection}
`;
};


export async function generateSoapChart(geminiApiKey: string | undefined, transcript: string, additionalNotes: string, consultationDate: Date): Promise<string> {
    if (!geminiApiKey) {
        throw new Error('Gemini API 키가 없습니다.');
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const generateRequest = (model: string) => ({
            model,
            contents: getUserPrompt(transcript, additionalNotes, consultationDate),
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            },
        });

        try {
            const response = await ai.models.generateContent(generateRequest(PRIMARY_MODEL));
            return response.text ?? '';
        } catch (primaryError) {
            console.warn(`PRIMARY_MODEL 실패, FALLBACK_MODEL로 재시도: ${(primaryError as Error).message}`);
            const fallbackResponse = await ai.models.generateContent(generateRequest(FALLBACK_MODEL));
            return fallbackResponse.text ?? '';
        }
    } catch (e) {
        throw new Error(`Gemini 생성 실패 (PRIMARY & FALLBACK): ${(e as Error).message}`);
    }
}
