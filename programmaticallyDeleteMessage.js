import { RemoveMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const model = new ChatGoogleGenerativeAI({ apiKey: GEMINI_API_KEY, temperature: 0, model: "gemini-1.5-flash", });

function deleteMessages(state) {
  const messages = state.messages;
  if (messages.length > 3) {
    return { messages: messages.slice(0, -3).map(m => new RemoveMessage({ id: m.id })) };
  }
  return {};
}

function shouldContinue2(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length
  ) {
    return "action";
  }
  return "delete_messages";
}

const memory = new MemorySaver();

const search = tool((_) => {
    return [
        "It's sunny in San Francisco, but you better look out if you're a Gemini 😈.",
    ];
}, {
    name: "search",
    description: "Call to surf the web.",
    schema: z.object({
        query: z.string(),
    })
});

const tools = [search];
const toolNode = new ToolNode(tools);

const boundModel = model.bindTools(tools);

async function callModel(state) {
    const response = await boundModel.invoke(state.messages);
    return { messages: [response] };
}

const workflow2 = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("action", toolNode)
  .addNode("delete_messages", deleteMessages)
  .addEdge(START, "agent")
  .addConditionalEdges(
    "agent",
    shouldContinue2
  )
  .addEdge("action", "agent")
  .addEdge("delete_messages", END);

const app2 = workflow2.compile({ checkpointer: memory });

const config2 = { configurable: { thread_id: "3" }, streamMode: "values" };

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("action", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges(
    "agent",
    shouldContinue2
  )
  .addEdge("action", "agent");
  
const app = workflow.compile({ checkpointer: memory });


const inputMessage3 = new HumanMessage({
  id: uuidv4(),
  content: "hi! I'm bob",
});

console.log("--- FIRST ITERATION ---\n");
for await (const event of await app2.stream(
  { messages: [inputMessage3] },
  config2
)) {
  console.log(event.messages.map((message) => [message._getType(), message.content]));
}

const inputMessage4 = new HumanMessage({
  id: uuidv4(),
  content: "what's my name?",
});

console.log("\n\n--- SECOND ITERATION ---\n");
for await (const event of await app2.stream(
  { messages: [inputMessage4] },
  config2
)) {
  console.log(event.messages.map((message) => [message._getType(), message.content]), "\n");
}

const messages3 = (await app.getState(config2)).values["messages"]
console.dir(
  messages3.map((msg) => ({
    id: msg.id,
    type: msg._getType(),
    content: msg.content,
    tool_calls:
    msg.tool_calls,
  })),
  { depth: null }
);