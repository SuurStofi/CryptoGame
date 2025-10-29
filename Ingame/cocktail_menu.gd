# cocktail_menu.gd
# Popup menu for cocktail actions
extends Control

signal action_confirmed(cocktail_name, action)

var cocktail_name: String = ""
var panel: Panel
var menu_container: VBoxContainer
var confirmation_container: VBoxContainer
var current_action: String = ""

# Loading overlay
var loading_overlay: ColorRect = null
var loading_label: Label = null

func _ready():
	# Make it fullscreen overlay
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	visible = false
	
	# Semi-transparent background
	var bg = ColorRect.new()
	bg.color = Color(0, 0, 0, 0.7)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	bg.gui_input.connect(_on_background_clicked)
	add_child(bg)
	
	# Create panel
	panel = Panel.new()
	panel.custom_minimum_size = Vector2(300, 250)
	panel.position = Vector2(400, 200)  # Center-ish
	add_child(panel)
	
	# Main menu container
	menu_container = VBoxContainer.new()
	menu_container.position = Vector2(20, 20)
	panel.add_child(menu_container)
	
	# Confirmation container (hidden initially)
	confirmation_container = VBoxContainer.new()
	confirmation_container.position = Vector2(20, 20)
	confirmation_container.visible = false
	panel.add_child(confirmation_container)
	
	# Create loading overlay
	_create_loading_overlay()
	
	_build_main_menu()
	_build_confirmation_menu()

func _create_loading_overlay():
	# Loading overlay (hidden by default)
	loading_overlay = ColorRect.new()
	loading_overlay.color = Color(0, 0, 0, 0.8)
	loading_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	loading_overlay.visible = false
	panel.add_child(loading_overlay)
	
	# Loading text
	loading_label = Label.new()
	loading_label.text = "Processing..."
	loading_label.add_theme_font_size_override("font_size", 18)
	loading_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	loading_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	loading_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	loading_overlay.add_child(loading_label)

func _show_loading(message: String = "Processing..."):
	loading_label.text = message
	loading_overlay.visible = true

func _hide_loading():
	loading_overlay.visible = false

func _build_main_menu():
	# Title
	var title = Label.new()
	title.text = "Cocktail Actions"
	title.add_theme_font_size_override("font_size", 20)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	menu_container.add_child(title)
	
	# Spacer
	var spacer1 = Control.new()
	spacer1.custom_minimum_size = Vector2(0, 20)
	menu_container.add_child(spacer1)
	
	# Sell for Coins button
	var sell_coins_btn = Button.new()
	sell_coins_btn.text = "💰 Sell for Coins"
	sell_coins_btn.custom_minimum_size = Vector2(260, 40)
	sell_coins_btn.pressed.connect(func(): _show_confirmation("sell_coins"))
	menu_container.add_child(sell_coins_btn)
	
	# Sell for Solana button
	var sell_sol_btn = Button.new()
	sell_sol_btn.text = "💎 Sell for Solana"
	sell_sol_btn.custom_minimum_size = Vector2(260, 40)
	sell_sol_btn.pressed.connect(func(): _show_confirmation("sell_solana"))
	menu_container.add_child(sell_sol_btn)
	
	# Use in game button
	var use_btn = Button.new()
	use_btn.text = "🎮 Use in Game"
	use_btn.custom_minimum_size = Vector2(260, 40)
	use_btn.pressed.connect(func(): _show_confirmation("use"))
	menu_container.add_child(use_btn)
	
	# Spacer
	var spacer2 = Control.new()
	spacer2.custom_minimum_size = Vector2(0, 20)
	menu_container.add_child(spacer2)
	
	# Cancel button
	var cancel_btn = Button.new()
	cancel_btn.text = "❌ Cancel"
	cancel_btn.custom_minimum_size = Vector2(260, 40)
	cancel_btn.pressed.connect(_close_menu)
	menu_container.add_child(cancel_btn)

func _build_confirmation_menu():
	# Title
	var title = Label.new()
	title.name = "ConfirmTitle"
	title.text = "Confirm Action"
	title.add_theme_font_size_override("font_size", 20)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	confirmation_container.add_child(title)
	
	# Message
	var message = Label.new()
	message.name = "ConfirmMessage"
	message.text = "Are you sure?"
	message.add_theme_font_size_override("font_size", 14)
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.autowrap_mode = TextServer.AUTOWRAP_WORD
	message.custom_minimum_size = Vector2(260, 60)
	confirmation_container.add_child(message)
	
	# Price info
	var price_label = Label.new()
	price_label.name = "PriceLabel"
	price_label.text = ""
	price_label.add_theme_font_size_override("font_size", 16)
	price_label.add_theme_color_override("font_color", Color.YELLOW)
	price_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	confirmation_container.add_child(price_label)
	
	# Blockchain info
	var blockchain_label = Label.new()
	blockchain_label.name = "BlockchainLabel"
	blockchain_label.text = "🔗 Token will be burned on blockchain"
	blockchain_label.add_theme_font_size_override("font_size", 12)
	blockchain_label.add_theme_color_override("font_color", Color(0.7, 0.9, 1.0))
	blockchain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	confirmation_container.add_child(blockchain_label)
	
	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	confirmation_container.add_child(spacer)
	
	# Confirm button
	var confirm_btn = Button.new()
	confirm_btn.text = "✅ Confirm"
	confirm_btn.custom_minimum_size = Vector2(260, 40)
	confirm_btn.pressed.connect(_confirm_action)
	confirmation_container.add_child(confirm_btn)
	
	# Back button
	var back_btn = Button.new()
	back_btn.text = "⬅️ Back"
	back_btn.custom_minimum_size = Vector2(260, 40)
	back_btn.pressed.connect(_show_main_menu)
	confirmation_container.add_child(back_btn)

func show_menu(cocktail: String):
	cocktail_name = cocktail
	_show_main_menu()
	visible = true
	
	# Center panel
	var viewport_size = get_viewport_rect().size
	panel.position = (viewport_size - panel.size) / 2

func _show_main_menu():
	menu_container.visible = true
	confirmation_container.visible = false

func _show_confirmation(action: String):
	current_action = action
	menu_container.visible = false
	confirmation_container.visible = true
	
	# Update confirmation message
	var message = confirmation_container.get_node("ConfirmMessage")
	var price_label = confirmation_container.get_node("PriceLabel")
	var blockchain_label = confirmation_container.get_node("BlockchainLabel")
	
	# Show blockchain info for authenticated users
	if UserManager.is_user_authenticated():
		blockchain_label.visible = true
	else:
		blockchain_label.visible = false
	
	match action:
		"sell_coins":
			var price = GlobalInventory.cocktail_prices.get(cocktail_name, 0)
			message.text = "Sell " + cocktail_name + " for coins?"
			price_label.text = "You will receive: " + str(price) + " 💰 coins"
		"sell_solana":
			var price = GlobalInventory.cocktail_solana_prices.get(cocktail_name, 0.0)
			message.text = "Sell " + cocktail_name + " for Solana?"
			price_label.text = "You will receive: " + str(price) + " 💎 SOL"
		"use":
			message.text = "Use " + cocktail_name + " in game?"
			price_label.text = "This will consume the cocktail"

func _confirm_action():
	# Emit the action to parent
	action_confirmed.emit(cocktail_name, current_action)
	
	# Note: Don't close menu yet - parent will handle async operation
	# and close when done

func _close_menu():
	visible = false

func _on_background_clicked(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_close_menu()
