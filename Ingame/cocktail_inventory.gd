# cocktail_inventory.gd
# Attach to CocktailInventory (VBoxContainer)
extends VBoxContainer

# IMPORTANT: Set these textures in the Inspector!
@export var basic_juice_texture: Texture2D
@export var double_mix_texture: Texture2D
@export var triple_blast_texture: Texture2D

# Path to the item scene - CHANGE THIS to match your path
const COCKTAIL_ITEM_PATH = "res://Convertor/cocktail_inventory_item.tscn"

# Store references to each cocktail item
var cocktail_items = {}

# Cocktail menu popup
var cocktail_menu: Control = null

func _ready():
	# Position in top-right corner (moved more left to fit buttons)
	var viewport_size = get_viewport_rect().size
	position = Vector2(viewport_size.x - 250, 10)  # Changed from -200 to -250 for more space
	
	# Set minimum width for the container
	custom_minimum_size = Vector2(240, 0)
	
	# Create title
	var title = Label.new()
	title.text = "🍹 Cocktails"
	title.add_theme_font_size_override("font_size", 16)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(title)
	
	# Create the cocktail items
	_create_items()
	
	# Create cocktail menu (add to root)
	_create_cocktail_menu()
	
	# Connect to global inventory signals
	GlobalInventory.cocktail_added.connect(_on_cocktail_added)
	GlobalInventory.cocktail_removed.connect(_on_cocktail_removed)
	
	# Initialize with current counts from GlobalInventory
	_sync_with_global_inventory()

func _create_items():
	# Define cocktails with their textures
	var cocktails = {
		"Basic Juice": basic_juice_texture,
		"Double Mix": double_mix_texture,
		"Triple Blast": triple_blast_texture
	}
	
	# Load the item scene
	var item_scene = load(COCKTAIL_ITEM_PATH)
	if not item_scene:
		print("❌ ERROR: Could not load ", COCKTAIL_ITEM_PATH)
		print("   Make sure cocktail_inventory_item.tscn exists at that path!")
		return
	
	# Create an item for each cocktail
	for cocktail_name in cocktails.keys():
		var item = item_scene.instantiate()
		
		# Setup the item
		item.setup(cocktail_name, cocktails[cocktail_name])
		
		# Connect click signal
		item.cocktail_clicked.connect(_on_cocktail_item_clicked)
		
		# Store reference
		cocktail_items[cocktail_name] = item
		
		# Add to display
		add_child(item)
		
		print("✅ Created cocktail item: ", cocktail_name)

# Add one cocktail (called when crafting finishes or collecting in-game)
# NOW USES BLOCKCHAIN MINTING!
func add_cocktail(cocktail_name: String):
	print("🎮 Adding cocktail to inventory: ", cocktail_name)
	
	# Use collect_cocktail which mints on blockchain
	# This is async, so we need to await it
	var success = await GlobalInventory.collect_cocktail(cocktail_name)
	
	if success:
		print("✅ Cocktail added and minted on blockchain!")
	else:
		print("⚠️ Cocktail added locally (offline or failed to mint)")

# Sync display with global inventory
func _sync_with_global_inventory():
	for cocktail_name in cocktail_items.keys():
		var count = GlobalInventory.get_cocktail_count(cocktail_name)
		if cocktail_items[cocktail_name].has_method("update_display"):
			cocktail_items[cocktail_name].update_display(count)

# Handle global inventory changes
func _on_cocktail_added(cocktail_name: String, new_count: int):
	if cocktail_items.has(cocktail_name):
		cocktail_items[cocktail_name].update_display(new_count)

func _on_cocktail_removed(cocktail_name: String, new_count: int):
	if cocktail_items.has(cocktail_name):
		cocktail_items[cocktail_name].update_display(new_count)

func _create_cocktail_menu():
	# Load or create the menu
	print("🔍 Attempting to load cocktail menu...")
	var menu_script = load("res://cocktail_menu.gd")  # UPDATE PATH IF NEEDED
	
	if menu_script:
		print("✅ Menu script loaded successfully!")
		cocktail_menu = Control.new()  # Changed from Node to Control
		cocktail_menu.set_script(menu_script)
		get_tree().root.add_child(cocktail_menu)
		cocktail_menu.action_confirmed.connect(_on_menu_action_confirmed)
		print("✅ Cocktail menu created and added to scene tree")
	else:
		print("❌ ERROR: Could not load cocktail_menu.gd - check the file path!")
		print("   Expected path: res://cocktail_menu.gd")

func _on_cocktail_item_clicked(cocktail_name: String):
	print("🖱️ Cocktail clicked in inventory manager: ", cocktail_name)
	if cocktail_menu:
		print("✅ Opening menu for: ", cocktail_name)
		cocktail_menu.show_menu(cocktail_name)
	else:
		print("❌ ERROR: cocktail_menu is null! Menu was not created properly.")

# Handle menu actions with blockchain sync
func _on_menu_action_confirmed(cocktail_name: String, action: String):
	match action:
		"sell_coins":
			# Selling for coins also uses blockchain
			var success = await _sell_with_blockchain(cocktail_name, "coins")
			if success:
				print("✅ Sold ", cocktail_name, " for coins!")
			else:
				print("❌ Failed to sell ", cocktail_name)
				
		"sell_solana":
			# Selling for solana also uses blockchain
			var success = await _sell_with_blockchain(cocktail_name, "solana")
			if success:
				print("✅ Sold ", cocktail_name, " for Solana!")
			else:
				print("❌ Failed to sell ", cocktail_name)
				
		"use":
			# Use cocktail burns token on blockchain
			var success = await GlobalInventory.use_cocktail(cocktail_name)
			if success:
				print("✅ Used ", cocktail_name, " in game!")
			else:
				print("❌ Failed to use ", cocktail_name)

# Helper function to sell with blockchain burn
func _sell_with_blockchain(cocktail_name: String, currency: String) -> bool:
	# First, consume the token on blockchain
	var success = await GlobalInventory.use_cocktail(cocktail_name)
	
	if success:
		# Token burned successfully, now add currency
		match currency:
			"coins":
				var price = GlobalInventory.cocktail_prices.get(cocktail_name, 0)
				GlobalInventory.add_coins(price)
			"solana":
				var price = GlobalInventory.cocktail_solana_prices.get(cocktail_name, 0.0)
				GlobalInventory.solana += price
				GlobalInventory.solana_changed.emit(GlobalInventory.solana)
		return true
	else:
		return false

# Get count of a cocktail (compatibility function)
func get_cocktail_count(cocktail_name: String) -> int:
	return GlobalInventory.get_cocktail_count(cocktail_name)
