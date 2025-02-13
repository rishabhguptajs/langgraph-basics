import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import dotenv from 'dotenv';
import readlineSync from 'readline-sync';
import { HumanMessage } from '@langchain/core/messages';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const agentTools = [new TavilySearchResults({ maxResults: 3 })];
const agentModel = new ChatGoogleGenerativeAI({ apiKey: GEMINI_API_KEY, temperature: 0 });

const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: agentCheckpointer
})

const userInput = readlineSync.question('>> ');

const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage(userInput)] },
    { configurable: { thread_id: "42" } }
)

console.log(agentFinalState.messages[agentFinalState.messages.length - 1].content);


// const stream = await model.stream([
//     { role: "human", content: userInput }
// ]);

// for await (const chunk of stream) {
//     process.stdout.write(chunk.content);
// }

// process.stdout.write('\n');