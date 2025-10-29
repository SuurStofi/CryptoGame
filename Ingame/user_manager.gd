# user_manager.gd
# Autoload singleton for managing user data
extends Node

signal user_data_updated(user_data: Dictionary)
signal tokens_claimed(token_type: String, amount: int)
signal balance_updated(balances: Dictionary)

# User authentication
var auth_token: String = ""
var is_authenticated: bool = false

# User data
var wallet_address: String = ""
var created_at: String = ""
var last_login: String = ""
var total_tokens_claimed: int = 0
var total_listings_created: int = 0
var total_purchases: int = 0

# Token balances (from Solana blockchain)
var token_balances: Dictionary = {
	"APPLE_JUICE": 0,
	"ORANGE_JUICE": 0,
	"GRAPE_SODA": 0
}

func _ready():
	print("👤 UserManager initialized")
	# Connect to wallet manager signals
	WalletManager.authentication_complete.connect(_on_authentication_complete)
	WalletManager.wallet_disconnected.connect(_on_wallet_disconnected)

func set_auth_token(token: String):
	auth_token = token
	is_authenticated = token != ""
	print("🔑 Auth token set: ", "***" if token != "" else "none")

func get_auth_token() -> String:
	return auth_token

func is_user_authenticated() -> bool:
	return is_authenticated

func set_user_data(data: Dictionary):
	if data.has("walletAddress"):
		wallet_address = data["walletAddress"]
	if data.has("createdAt"):
		created_at = data["createdAt"]
	if data.has("lastLogin"):
		last_login = data["lastLogin"]
	if data.has("totalTokensClaimed"):
		total_tokens_claimed = data["totalTokensClaimed"]
	if data.has("totalListingsCreated"):
		total_listings_created = data["totalListingsCreated"]
	if data.has("totalPurchases"):
		total_purchases = data["totalPurchases"]
	
	print("👤 User data updated:")
	print("  Wallet: ", wallet_address)
	print("  Tokens claimed: ", total_tokens_claimed)
	print("  Listings created: ", total_listings_created)
	print("  Purchases: ", total_purchases)
	
	user_data_updated.emit(get_user_data())

func get_user_data() -> Dictionary:
	return {
		"walletAddress": wallet_address,
		"createdAt": created_at,
		"lastLogin": last_login,
		"totalTokensClaimed": total_tokens_claimed,
		"totalListingsCreated": total_listings_created,
		"totalPurchases": total_purchases,
		"isAuthenticated": is_authenticated
	}

func _on_authentication_complete(user_data: Dictionary):
	set_user_data(user_data)
	# Fetch token balances after authentication
	await fetch_token_balances()

func _on_wallet_disconnected():
	clear_user_data()

func clear_user_data():
	auth_token = ""
	is_authenticated = false
	wallet_address = ""
	created_at = ""
	last_login = ""
	total_tokens_claimed = 0
	total_listings_created = 0
	total_purchases = 0
	token_balances = {
		"APPLE_JUICE": 0,
		"ORANGE_JUICE": 0,
		"GRAPE_SODA": 0
	}
	print("👤 User data cleared")

# Fetch fresh user data from server
func refresh_user_data():
	if not is_authenticated:
		print("⚠️ Cannot refresh user data - not authenticated")
		return
	
	var data = await ApiManager.get_user_info(auth_token)
	if not data.is_empty():
		set_user_data(data)

# Claim tokens from server
func claim_tokens(token_type: String):
	if not is_authenticated:
		print("⚠️ Cannot claim tokens - not authenticated")
		return
	
	print("🎁 Claiming tokens: ", token_type)
	var result = await ApiManager.claim_tokens(auth_token, token_type)
	
	if result.has("success") and result["success"]:
		if result.has("message"):
			print("✅ ", result["message"])
		if result.has("transactionSignature"):
			print("🔗 Transaction: ", result["transactionSignature"])
		
		# Update local balance
		if result.has("amount"):
			var amount = result["amount"]
			tokens_claimed.emit(token_type, amount)
			
			# Refresh balances from blockchain - this will also sync inventory
			await fetch_token_balances()
	else:
		if result.has("message"):
			print("❌ Failed to claim tokens: ", result["message"])
		else:
			print("❌ Failed to claim tokens")

