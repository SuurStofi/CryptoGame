# Search Game System

Scope
- Drone-based search mini-mode implemented under `res://SearchGame/`
- Main scene: `res://SearchGame/search_game.tscn`
- Primary controller: `res://SearchGame/drones.gd`
- Utility scripts: `res://SearchGame/Backtocafe.gd`, `res://SearchGame/zone_1.gd`, `res://SearchGame/zone_3.gd`

Goals
- Provide a timed exploration phase separate from the platforming gameplay
- Present a clean on-screen timer UI on top of all content
- Allow returning to the hub/menu via a back button

Key script: drones.gd
- Exports
  - `search_time: float` — total time in seconds (default 10)
  - `speed: float` — base movement speed (150)
  - `search_radius: float` — orbit radius (100)
  - `randomness: float` — random motion coefficient (0.0–1.0)
- State
  - `searching: bool`, `search_timer: float`
  - Random movement helpers: `random_offset`, `random_target`, timers
- UI
  - Creates a `CanvasLayer` ("TimerCanvasLayer") and a small panel with a title and countdown label
  - Cleans up UI in `_exit_tree()`
- Interaction
  - Connects to `Area2D.input_event` on node `Drone1` if present
  - `update_timer_display()` sets text and color (blue → yellow → red as time runs out)

Flow
```mermaid
sequenceDiagram
    participant SG as search_game.tscn
    participant D as drones.gd
    participant UI as TimerCanvasLayer

    SG->>D: _ready()
    D->>UI: create_timer_ui()
    D->>D: start_search(); searching = true
    loop each frame
        D->>D: _process(delta); search_timer += delta
        D->>UI: update_timer_display()
        alt time reached
            D->>D: finish_search(); searching = false
            UI->>UI: queue_free()
        end
    end
```

Zones and back button
- `Backtocafe.gd` is used as a reusable back button script in multiple scenes (Converter, SearchGame)
- Zone scripts (e.g., `zone_1.gd`, `zone_3.gd`) can emit events on area enter/exit

Extending
- Award monsters or coins when the timer ends based on search performance
- Add multiple drones with distinct orbits and player-directed scanning
- Persist results to `GlobalInventory` and show a result summary screen
- Replace placeholder UI with a skinned Control scene and theme
