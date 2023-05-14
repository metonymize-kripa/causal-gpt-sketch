function getPaper() {
  const paperId = document.getElementById("paper-id").value;
  fetch(`https://export.arxiv.org/api/query?id_list=${paperId}`)
    .then(response => response.text())
    .then(data => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      const abstract = xmlDoc.getElementsByTagName("summary")[0].childNodes[0].nodeValue;
      document.getElementById("paper-abstract").innerHTML = abstract;
      processAbstract(abstract);
    })
    .catch(error => console.error(error));
}

async function useOpenaiToConvertTextToGraph(text) {
  const OPENAI_API_KEY = document.getElementById("openai-api-key").value
  const prePrompt = `Identify causal variables and relationships in the text. 
  Restrict this causal network to only 5 most important node variables.
  Convert variable names that have spaces and special characters to camelcase.
  The causal network should be returned in JSON format, with the following structure: 
  {"nodes": "a string of camecase node names, separated by commas",
"edges": "a string of edges separated by commas, where each edge is a pair of camelcase node names separated by ->"}
  EXAMPLE:
  { "nodes": "nodeA,nodeB,nodeC,..."], 
  "edges": "nodeA->nodeB,nodeA->nodeC,..."}

  Do not include any natural language, only JSON. 
  Restrict the graph to the 5 most important nodes where data is likely to be available.
  Remove edges where a dependent variable precedes an independent variable.
  Check nodes and edges for common sense reasoning, eliminating those that are unreasonable.
	   
	Answer: The formal network for the text description: `;

  const postPrompt = ` is:
     { "nodes": "..."
     "edges": "..." }`;
  const prompt = prePrompt + text + postPrompt;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENAI_API_KEY
    },
    body: JSON.stringify({
    "model": "gpt-3.5-turbo",
    messages: [{role: "user", content: prompt}],
	})});

  const data = await response.json();
  const graphJsonString = data.choices[0].message["content"];
  console.log("GRAPH JSON STRING:",graphJsonString);
  const graphJsonObject = JSON.parse(graphJsonString);
  return graphJsonObject;
}

async function processAbstract(abstract) {
  // Custom function to process the abstract and return nodes and edges
  // Here's an example implementation that extracts keywords and creates nodes and edges based on them
  const keywords = abstract.split(" ").filter(word => word.length > 5);
  graphJsonObject = await useOpenaiToConvertTextToGraph(abstract);
  const nodes = graphJsonObject["nodes"] 
  const edges = graphJsonObject["edges"]
  document.getElementById("nodes").value = nodes;
  document.getElementById("edges").value = edges;
}

function visualizeGraph() {
  const nodes = document.getElementById("nodes").value.split(",");
  const edges = document.getElementById("edges").value.split(",");
  const container = document.getElementById("graph-container");
  const data = {
    nodes: nodes.map(node => ({ id: node, label: node })),
    edges: edges.map(edge => {
      const [from, to] = edge.split("->");
      return { from, to, arrows: { to: { enabled: true } } };
    })
  };
  const options = {};
  new vis.Network(container, data, options);
}
