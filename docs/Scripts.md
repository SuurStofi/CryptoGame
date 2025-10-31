# Scripts Reference

This document summarizes key scripts in the Monster Cocktails Main project, their responsibilities, important APIs (functions, signals), and how they interact with other systems. Paths are relative to `res://`.

Conventions
- Signals are shown with their argument names and types.
- Public functions show important parameters and return values.
- Many scripts log with emoji-prefixed messages for easier filtering in the Output.

ApiManager — api_manager.gd
- Path: res://api_manager.gd
- Type: Autoload (Node)
- Responsibility: All HTTP/HTTPS REST calls to backend API.
- Constants
  - BASE_URL: String — "https://api.monster-cocktail.com"
- Signals
  - `request_completed(result: Dictionary)`
  - `request_failed(error: String)`
- Key functions (async via `await request_completed`)
  - `get_nonce(wallet_address: String) -> String`
  - `verify_signature(wallet_address: String, signature: String) -> Dictionary`
  - `get_user_info(auth_token: String) -> Dictionary`
  - `mint_tokens(auth_token: String, token_type: String) -> Dictionary`
  - `claim_tokens(auth_token: String, token_type: String) -> Dictionary` (alias)
  - `burn_tokens(auth_token: String, token_type: String, amount: int = 1) -> Dictionary`
  - `get_token_balance(wallet_address: String) -> Dictionary` (see file for full list)
- Usage
  - Called from `WalletManager` (auth) and `UserManager` (balances, mint/burn).

WalletManager — wallet_manager.gd
- Path: res://wallet_manager.gd
- Type: Autoload (Node)
- Responsibility: Manage Solana wallet connection in web builds (Phantom), sign messages, and trigger authentication flow.
- Signals
  - `wallet_connected(wallet_address: String)`
  - `wallet_disconnected()`
  - `authentication_complete(user_data: Dictionary)`
  - `authentication_failed(error: String)`
- Web/JS bridge
  - Injects `window.godotWalletInterface` with methods: `connectWallet()`, `disconnectWallet()`, `setPendingMessage(msg)`, `signPendingMessage()`, and `isWalletConnected()`.
  - Uses base58 for signature encoding.
- Key functions
  - `connect_wallet()` → triggers JS bridge and awaits result.
  - `authenticate_with_signature(nonce: String)` → signs and verifies via `ApiManager`.
  - Helpers `_process_wallet_connection(json_result)`, `_wait_for_wallet_result()` etc.
- Interactions
  - On success updates `UserManager` with `auth_token` and `wallet_address` and emits `authentication_complete`.

UserManager — user_manager.gd
- Path: res://user_manager.gd
- Type: Autoload (Node)
- Responsibility: Holds authenticated user state and token balances; provides mint/burn/claim wrappers.
- Core state
  - `is_authenticated: bool`, `auth_token: String`, `wallet_address: String`
  - Profile: `username`, `email`, `created_at`, `last_login`
  - `token_balances: { APPLE_JUICE, ORANGE_JUICE, GRAPE_SODA }`
- Signals
  - `user_data_updated(data: Dictionary)`
  - `tokens_claimed(token_type: String, amount: int)`
  - `balance_updated(balances: Dictionary)`
- Key functions
  - `set_user_data(data: Dictionary)` and `clear_user_data()`
  - `refresh_user_data()`
  - `claim_tokens(token_type: String)` → via ApiManager
  - `consume_tokens(cocktail_name: String, amount: int = 1) -> bool` → burn via ApiManager
  - `fetch_token_balances()` → via ApiManager, emits `balance_updated` and syncs inventory
- Mapping helpers
  - `_get_token_type_from_cocktail(cocktail_name: String) -> String`

GlobalInventory — Game/fixed/global_inventory_fixed.gd
- Path: res://Game/fixed/global_inventory_fixed.gd
- Type: Autoload (Node)
- Responsibility: Game-side inventory of monsters, cocktails, and coins; pricing and signals for HUD/UI.
- State
  - `monsters: {"Blue Monster", "Purple Monster", "Violet Monster", "Orange Monster"}`
  - `cocktails: {"Basic Juice", "Double Mix", "Triple Blast"}`
  - `coins: int`, `solana: float`
  - pricing dictionaries for cocktails and monsters