# Consume/burn tokens when processing drinks
func consume_tokens(cocktail_name: String, amount: int = 1) -> bool:
	if not is_authenticated:
		print("⚠️ Cannot consume tokens - not authenticated")
		return false
	
	# Map cocktail names back to token types
	var token_type = _get_token_type_from_cocktail(cocktail_name)
	if token_type == "":
		print("⚠️ Unknown cocktail type: ", cocktail_name)
		return false
	
	# Check if we have enough tokens
	var current_balance = token_balances.get(token_type, 0)
	if current_balance < amount:
		print("⚠️ Not enough tokens: have ", current_balance, ", need ", amount)
		return false
	
	print("🔥 Consuming tokens: ", token_type, " x", amount)
	var result = await ApiManager.burn_tokens(auth_token, token_type, amount)
	
	if result.has("success") and result["success"]:
		print("✅ Tokens consumed successfully!")
		if result.has("signature"):
			print("🔗 Transaction: ", result["signature"])
		
		# Refresh balances from blockchain - this will also sync inventory
		await fetch_token_balances()
		return true
	else:
		if result.has("message"):
			print("❌ Failed to consume tokens: ", result["message"])
		else:
			print("❌ Failed to consume tokens")
		return false

# Helper function to convert cocktail name to token type
func _get_token_type_from_cocktail(cocktail_name: String) -> String:
	var reverse_map = {
		"Basic Juice": "APPLE_JUICE",
		"Double Mix": "ORANGE_JUICE",
		"Triple Blast": "GRAPE_SODA"
	}
	return reverse_map.get(cocktail_name, "")

# Fetch token balances from blockchain
func fetch_token_balances():
	if wallet_address == "":
		print("⚠️ No wallet address available")
		return
	
	print("📊 Fetching token balances...")
	var response = await ApiManager.get_token_balance(wallet_address)
	
	if not response.is_empty() and response.has("balances"):
		var balances = response["balances"]
		
		# Convert API format (camelCase) to internal format (UPPER_SNAKE_CASE)
		token_balances = {
			"APPLE_JUICE": int(balances.get("appleJuice", 0)),
			"ORANGE_JUICE": int(balances.get("orangeJuice", 0)),
			"GRAPE_SODA": int(balances.get("grapeSoda", 0))
		}
		
		print("💎 Token balances updated:")
		for token in token_balances:
			print("  ", token, ": ", token_balances[token])
		
		balance_updated.emit(token_balances)
		
		# Sync inventory with current balances
		_sync_inventory_with_balances()

func get_token_balance(token_type: String) -> int:
	return token_balances.get(token_type, 0)

func get_all_balances() -> Dictionary:
	return token_balances.duplicate()

# Sync the entire inventory with current token balances
func _sync_inventory_with_balances():
	print("🔄 Syncing inventory with blockchain balances...")
	
	var cocktail_map = {
		"APPLE_JUICE": "Basic Juice",
		"ORANGE_JUICE": "Double Mix",
		"GRAPE_SODA": "Triple Blast"
	}
	
	for token_type in token_balances:
		var balance = token_balances[token_type]
		var cocktail_name = cocktail_map.get(token_type, "")
		
		if cocktail_name == "":
			continue
		
		# Get current inventory count for this cocktail
		var current_count = GlobalInventory.get_cocktail_count(cocktail_name)
		
		# Sync inventory to match blockchain balance
		if balance > current_count:
			# Blockchain has MORE - add the difference
			var diff = balance - current_count
			for i in range(diff):
				GlobalInventory.add_cocktail(cocktail_name)
			print("🍹 Synced ", cocktail_name, ": added ", diff, " (now ", balance, ")")
			
		elif balance < current_count:
			# Blockchain has LESS - remove the difference
			var diff = current_count - balance
			
			# Check if GlobalInventory has a remove function
			if GlobalInventory.has_method("remove_cocktail"):
				for i in range(diff):
					GlobalInventory.remove_cocktail(cocktail_name)
				print("🍹 Synced ", cocktail_name, ": removed ", diff, " (now ", balance, ")")
			else:
				# If no remove method, try to set directly
				if GlobalInventory.has_method("set_cocktail_count"):
					GlobalInventory.set_cocktail_count(cocktail_name, balance)
					print("🍹 Synced ", cocktail_name, ": set to ", balance)
				else:
					print("⚠️ Warning: Cannot sync down. Inventory has more ", cocktail_name, " than blockchain (", current_count, " vs ", balance, ")")
					print("   Please add a remove_cocktail() or set_cocktail_count() method to GlobalInventory")
		else:
			# Already in sync
			if balance > 0:
				print("✅ ", cocktail_name, " already in sync: ", balance)



# Helper to get display name for token type
func get_token_display_name(token_type: String) -> String:
	var names = {
		"APPLE_JUICE": "Apple Juice",
		"ORANGE_JUICE": "Orange Juice",
		"GRAPE_SODA": "Grape Soda"
	}
	return names.get(token_type, token_type)
