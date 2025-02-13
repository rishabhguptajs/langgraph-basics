import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import readlineSync from 'readline-sync';

dotenv.config();

const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0
}).bindTools(tools);

const shouldContinue = ({ messages }) => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.tool_calls?.length) {
        return "tools";
    }

    return "__end__";
}

async function callModel(state) {
    const response = await model.invoke(state.messages);

    return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent")
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue);

const app = workflow.compile();

const userInput = readlineSync.question('>> ');

const agentFinalState = await app.invoke({
    messages: [new HumanMessage(userInput)]
});

const messages = agentFinalState.messages;
const lastMessage = messages[messages.length - 1];

console.log(lastMessage.content);

const nextState = await app.invoke({
    messages: [...agentFinalState.messages, new HumanMessage("What about sf")]
});

console.log(nextState.messages[nextState.messages.length - 1].content);