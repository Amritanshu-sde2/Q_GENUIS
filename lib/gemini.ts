import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

const apiKey = process.env.API_KEY || ''; // Ensure this is set in environment

// Retry helper for transient network errors
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(res => setTimeout(res, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

export const generateQuestionsFromPrompt = async (prompt: string, count: number, subject: string): Promise<Question[]> => {
  if (!apiKey) {
    console.warn("Gemini API Key missing. Returning mock data.");
    return mockQuestions(count);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are an academic expert. Generate ${count} questions for the subject "${subject}".
  The output must be a valid JSON array of objects. 
  Each object should have:
  - id: string (unique)
  - text: string (the question)
  - type: "MCQ" or "SUBJECTIVE"
  - options: array of strings (only for MCQ)
  - correctAnswer: string
  - marks: number
  - difficulty: "EASY", "MEDIUM", or "HARD"
  
  Do not include markdown formatting like \`\`\`json. Return raw JSON only.`;

  try {
    // Wrapped in retry to handle potential "RPC failed due to xhr error"
    const response = await retry(async () => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: { parts: [{ text: systemInstruction }] },
                responseMimeType: "application/json"
            }
        });
    });

    const text = response.text;
    if (!text) return mockQuestions(count);
    
    let questions: Question[] = [];
    try {
        questions = JSON.parse(text) as Question[];
    } catch (parseError) {
        console.error("JSON Parse Error", parseError);
        // Fallback: try to strip markdown block if AI added it despite instructions
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        questions = JSON.parse(cleanText) as Question[];
    }

    // Ensure IDs are unique
    return questions.map((q, idx) => ({ ...q, id: `gen-${Date.now()}-${idx}` }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback to mock data on failure so app doesn't crash
    return mockQuestions(count);
  }
};

export const generateQuestionsFromCurriculum = async (curriculumText: string): Promise<Question[]> => {
    // Similar to prompt, but uses the extracted text as context
    const snippet = curriculumText.substring(0, 10000); // Limit context window
    return generateQuestionsFromPrompt(`Based on this curriculum content: ${snippet}... Generate 5 diverse questions.`, 5, "General");
}

export const parseQuestionsFromRawText = async (rawText: string): Promise<Question[]> => {
  if (!apiKey) return mockQuestions(3);

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are an assistant that extracts questions from raw OCR text. 
  Identify individual questions, their types, and options if available.
  Clean up any OCR errors or formatting issues.
  Return a valid JSON array of Question objects.
  Assign reasonable default values for marks (e.g., 1 for MCQ, 5 for Subjective) and difficulty (MEDIUM) if not explicit.
  
  Structure:
  [{
    "id": "generated-id",
    "text": "Question Text",
    "type": "MCQ" | "SUBJECTIVE",
    "options": ["A", "B"] (optional),
    "correctAnswer": "A" (optional),
    "marks": number,
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }]`;

  try {
    const response = await retry(async () => {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: `Extract questions from this text:\n\n${rawText.substring(0, 10000)}` }] }],
            config: {
                systemInstruction: { parts: [{ text: systemInstruction }] },
                responseMimeType: "application/json"
            }
        });
    });

    const text = response.text;
    if (!text) return [];
    
    let questions: Question[] = [];
    try {
        questions = JSON.parse(text) as Question[];
    } catch {
         const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
         questions = JSON.parse(cleanText) as Question[];
    }

    return questions.map((q, idx) => ({ ...q, id: `ocr-${Date.now()}-${idx}` }));
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return [];
  }
};

const mockQuestions = (count: number): Question[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `mock-${i}`,
    text: `Sample AI Generated Question ${i + 1} about the topic (Fallback)?`,
    type: i % 2 === 0 ? 'MCQ' : 'SUBJECTIVE',
    options: i % 2 === 0 ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
    correctAnswer: 'Option A',
    marks: i % 2 === 0 ? 1 : 5,
    difficulty: i % 3 === 0 ? 'EASY' : i % 3 === 1 ? 'MEDIUM' : 'HARD'
  }));
};