import { z } from "zod";
import { tool } from "@langchain/core/tools";
import dotenv from 'dotenv';
import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import readlineSync from 'readline-sync';

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY
})

const addTool = tool(
    async ({ a, b }) => {
        return a + b;
    },
    {
        name: "add",
        schema: z.object({
            a: z.number(),
            b: z.number()
        }),
        description: "adds a and b"
    }
)

const multiplyTool = tool(
    async ({ a, b }) => {
        return a * b;
    },
    {
        name: "multiply",
        schema: z.object({
            a: z.number(),
            b: z.number()
        }),
        description: "multiplies a and b"
    }
)

const subtractTool = tool(
    async ({ a, b }) => {
        return a - b;
    },
    {
        name: "subtract",
        schema: z.object({
            a: z.number(),
            b: z.number()
        }),
        description: "subtracts b from a"
    }
)

const divideTool = tool(
    async ({ a, b }) => {
        return a / b;
    },
    {
        name: "divide",
        schema: z.object({
            a: z.number(),
            b: z.number()
        }),
        description: "divides a by b"
    }
)

const tools = [addTool, multiplyTool, subtractTool, divideTool];

const llmWithTools = llm.bindTools(tools);

const userInput = readlineSync.question('>> ');

const toolsByName = {
    add: addTool,
    multiply: multiplyTool,
    subtract: subtractTool,
    divide: divideTool
}


const messages = [new HumanMessage(`${userInput}`)];

const aiMessage = await llmWithTools.invoke(messages);

messages.push(aiMessage);

for (const toolCall of aiMessage.tool_calls){
    const selected_tool = toolsByName[toolCall.name];
    const toolMessage = await selected_tool.invoke(toolCall);
    messages.push(toolMessage);
}

console.log(messages);

// messages.push(aiMessage);