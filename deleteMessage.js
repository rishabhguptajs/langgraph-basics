import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { RemoveMessage } from "@langchain/core/messages";
import { z } from "zod";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const model = new ChatGoogleGenerativeAI({ apiKey: GEMINI_API_KEY, temperature: 0, model: "gemini-1.5-flash", });

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

function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
        "tool_calls" in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length
    ) {
        return "action";
    }
    return END;
}

async function callModel(state) {
    const response = await boundModel.invoke(state.messages);
    return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("action", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges(
        "agent",
        shouldContinue
    )
    .addEdge("action", "agent");

const app = workflow.compile({ checkpointer: memory });

const config = { configurable: { thread_id: "2" }, streamMode: "values" };
const inputMessage = new HumanMessage({
    id: uuidv4(),
    content: "hi! I'm bob",
});

for await (const event of await app.stream(
    { messages: [inputMessage] },
    config,
)) {
    const lastMsg = event.messages[event.messages.length - 1];
    console.dir(
        {
            type: lastMsg._getType(),
            content: lastMsg.content,
            tool_calls: lastMsg.tool_calls,
        },
        { depth: null }
    )
}

const inputMessage2 = new HumanMessage({
    id: uuidv4(),
    content: "What's my name?",
});
for await (const event of await app.stream(
    { messages: [inputMessage2] },
    config,
)) {
    const lastMsg = event.messages[event.messages.length - 1];
    console.dir(
        {
            type: lastMsg._getType(),
            content: lastMsg.content,
            tool_calls: lastMsg.tool_calls,
        },
        { depth: null }
    )
}

const messages = (await app.getState(config)).values.messages;
console.dir(
  messages.map((msg) => ({
    id: msg.id,
    type: msg._getType(),
    content: msg.content,
    tool_calls:
    msg.tool_calls,
  })),
  { depth: null }
);

await app.updateState(config, { messages: new RemoveMessage({ id: messages[0].id }) })

const updatedMessages = (await app.getState(config)).values.messages;
console.dir(
  updatedMessages.map((msg) => ({
    id: msg.id,
    type: msg._getType(),
    content: msg.content,
    tool_calls:
    msg.tool_calls,
  })),
  { depth: null }
);