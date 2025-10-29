# global_inventory.gd
# Enhanced version with full blockchain synchronization
# This is an Autoload singleton
extends Node

# Persistent cocktail inventory
var cocktails = {
	"Basic Juice": 0,
	"Double Mix": 0,
	"Triple Blast": 0
}

# Player's money/currency
var coins: int = 0
var solana: float = 0.0

# Signals
signal cocktail_added(cocktail_name, new_count)
signal cocktail_removed(cocktail_name, new_count)
signal coins_changed(new_amount)
signal solana_changed(new_amount)
signal inventory_synced()

# Cocktail prices
var cocktail_prices = {
	"Basic Juice": 10,
	"Double Mix": 25,
	"Triple Blast": 50
}

# Solana prices (example values)
var cocktail_solana_prices = {
	"Basic Juice": 0.001,
	"Double Mix": 0.0025,
	"Triple Blast": 0.005
}

# Token to cocktail mapping
var token_to_cocktail = {
	"APPLE_JUICE": "Basic Juice",
	"ORANGE_JUICE": "Double Mix",
	"GRAPE_SODA": "Triple Blast"
}

func _ready():
	print("📦 Global Inventory initialized (Enhanced with Blockchain Sync)")
	print("Starting inventory: ", cocktails)
	
	# Connect to UserManager signals for automatic sync
	if has_node("/root/UserManager"):
		UserManager.balance_updated.connect(_on_balance_updated)
		UserManager.tokens_claimed.connect(_on_tokens_claimed)
		print("✅ Connected to UserManager for auto-sync")
	else:
		print("⚠️ UserManager not found - blockchain sync disabled")

# ============================================================================
# BLOCKCHAIN SYNC METHODS
# ============================================================================

# Called automatically when UserManager updates token balances
func _on_balance_updated(balances: Dictionary):
	print("📊 Token balances updated, syncing inventory...")
	
	# Update inventory based on new balances
	for token_type in balances:
		if token_to_cocktail.has(token_type):
			var cocktail_name = token_to_cocktail[token_type]
			var new_amount = balances[token_type]
			
			# Update cocktail count to match blockchain
			var old_amount = cocktails[cocktail_name]
			set_cocktail_count(cocktail_name, new_amount)
			
			if new_amount > old_amount:
				print("  ✅ ", cocktail_name, ": ", old_amount, " → ", new_amount, " (+", new_amount - old_amount, ")")
			elif new_amount < old_amount:
				print("  ✅ ", cocktail_name, ": ", old_amount, " → ", new_amount, " (-", old_amount - new_amount, ")")

# Called automatically when tokens are claimed
func _on_tokens_claimed(token_type: String, amount: int):
	print("🎁 Tokens claimed: ", token_type, " x", amount)
	# Note: Inventory will be synced automatically via balance_updated signal

# Manual sync with blockchain (optional - can be called anytime)
func sync_with_blockchain():
	if not UserManager.is_user_authenticated():
		print("⚠️ Cannot sync - user not authenticated")
		return
	
	print("🔄 Manually syncing inventory with blockchain...")
	
	# Fetch fresh balances (this will trigger _on_balance_updated)
	await UserManager.fetch_token_balances()
	
	inventory_synced.emit()
	print("✅ Manual sync complete")

# ============================================================================
# INVENTORY MANAGEMENT METHODS
# ============================================================================

# Add a cocktail to inventory (local only - use collect_cocktail for gameplay)
func add_cocktail(cocktail_name: String):
	if cocktails.has(cocktail_name):
		cocktails[cocktail_name] += 1
		cocktail_added.emit(cocktail_name, cocktails[cocktail_name])
		print("📦 Global Inventory: Added ", cocktail_name, " - Total: ", cocktails[cocktail_name])
	else:
		print("⚠️ Unknown cocktail type: ", cocktail_name)

# Collect a cocktail during gameplay (mints token on blockchain)
func collect_cocktail(cocktail_name: String) -> bool:
	"""
	Called when player collects a cocktail in-game.
	This will mint the token on blockchain if authenticated.
	"""
	if not cocktails.has(cocktail_name):
		print("⚠️ Unknown cocktail type: ", cocktail_name)
		return false
	
	# If authenticated, mint token on blockchain
	if UserManager.is_user_authenticated():
		print("🎁 Collecting ", cocktail_name, " with blockchain minting...")
		
		# Get the token type for this cocktail
		var token_type = _get_token_type_from_cocktail(cocktail_name)
		if token_type == "":
			print("⚠️ No token mapping for ", cocktail_name)
			# Still add locally if no mapping
			add_cocktail(cocktail_name)
			return true
		
		# Small delay to prevent HTTP request conflicts if collecting multiple items quickly
		await get_tree().create_timer(0.1).timeout
		
		# Mint token on blockchain (this will auto-sync inventory)
		await UserManager.claim_tokens(token_type)
		
		# NOTE: We don't check success or add locally here because:
		# 1. If successful, the balance_updated signal already synced inventory
		# 2. If failed, we don't want to add locally and cause desync
		print("✅ Blockchain minting process complete")
		return true
	else:
		# Offline mode - just add locally
		print("📱 Collecting ", cocktail_name, " locally (offline mode)")
		add_cocktail(cocktail_name)
		return true

# Helper function to convert cocktail name to token type
func _get_token_type_from_cocktail(cocktail_name: String) -> String:
	for token_type in token_to_cocktail:
		if token_to_cocktail[token_type] == cocktail_name:
			return token_type
	return ""

