import {
    StateGraph,
    Annotation,
    START,
    END,
    interrupt,
    MemorySaver,
} from "@langchain/langgraph"
import fs from 'fs';
import * as tslab from "tslab"

const StateAnnotation = Annotation.Root({
    input: Annotation,
    userFeedback: Annotation,
})

const step1 = (_state) => {
    console.log("--- Step 1 ---")
    return {}
}

const humanFeedback = (_state) => {
    console.log("--- Human Feedback ---")
    const feedback = interrupt("Please provide feedback")
    return {
        userFeedback: feedback,
    }
}

const step3 = (_state) => {
    console.log("--- Step 3 ---")
    return {}
}

const builder = new StateGraph(StateAnnotation)
    .addNode("step1", step1)
    .addNode("humanFeedback", humanFeedback)
    .addNode("step3", step3)
    .addEdge(START, "step1")
    .addEdge("step1", "humanFeedback")
    .addEdge("humanFeedback", "step3")
    .addEdge("step3", END)

const memory = new MemorySaver()

const graph = builder.compile({
    checkpointer: memory,
})

console.log("Graph compiled successfully")

const drawableGraph = await graph.getGraphAsync()

const image = await drawableGraph.drawMermaidPng().then((image) => image.arrayBuffer())

// Ensure the image is saved correctly
fs.writeFileSync("graph.png", Buffer.from(image))
