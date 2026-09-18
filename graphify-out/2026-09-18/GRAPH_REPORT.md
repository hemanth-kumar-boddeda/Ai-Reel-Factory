# Graph Report - ai-reel-factory-working  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 327 nodes · 521 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.94)
- Token cost: 27,347 input · 2,277 output

## Community Hubs (Navigation)
- Reel Data Access
- Reel Service Layer
- Error Boundary Component
- Error Boundary Component
- Main Frontend App
- Reel 3D and Dashboard
- Dependencies List
- Frontend Backup Package
- Hardening Backup Package
- Frontend Package.json
- Dependencies List
- Dependencies List
- OXLint Configuration
- Dev Dependencies
- Hardening Backup OXLint
- Dev Dependencies
- Frontend OXLint Config
- NPM Scripts
- Vite Configuration
- NPM Scripts
- Configuration Classes
- Main Metrics Update

## God Nodes (most connected - your core abstractions)
1. `ReelService` - 27 edges
2. `ReelItem` - 19 edges
3. `ReelRepository` - 17 edges
4. `ReelStatus` - 12 edges
5. `ReelItemUpdate` - 10 edges
6. `ReelItemCreate` - 9 edges
7. `ErrorBoundary` - 6 edges
8. `ErrorBoundary` - 6 edges
9. `ReelItemInDBBase` - 5 edges
10. `useReel()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ReelRepository` --uses--> `ReelStatus`  [INFERRED]
  app/repositories/reel.py → app/models/reel.py
- `ReelService` --uses--> `ReelStatus`  [INFERRED]
  app/services/reel.py → app/models/reel.py
- `ReelRepository` --uses--> `ReelItemCreate`  [INFERRED]
  app/repositories/reel.py → app/schemas/reel.py
- `ReelService` --uses--> `ReelItemCreate`  [INFERRED]
  app/services/reel.py → app/schemas/reel.py
- `ReelRepository` --uses--> `ReelItemUpdate`  [INFERRED]
  app/repositories/reel.py → app/schemas/reel.py

## Import Cycles
- None detected.

## Communities (22 total, 2 thin omitted)

### Community 0 - "Reel Data Access"
Cohesion: 0.09
Nodes (41): get_db(), get_reel(), get_reels(), get_stats(), get_video(), home(), Serve the generated video for a reel., Get a single reel by ID. (+33 more)

### Community 1 - "Reel Service Layer"
Cohesion: 0.09
Nodes (13): get_reel_service(), Session, Trigger the pipeline to process a new reel., trigger_pipeline(), ReelItem, Session, ReelRepository, Session (+5 more)

### Community 2 - "Error Boundary Component"
Cohesion: 0.10
Nodes (16): App(), ErrorBoundary, ReelCard(), useReel(), frontend_hardening_backup_20260918_001830_src_index, rootEl, Analytics(), Calendar() (+8 more)

### Community 3 - "Error Boundary Component"
Cohesion: 0.09
Nodes (14): App(), ErrorBoundary, ReelCard(), useReel(), frontend_src_index, rootEl, Analytics(), Calendar() (+6 more)

### Community 4 - "Main Frontend App"
Cohesion: 0.10
Nodes (18): App(), ReelCard(), useReel(), frontend_backup_20260917_235340_src_index, rootEl, Analytics(), Calendar(), CreateReel() (+10 more)

### Community 5 - "Reel 3D and Dashboard"
Cohesion: 0.11
Nodes (9): PIPELINE_STAGES, PIPELINE_STAGES, PIPELINE_STAGES, PipelineNode, ReelMesh, ref_react, ref_react_three_drei, ref_react_three_fiber (+1 more)

### Community 6 - "Dependencies List"
Cohesion: 0.09
Nodes (20): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+12 more)

### Community 7 - "Frontend Backup Package"
Cohesion: 0.17
Nodes (11): axios, react, three, vite, name, private, type, version (+3 more)

### Community 8 - "Hardening Backup Package"
Cohesion: 0.17
Nodes (11): axios, react, three, vite, name, private, type, version (+3 more)

### Community 9 - "Frontend Package.json"
Cohesion: 0.17
Nodes (11): axios, react, @react-three/fiber, three, @types/react-dom, vite, @vitejs/plugin-react, name (+3 more)

### Community 10 - "Dependencies List"
Cohesion: 0.22
Nodes (9): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+1 more)

### Community 11 - "Dependencies List"
Cohesion: 0.22
Nodes (9): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+1 more)

### Community 12 - "OXLint Configuration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "Dev Dependencies"
Cohesion: 0.33
Nodes (6): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 14 - "Hardening Backup OXLint"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 15 - "Dev Dependencies"
Cohesion: 0.33
Nodes (6): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 16 - "Frontend OXLint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 17 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 19 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 20 - "Configuration Classes"
Cohesion: 0.67
Nodes (3): Config, Settings, BaseSettings

## Knowledge Gaps
- **97 isolated node(s):** `Config`, `axios`, `framer-motion`, `react`, `react-dom` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 145 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ReelService` connect `Reel Service Layer` to `Reel Data Access`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencies List` to `Frontend Backup Package`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencies List` to `Hardening Backup Package`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `ReelService` (e.g. with `get_reel()` and `get_reels()`) actually correct?**
  _`ReelService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ReelItem` (e.g. with `ReelRepository` and `ReelService`) actually correct?**
  _`ReelItem` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `ReelRepository` (e.g. with `ReelItem` and `ReelStatus`) actually correct?**
  _`ReelRepository` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Config`, `axios`, `framer-motion` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._