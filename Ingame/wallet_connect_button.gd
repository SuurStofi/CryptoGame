# wallet_connect_button.gd
# Button to connect Ghost wallet and authenticate
extends Button

@export var status_label: Label  # Optional: to show connection status

func _ready():
	pressed.connect(_on_pressed)
	
	# Connect to wallet manager signals
	WalletManager.wallet_connected.connect(_on_wallet_connected)
	WalletManager.authentication_complete.connect(_on_authentication_complete)
	WalletManager.authentication_failed.connect(_on_authentication_failed)
	
	# Update button text based on connection status
	_update_button_state()

func _on_pressed() -> void:
	if WalletManager.is_wallet_connected():
		# Disconnect if already connected
		WalletManager.disconnect_wallet()
		text = "Connect Wallet"
		if status_label:
			status_label.text = "Disconnected"
	else:
		# Connect wallet
		text = "Connecting..."
		disabled = true
		if status_label:
			status_label.text = "Connecting to wallet..."
		
		WalletManager.connect_wallet()

func _on_wallet_connected(wallet_address: String):
	if status_label:
		status_label.text = "Authenticating..."
	print("🔌 Wallet connected: ", wallet_address)

func _on_authentication_complete(user_data: Dictionary):
	text = "Disconnect Wallet"
	disabled = false
	
	if status_label:
		var short_address = wallet_address_short(user_data.walletAddress)
		status_label.text = "Connected: " + short_address
	
	print("✅ Authentication complete!")
	print("💰 Total tokens claimed: ", user_data.totalTokensClaimed)

func _on_authentication_failed(error: String):
	text = "Connect Wallet"
	disabled = false
	
	if status_label:
		status_label.text = "Failed: " + error
	
	print("❌ Authentication failed: ", error)

func _update_button_state():
	if WalletManager.is_wallet_connected():
		text = "Disconnect Wallet"
	else:
		text = "Connect Wallet"

func wallet_address_short(address: String) -> String:
	if address.length() > 8:
		return address.substr(0, 4) + "..." + address.substr(address.length() - 4, 4)
	return address
