# Glossary

Addon — A packaged set of scripts/scenes that extends the editor or runtime. In this repo: GodotTogether under `addons/`.

Autoload (Singleton) — A script or scene that is loaded on boot and persists across scenes, accessible via a global name (Project Settings → Autoload).

CanvasLayer — A node that renders UI and 2D elements on its own layer above the main scene (used by CurrencyDisplay and Search timer UI).

Client/Server — Multiplayer roles. The client connects to a server; the server authoritatively manages the session.

ENet — A reliable UDP networking library used by Godot’s high-level multiplayer API. GodotTogether uses `ENetMultiplayerPeer`.

GDTClient — Class from GodotTogether that represents the client-side networking component.

HUD — Heads-Up Display. Overlay UI that shows game info (e.g., coin count) always on top of gameplay.

Input Map — Godot’s configuration mapping physical inputs (keys, buttons, axes) to named actions.

JS Bridge — JavaScript interface exposed in web exports to interact with browser APIs or wallet extensions (used by `WalletManager`).

PackedScene — A saved scene resource that can be instanced at runtime (e.g., `Chamber.tscn`).

RPC — Remote Procedure Call. A method invoked across the network (e.g., `rpc_id(1, "receive_join_data", data)` in GodotTogether).

Singleton — See Autoload.

Timer — Node that emits a `timeout` signal after a delay. Used in MusicManager to enforce clip length and looping.

Viewport — Rendering area/window. `SceneInOut` gets camera via `get_viewport().get_camera_2d()` for zoom transitions.
