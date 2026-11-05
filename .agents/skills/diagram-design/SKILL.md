---
name: diagram-design
description: >-
  Rapidly produces clear, readable technical architecture diagrams, FSM state charts,
  entity-relationship models, and sequence workflows in valid Mermaid syntax.
---

# Diagram Design Skill

Generates production-grade technical diagrams for HelpDesk Hub documentation.

## Supported Diagram Types
- State Diagrams (`stateDiagram-v2`): Ticket FSM transitions.
- Sequence Diagrams (`sequenceDiagram`): WebSocket real-time push events and REST request-response cycles.
- Entity-Relationship Diagrams (`erDiagram`): MongoDB collections, foreign references, and compound indexes.
- Flowcharts (`flowchart TD` / `flowchart LR`): SLA business-hours calculation logic and paused clock mechanisms.

## Best Practices
- Always quote labels with special characters: `id["Status (New)"]`.
- Avoid raw HTML inside node definitions.
- Keep flowcharts modular and readable.
