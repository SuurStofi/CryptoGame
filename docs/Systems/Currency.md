# Currency HUD System

Scope
- Display and update the player’s coin amount as a top-right overlay across most scenes
- Implemented as an autoloaded scene: `res://Currency/currency_display.tscn` with script `res://Currency/currency_display.gd`

Responsibilities
- Show/hide based on the active scene (hidden on Loading and Menu)
- Subscribe to `GlobalInventory.coins_changed` to reflect coin updates
- Provide a minimal visual pulse animation on change

Behavior
- On `_ready()`: subscribes to scene changes and calls `_check_and_update_visibility()`
- Only appears on gameplay and other non-menu scenes
- Builds its UI programmatically: `PanelContainer` + `HBoxContainer` + icon + label
- Optional `@export var coin_texture: Texture2D` allows setting a custom icon in the editor

Hide logic
- Hidden on paths: `res://Loading-Dependencies/loading.tscn`, `res://Menu-Dependencies/menu.tscn`

Flow
```mermaid
sequenceDiagram
    participant Tree as SceneTree
    participant HUD as CurrencyDisplay
    participant Inv as GlobalInventory

    Tree->>HUD: node_added (scene changed)
    HUD->>HUD: _check_and_update_visibility()
    alt gameplay scene
        HUD->>HUD: _create_ui_elements() if first time
        Inv-->>HUD: coins_changed(amount)
        HUD->>HUD: _update_display(); _play_coin_animation()
    else menu/loading
        HUD->>HUD: visible = false
    end
```

Customization tips
- Replace the placeholder icon by assigning `coin_texture` in the inspector.
- Adjust panel padding, font size, and colors by tweaking style overrides in `_create_ui()`.
- To support multiple currencies, add additional icons/labels, and subscribe to new signals in `GlobalInventory`.