# Remove a cocktail from inventory
func remove_cocktail(cocktail_name: String) -> bool:
	if not cocktails.has(cocktail_name):
		print("⚠️ Cannot remove: Unknown cocktail type: ", cocktail_name)
		return false
	
	if cocktails[cocktail_name] <= 0:
		print("⚠️ Cannot remove: No ", cocktail_name, " in inventory")
		return false
	
	cocktails[cocktail_name] -= 1
	cocktail_removed.emit(cocktail_name, cocktails[cocktail_name])
	print("📦 Global Inventory: Removed ", cocktail_name, " - Remaining: ", cocktails[cocktail_name])
	return true

# Set cocktail count directly (used by sync system)
func set_cocktail_count(cocktail_name: String, count: int):
	if not cocktails.has(cocktail_name):
		print("⚠️ Cannot set count: Unknown cocktail type: ", cocktail_name)
		return
	
	var old_count = cocktails[cocktail_name]
	cocktails[cocktail_name] = max(0, count)  # Ensure non-negative
	
	if count > old_count:
		cocktail_added.emit(cocktail_name, cocktails[cocktail_name])
	elif count < old_count:
		cocktail_removed.emit(cocktail_name, cocktails[cocktail_name])

# Get cocktail count
func get_cocktail_count(cocktail_name: String) -> int:
	if cocktails.has(cocktail_name):
		return cocktails[cocktail_name]
	return 0

# Get all cocktails with counts
func get_all_cocktails() -> Dictionary:
	return cocktails.duplicate()

# ============================================================================
# GAME ECONOMY METHODS
# ============================================================================

# Sell cocktail for coins
func sell_cocktail_for_coins(cocktail_name: String) -> bool:
	if not remove_cocktail(cocktail_name):
		return false
	
	var price = cocktail_prices.get(cocktail_name, 0)
	add_coins(price)
	print("💰 Sold ", cocktail_name, " for ", price, " coins")
	return true

# Sell cocktail for Solana
func sell_cocktail_for_solana(cocktail_name: String) -> bool:
	if not remove_cocktail(cocktail_name):
		return false
	
	var price = cocktail_solana_prices.get(cocktail_name, 0.0)
	solana += price
	solana_changed.emit(solana)
	print("💎 Sold ", cocktail_name, " for ", price, " SOL. Total SOL: ", solana)
	return true

# Use cocktail in game with blockchain sync
func use_cocktail(cocktail_name: String) -> bool:
	# Check if user is authenticated for blockchain sync
	if UserManager.is_user_authenticated():
		print("🔥 Using ", cocktail_name, " with blockchain sync...")
		
		# Consume token on blockchain (this will auto-sync inventory)
		var success = await UserManager.consume_tokens(cocktail_name, 1)
		
		if success:
			print("✅ ", cocktail_name, " used and token burned on blockchain!")
			# Inventory is already synced automatically
			return true
		else:
			print("❌ Failed to burn token on blockchain")
			return false
	else:
		# Offline mode - just remove locally
		print("📱 Using ", cocktail_name, " locally (offline mode)")
		if remove_cocktail(cocktail_name):
			print("🎮 Used ", cocktail_name, " in game!")
			return true
		return false

# ============================================================================
# CURRENCY MANAGEMENT
# ============================================================================

# Add coins
func add_coins(amount: int):
	coins += amount
	coins_changed.emit(coins)
	print("💰 Added ", amount, " coins. Total: ", coins)

# Remove coins (for purchases)
func remove_coins(amount: int) -> bool:
	if coins < amount:
		print("⚠️ Not enough coins. Have: ", coins, ", Need: ", amount)
		return false
	coins -= amount
	coins_changed.emit(coins)
	print("💰 Removed ", amount, " coins. Total: ", coins)
	return true

# Get current coins
func get_coins() -> int:
	return coins

# Get current Solana
func get_solana() -> float:
	return solana

# ============================================================================
# SAVE/LOAD FUNCTIONS
# ============================================================================

func save_to_file():
	var save_data = {
		"cocktails": cocktails,
		"coins": coins,
		"solana": solana
	}
	
	var file = FileAccess.open("user://inventory_save.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(save_data))
		file.close()
		print("💾 Inventory saved")
	else:
		print("❌ Failed to save inventory")

func load_from_file():
	if not FileAccess.file_exists("user://inventory_save.json"):
		print("ℹ️ No save file found")
		return
	
	var file = FileAccess.open("user://inventory_save.json", FileAccess.READ)
	if file:
		var json_string = file.get_as_text()
		file.close()
		
		var json = JSON.new()
		var parse_result = json.parse(json_string)
		
		if parse_result == OK:
			var save_data = json.data
			if save_data.has("cocktails"):
				cocktails = save_data.cocktails
			if save_data.has("coins"):
				coins = save_data.coins
				coins_changed.emit(coins)
			if save_data.has("solana"):
				solana = save_data.solana
				solana_changed.emit(solana)
			print("💾 Inventory loaded from file")
			
			# Sync with blockchain after loading
			if UserManager.is_user_authenticated():
				await sync_with_blockchain()
		else:
			print("❌ Failed to parse save file")
	else:
		print("❌ Failed to open save file")

# Clear all inventory (useful for logout/reset)
func clear_inventory():
	cocktails = {
		"Basic Juice": 0,
		"Double Mix": 0,
		"Triple Blast": 0
	}
	coins = 0
	solana = 0.0
	print("🗑️ Inventory cleared")
