import { StateGraph, Annotation, START, END, interrupt, MemorySaver } from "@langchain/langgraph";
const StateAnnotation = Annotation.Root({
    input: (Annotation),
    userFeedback: (Annotation)
});
const step1 = (_state) => {
    console.log('--- Step 1 ---');
    return {};
};
const humanFeedback = (_state) => {
    console.log('--- Human Feedback ---');
    const feedback = interrupt("Please provide feedback");
    return {
        userFeedback: feedback
    };
};
const step3 = (_state) => {
    console.log('--- Step 3 ---');
    return {};
};
const builder = new StateGraph(StateAnnotation)
    .addNode("step1", step1)
    .addNode("humanFeedback", humanFeedback)
    .addNode("step3", step3)
    .addEdge(START, "step1")
    .addEdge("step1", "humanFeedback")
    .addEdge("humanFeedback", "step3")
    .addEdge("step3", END);
const memory = new MemorySaver();
const graph = builder.compile({
    checkpointer: memory
});
// Remove tslab visualization and replace with console output
console.log("Graph compiled successfully");
// Optionally, if you want to see the Mermaid diagram definition:
const drawableGraph = await graph.getGraphAsync();
console.log(await drawableGraph.drawMermaid());
