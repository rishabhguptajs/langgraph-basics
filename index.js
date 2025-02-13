import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import readlineSync from 'readline-sync';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey: GEMINI_API_KEY,
    maxOutputTokens: 8000,
    streaming: true
});

const userInput = readlineSync.question('You: ');

const response = await model.invoke([
    { role: "human", content: userInput }
]);

console.log(response.content);