- Signals
  - `monster_added(name, count)`, `monster_removed(name, count)`
  - `cocktail_added(name, count)`, `cocktail_removed(name, count)`
  - `coins_changed(amount)`, `solana_changed(amount)`
- Key functions
  - Monster: `add_monster(name)`, `remove_monster(name)`, counts and totals
  - Converter integration: `transfer_monster_to_converter(name)`, `process_cocktail(cocktail_name)`
  - Currency: `add_coins(n)`, `spend_coins(n)`, getters

CurrencyDisplay — Currency/currency_display.gd
- Path: res://Currency/currency_display.gd
- Type: Autoload (CanvasLayer)
- Responsibility: HUD overlay showing current coins, with show/hide rules per scene and small pulse animation on changes.
- Key points
  - Hides on `loading.tscn` and `menu.tscn`.
  - Connects to `GlobalInventory.coins_changed` signal to update UI.
  - Builds UI elements programmatically; optional `coin_texture` export.

SceneTransition — SceneTransition.gd
- Path: res://SceneTransition.gd
- Type: Autoload (CanvasLayer)
- Responsibility: Fullscreen fade transitions and safe scene changes.
- API
  - `change_scene(scene_path: String, duration: float = 0.5)`
  - `change_scene_to_packed(packed_scene: PackedScene, duration: float = 0.5)`
  - `fade_out_only(duration: float = 0.5)` / `fade_in_only(duration: float = 0.5)`
  - `set_fade_color(new_color: Color)`

SceneInOut — SceneInOut.gd
- Path: res://SceneInOut.gd
- Type: Autoload (likely CanvasLayer/Node)
- Responsibility: Zoom-in/zoom-out style transitions across scene changes.
- Note: Used similarly to `SceneTransition` where a camera-based zoom is preferred.

MusicManager — MusicManager/music_manager.gd
- Path: res://MusicManager/music_manager.gd
- Type: Autoload (Node)
- Responsibility: Scene-aware background music playback, volume and length control, optional looping.
- Config
  - Exported streams: `main_theme`, `exploration_theme`
  - Scenes lists: `main_theme_scenes`, `exploration_scenes`
  - Volume DB values
  - Track length & loop settings per track
- Behavior
  - Listens to scene load events, chooses track by scene path.
  - Uses a one-shot Timer for custom clip length; reconnects/loops as configured.

Search Drones — SearchGame/drones.gd
- Path: res://SearchGame/drones.gd
- Type: Node2D
- Responsibility: Drone orbit movement, random motion, and timed search with an on-screen timer overlay.
- Key exports: `search_time`, `speed`, `search_radius`, `randomness`
- UI: Builds a `CanvasLayer` + panel + labels at runtime; shows countdown; cleans up on exit.

Converter Chamber — Convertor/Chamber/chamber.gd
- Path: res://Convertor/Chamber/chamber.gd
- Type: Node2D
- Responsibility: Drag-and-drop chamber for ingredients ("zombies"), capacity control, processing animation and crafting cocktails.
- Signals: `zombie_added`, `zombie_removed`, `chamber_full`, `processing_started`, `cocktail_ready(cocktail_name, sell_price)`
- Key exports: `max_zombies`, `processing_time`, `zombie_slot_spacing`, `piston_speed`
- Behavior: Tracks an internal list of zombies; animates piston effect during processing; emits `cocktail_ready` when done.

Gameplay
- Player — res://Game/player_improved.gd
  - 2D platformer controls (move left/right/jump/attack), integrates with input map items `move_left`, `move_right`, `move_jump`, `attack`.
- Camera — res://Game/camera_2d.gd
  - Smooth follow of the player, screen-shake hooks (if any).
- UI Root — res://Game/ui_root.gd
  - Mobile-friendly on-screen controls and pause menu wiring to `pause_ui.gd`.

Selling Spot
- Start button — res://selling-spot/start.gd
  - Sets `Globals.next_scene` and navigates to the desired scene (SearchGame or back to Menu).

Globals — globals.gd
- Path: res://globals.gd
- Responsibility: Boot-time preload of `loading.tscn` and a `next_scene` pointer (defaults to Menu).
