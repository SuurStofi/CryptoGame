# Inputs and Controls

This project defines a small set of input actions in `project.godot` (Main project). Below are the actions and their default bindings.

Actions (Monster-Cocktails-Main)
- move_left
  - Keyboard: A, Left Arrow
  - Gamepad: D-Pad Left, Left Stick (X axis < 0)
- move_right
  - Keyboard: D, Right Arrow
  - Gamepad: D-Pad Right, Left Stick (X axis > 0)
- move_jump
  - Keyboard: Space, Up Arrow
  - Gamepad: Button 1 (commonly B/Cross depending on layout)
- pause
  - Keyboard: Escape
  - Gamepad: Button 5 (typically Right Shoulder)
- attack
  - Gamepad: Button 0 (commonly A/South)
  - Note: No default keyboard binding set in `project.godot` for attack; map one if needed.

Mobile
- `ProjectSettings.input_devices.pointing.emulate_touch_from_mouse = true` is enabled.
- On-screen controls are provided in the Gameplay UI (see `res://Game/ui_root.gd`) for touch devices.

Tips
- Rebind inputs in Project → Project Settings → Input Map.
- Prefer action names (`Input.is_action_pressed("move_left")`) instead of hardcoded keys.
- If adding new actions, define them in `project.godot` and adjust gameplay scripts accordingly.
