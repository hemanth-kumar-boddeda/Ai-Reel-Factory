# Graph Report - ai-reel-factory-working  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 463 nodes · 827 edges · 31 communities (26 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- framer-motion
- ReelService
- app/main.py
- ReelService
- frontend_hardening_backup_20260918_001830/src/App.jsx
- frontend_backup_20260917_235340/src/App.jsx
- backup_checkpoint_phase2_1/frontend/src/components/reel/Reel3D.jsx
- dependencies
- dependencies
- backup_checkpoint_phase2_1/frontend/src/main.jsx
- frontend_hardening_backup_20260918_001830/package.json
- frontend/package.json
- frontend_backup_20260917_235340/package.json
- backup_checkpoint_phase2_1/frontend/package.json
- dependencies
- dependencies
- backup_checkpoint_phase2_1/frontend/.oxlintrc.json
- vite
- frontend_backup_20260917_235340/.oxlintrc.json
- devDependencies
- frontend_hardening_backup_20260918_001830/.oxlintrc.json
- frontend/.oxlintrc.json
- devDependencies
- scripts
- scripts
- scripts
- scripts
- TODO: Fetch metrics from API and update the metric cards
- get
- post

## God Nodes (most connected - your core abstractions)
1. `ReelService` - 37 edges
2. `framer-motion` - 25 edges
3. `react` - 24 edges
4. `ReelService` - 19 edges
5. `ReelItem` - 18 edges
6. `ReelRepository` - 18 edges
7. `ReelItem` - 16 edges
8. `ReelRepository` - 15 edges
9. `react-router-dom` - 15 edges
10. `ReelStatus` - 11 edges

## Surprising Connections (you probably didn't know these)
- `get_reel_service()` --uses--> `ReelService`  [INFERRED]
  app/main.py → backup_checkpoint_phase2_1/app/services/reel.py
- `create_reel()` --uses--> `ReelItemCreate`  [INFERRED]
  app/main.py → backup_checkpoint_phase2_1/app/schemas/reel.py
- `update_reel()` --uses--> `ReelItemUpdate`  [INFERRED]
  app/main.py → backup_checkpoint_phase2_1/app/schemas/reel.py
- `create_reel()` --uses--> `ReelService`  [INFERRED]
  app/main.py → backup_checkpoint_phase2_1/app/services/reel.py
- `get_reel()` --uses--> `ReelService`  [INFERRED]
  app/main.py → backup_checkpoint_phase2_1/app/services/reel.py

## Import Cycles
- None detected.

## Communities (31 total, 5 thin omitted)

### Community 0 - "framer-motion"
Cohesion: 0.06
Nodes (26): ErrorBoundary, ReelCard(), useReel(), Analytics(), Calendar(), CreateReel(), Editor(), Home() (+18 more)

### Community 1 - "ReelService"
Cohesion: 0.06
Nodes (37): create_reel(), get_reel(), get_reels(), get_stats(), get_video(), home(), get, post (+29 more)

### Community 2 - "app/main.py"
Cohesion: 0.12
Nodes (32): Config, Settings, get_reel_service(), Session, Config, Settings, get_reel_service(), Session (+24 more)

### Community 3 - "ReelService"
Cohesion: 0.08
Nodes (18): ReelItem, ReelStatus, Session, ReelRepository, ReelItem, ReelItemBase, ReelItemCreate, ReelItemInDB (+10 more)

### Community 4 - "frontend_hardening_backup_20260918_001830/src/App.jsx"
Cohesion: 0.09
Nodes (14): App(), ErrorBoundary, ReelCard(), useReel(), frontend_hardening_backup_20260918_001830_src_index, rootEl, Analytics(), Calendar() (+6 more)

### Community 5 - "frontend_backup_20260917_235340/src/App.jsx"
Cohesion: 0.13
Nodes (13): App(), ReelCard(), useReel(), frontend_backup_20260917_235340_src_index, rootEl, Analytics(), Calendar(), CreateReel() (+5 more)

### Community 6 - "backup_checkpoint_phase2_1/frontend/src/components/reel/Reel3D.jsx"
Cohesion: 0.12
Nodes (11): PIPELINE_STAGES, PipelineNode, ReelMesh, PIPELINE_STAGES, PIPELINE_STAGES, PIPELINE_STAGES, PipelineNode, ReelMesh (+3 more)

### Community 7 - "dependencies"
Cohesion: 0.12
Nodes (15): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+7 more)

### Community 8 - "dependencies"
Cohesion: 0.12
Nodes (15): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+7 more)

### Community 9 - "backup_checkpoint_phase2_1/frontend/src/main.jsx"
Cohesion: 0.15
Nodes (10): App(), backup_checkpoint_phase2_1_frontend_src_index, rootEl, App(), frontend_src_index, rootEl, ref_app_jsx, ref_index_css (+2 more)

### Community 10 - "frontend_hardening_backup_20260918_001830/package.json"
Cohesion: 0.18
Nodes (10): axios, react, three, vite, name, private, type, version (+2 more)

### Community 11 - "frontend/package.json"
Cohesion: 0.18
Nodes (10): axios, react, react-router-dom, three, vite, @vitejs/plugin-react, name, private (+2 more)

### Community 12 - "frontend_backup_20260917_235340/package.json"
Cohesion: 0.20
Nodes (9): axios, react, three, vite, name, private, type, version (+1 more)

### Community 13 - "backup_checkpoint_phase2_1/frontend/package.json"
Cohesion: 0.22
Nodes (8): name, private, type, version, oxlint, react-dom, @types/react, @types/react-dom

### Community 14 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+1 more)

### Community 15 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, axios, framer-motion, react, react-dom, react-router-dom, @react-three/drei, @react-three/fiber (+1 more)

### Community 16 - "backup_checkpoint_phase2_1/frontend/.oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 18 - "frontend_backup_20260917_235340/.oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 19 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 20 - "frontend_hardening_backup_20260918_001830/.oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 21 - "frontend/.oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 22 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 23 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 24 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 25 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 26 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

## Knowledge Gaps
- **127 isolated node(s):** `Config`, `Config`, `name`, `private`, `type` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 177 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `framer-motion` to `frontend_backup_20260917_235340/src/App.jsx`, `frontend_hardening_backup_20260918_001830/src/App.jsx`, `backup_checkpoint_phase2_1/frontend/package.json`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `react` connect `framer-motion` to `frontend_backup_20260917_235340/src/App.jsx`, `frontend_hardening_backup_20260918_001830/src/App.jsx`, `backup_checkpoint_phase2_1/frontend/package.json`, `backup_checkpoint_phase2_1/frontend/src/components/reel/Reel3D.jsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `framer-motion` connect `framer-motion` to `frontend_hardening_backup_20260918_001830/src/App.jsx`, `backup_checkpoint_phase2_1/frontend/package.json`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `ReelService` (e.g. with `create_reel()` and `get_reel()`) actually correct?**
  _`ReelService` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `ReelService` (e.g. with `ReelItem` and `ReelStatus`) actually correct?**
  _`ReelService` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ReelItem` (e.g. with `ReelRepository` and `ReelService`) actually correct?**
  _`ReelItem` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Config`, `Config`, `name` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._