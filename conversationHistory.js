import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const model = new ChatGoogleGenerativeAI({ apiKey: GEMINI_API_KEY, temperature: 0, model: "gemini-1.5-flash", });

const AgentState = Annotation.Root({
    messages: Annotation({
      reducer: (x, y) => x.concat(y),
    }),
});

const memory = new MemorySaver();

const searchTool = tool((_) => {
    return "It's sunny in San Francisco, but you better look out if you're a Gemini 😈."
}, {
    name: "search",
    description: "Call to surf the web.",
    schema: z.object({
        query: z.string()
    })
})


const tools = [searchTool]
const toolNode = new ToolNode(tools)

const boundModel = model.bindTools(tools);

function shouldContinue(state){
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && !(lastMessage).tool_calls?.length) {
        return END;
    }
    return "action";
}

async function callModel(state) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("action", toolNode)
    .addConditionalEdges(
        "agent",
        shouldContinue
    )
    .addEdge("action", "agent")
    .addEdge(START, "agent");

const app = workflow.compile({
    checkpointer: memory,
});

const config = { configurable: { thread_id: "2"}, streamMode: "values" }

const inputMessage = new HumanMessage("hi! I'm bob");
for await (const event of await app.stream({
    messages: [inputMessage]
}, config)) {
    const recentMsg = event.messages[event.messages.length - 1];
    console.log(`================================ ${recentMsg._getType()} Message (1) =================================`)
    console.log(recentMsg.content);
}

console.log("\n\n================================= END =================================\n\n")

const inputMessage2 = new HumanMessage("what's my name?");
for await (const event of await app.stream({
    messages: [inputMessage2]
}, config)) {
    const recentMsg = event.messages[event.messages.length - 1];
    console.log(`================================ ${recentMsg._getType()} Message (2) =================================`)
    console.log(recentMsg.content);
}