# daGama

> Design from data, in code.

## Problem

The "blank canvas" problem:  
Users often have large, complex datasets but no clear starting point for visual exploration. Traditional tools require technical expertise to set up dashboards or charts.

## Goal

Build an LLM-assisted interface that helps users:

- Ingest a large dataset
- Understand the structure and content of the data
- Visualize relationships between fields
  - LLM prompt: "What are the most important relationships between fields?"
  - LLM returns a list of fields and their relationships
  - User can select a field and see a visualization of the relationship
- Automatically generate relevant UI components to explore it
- Iterate on the UI via natural language

## Demo Narrative

1. User drags and drops a real dataset (e.g., BayWheels trip data)
2. LLM analyzes the data schema and suggests visualizations
3. User selects a suggested chart
4. Chart renders live in the browser
5. User types a follow-up prompt to refine it (e.g., "Make this a heatmap")
6. LLM updates the chart configuration; UI updates dynamically

## Project Structure

### 1. Data Ingestion

- Implement file drag-and-drop zone (CSV and JSON support)
- Parse the file locally
- Infer schema: field names, data types, sample values
- Display schema summary in UI

### 2. LLM-Powered Visualization Suggestions

- Send schema + sample data to GPT-4
- Prompt LLM to suggest relevant visualizations
- Display 2–3 suggestions as options with descriptions

### 3. Initial UI Generation

- Upon user selection, LLM returns chart spec:
  - Chart type (e.g., bar, line, map)
  - Axis fields
  - Filters or groupings
  - Optional styling hints

### 4. Iterative Refinement via Natural Language

- Provide input box for user to modify the chart (e.g., "Color by user type")
- LLM interprets prompt and modifies chart config
- Live update of visualization
- Optional: display diff between chart configs

## Design Principles

- **Design from Data**: UI components are generated based on actual data, not assumptions
- **Human-in-the-Loop**: LLM acts as a co-designer, always awaiting user guidance
- **Transparency**: Expose the schema, LLM responses, and config structures
- **Pre-visualization**: Users can preview changes before applying them
- **User Agency**: Every component is traceable to user input or dataset structure

- Drop data
- Retrieve schema
- Semantic analysis of each property from schema (seeded with example values)

- Typography: hierarchy, font, size, weight, color
- Organization of info based on the semantic meaning (track start, track end)

- Visualize relationships between fields
  - Infer schema from LLM (backend)
    - then visualize as graph on frontend
- Visualize branching

- User interaction

  - Excluding fields, subset
  - Asking questions

  MCP (Spotify), or API

  - Retrieving metadata and visuals

---

- 1. Click to regenerate a chart
- 2. AI analysis should run immediately
- 3. Generate UI in the right

Polish:

- Skeleton loading state for backend calls
- Loading state before all
- Intro centered
