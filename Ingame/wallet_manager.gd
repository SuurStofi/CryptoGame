# wallet_manager.gd
# Autoload singleton for managing Solana wallet connections
extends Node

signal wallet_connected(wallet_address: String)
signal wallet_disconnected()
signal authentication_complete(user_data: Dictionary)
signal authentication_failed(error: String)

var is_connected: bool = false
var wallet_address: String = ""
var auth_token: String = ""

func _ready():
	print("🔐 WalletManager initialized")
	if OS.has_feature("web"):
		_setup_javascript_bridge()

func _setup_javascript_bridge():
	if not OS.has_feature("web"):
		print("⚠️ Not running in web browser, wallet features disabled")
		return
	
	var js_code = """
	// Base58 encoding library (inline)
	const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	
	function base58Encode(buffer) {
		const digits = [0];
		for (let i = 0; i < buffer.length; i++) {
			let carry = buffer[i];
			for (let j = 0; j < digits.length; j++) {
				carry += digits[j] << 8;
				digits[j] = carry % 58;
				carry = (carry / 58) | 0;
			}
			while (carry > 0) {
				digits.push(carry % 58);
				carry = (carry / 58) | 0;
			}
		}
		for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
			digits.push(0);
		}
		return digits.reverse().map(d => BASE58_ALPHABET[d]).join('');
	}
	
	window.godotWalletInterface = {
		lastResult: null,
		lastError: null,
		isProcessing: false,
		pendingMessage: null,
		
		connectWallet: async function() {
			this.isProcessing = true;
			this.lastResult = null;
			this.lastError = null;
			
			try {
				if (!window.phantom || !window.phantom.solana) {
					const result = JSON.stringify({
						success: false,
						error: 'Phantom wallet not found. Please install Phantom wallet extension.'
					});
					this.lastResult = result;
					this.isProcessing = false;
					return result;
				}
				
				const resp = await window.phantom.solana.connect();
				const publicKey = resp.publicKey.toString();
				
				const result = JSON.stringify({
					success: true,
					walletAddress: publicKey
				});
				this.lastResult = result;
				this.isProcessing = false;
				return result;
			} catch (error) {
				const result = JSON.stringify({
					success: false,
					error: error.message
				});
				this.lastResult = result;
				this.lastError = error.message;
				this.isProcessing = false;
				return result;
			}
		},
		
		disconnectWallet: async function() {
			try {
				if (window.phantom && window.phantom.solana) {
					await window.phantom.solana.disconnect();
				}
				return JSON.stringify({ success: true });
			} catch (error) {
				return JSON.stringify({
					success: false,
					error: error.message
				});
			}
		},
		
		setPendingMessage: function(message) {
			this.pendingMessage = message;
		},
		
		signPendingMessage: async function() {
			this.isProcessing = true;
			this.lastResult = null;
			this.lastError = null;
			
			try {
				if (!window.phantom || !window.phantom.solana) {
					const result = JSON.stringify({
						success: false,
						error: 'Phantom wallet not found'
					});
					this.lastResult = result;
					this.isProcessing = false;
					return result;
				}
				
				if (!this.pendingMessage) {
					const result = JSON.stringify({
						success: false,
						error: 'No message to sign'
					});
					this.lastResult = result;
					this.isProcessing = false;
					return result;
				}
				
				const encodedMessage = new TextEncoder().encode(this.pendingMessage);
				const signedMessage = await window.phantom.solana.signMessage(encodedMessage);
				const signatureBase58 = base58Encode(signedMessage.signature);
				
				const result = JSON.stringify({
					success: true,
					signature: signatureBase58
				});
				this.lastResult = result;
				this.pendingMessage = null;
				this.isProcessing = false;
				return result;
			} catch (error) {
				const result = JSON.stringify({
					success: false,
					error: error.message
				});
				this.lastResult = result;
				this.lastError = error.message;
				this.pendingMessage = null;
				this.isProcessing = false;
				return result;
			}
		},
		
		isWalletConnected: function() {
			if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
				const publicKey = window.phantom.solana.publicKey?.toString();
				return JSON.stringify({
					connected: true,
					walletAddress: publicKey || ''
				});
			}
			return JSON.stringify({ connected: false });
		}
	};
	"""
	
	if OS.has_feature("web"):
		JavaScriptBridge.eval(js_code)
		print("✅ JavaScript wallet bridge initialized")

func connect_wallet():
	if not OS.has_feature("web"):
		print("⚠️ Wallet connection only available in web build")
		authentication_failed.emit("Web build required for wallet connection")
		return
	
	print("🔌 Attempting to connect wallet...")
	
	var interface_check = JavaScriptBridge.eval("typeof window.godotWalletInterface !== 'undefined'")
	if not interface_check:
		print("❌ Wallet interface not initialized")
		authentication_failed.emit("Wallet interface not ready")
		return
	
	var phantom_check = JavaScriptBridge.eval("!!(window.phantom && window.phantom.solana)")
	if not phantom_check:
		print("❌ Phantom wallet not detected")
		print("💡 Please install Phantom wallet extension")
		print("   Download from: https://phantom.app/download")
		authentication_failed.emit("Phantom wallet not found. Please install the extension.")
		return
	
	JavaScriptBridge.eval("window.godotWalletInterface.connectWallet()")
	await _wait_for_wallet_result()

func _wait_for_wallet_result():
	print("⏳ Waiting for wallet response...")
	
	var max_attempts = 100
	var attempts = 0
	
	while attempts < max_attempts:
		var is_processing = JavaScriptBridge.eval("window.godotWalletInterface.isProcessing")
		
		if not is_processing:
			var result = JavaScriptBridge.eval("window.godotWalletInterface.lastResult")
			
			if result != null and result != "":
				_process_wallet_connection(result)
				return
		
		attempts += 1
		await get_tree().create_timer(0.1).timeout
	
	print("❌ Wallet connection timeout")
	authentication_failed.emit("Wallet connection timeout")

func _process_wallet_connection(result):
	if result == null or result == "":
		print("❌ Wallet connection returned empty result")
		authentication_failed.emit("Phantom wallet not found. Please install the extension.")
		return
	
	var json = JSON.new()
	var parse_result = json.parse(result)
	
	if parse_result != OK:
		print("❌ Failed to parse wallet connection result")
		authentication_failed.emit("Failed to parse wallet response")
		return
	
	var data = json.data
	
	if data.success:
		wallet_address = data.walletAddress
		is_connected = true
		print("✅ Wallet connected: ", wallet_address)
		wallet_connected.emit(wallet_address)
		await _authenticate_with_server()
	else:
		print("❌ Wallet connection failed: ", data.error)
		authentication_failed.emit(data.error)

func disconnect_wallet():
	if not OS.has_feature("web"):
		return
	
	JavaScriptBridge.eval("window.godotWalletInterface.disconnectWallet()")
	is_connected = false
	wallet_address = ""
	auth_token = ""
	print("🔌 Wallet disconnected")
	wallet_disconnected.emit()

func _authenticate_with_server():
	print("🔐 Starting authentication with server...")
	print("   Wallet address: ", wallet_address)
	
	print("\n📡 Step 1: Requesting nonce...")
	var nonce = await ApiManager.get_nonce(wallet_address)
	if nonce == "":
		print("❌ Failed to get nonce from server")
		authentication_failed.emit("Failed to get nonce from server")
		return
	
	print("✅ Received nonce: ", nonce)
	
	print("\n✍️ Step 2: Signing message with wallet...")
	var message = "Login to monster-cocktail Marketplace" + char(10) + "Nonce: " + nonce
	print("   Message to sign: ", message.replace(char(10), "\\n"))
	
	var signature = await _sign_message(message)
	if signature == "":
		print("❌ Failed to sign message")
		authentication_failed.emit("Failed to sign message")
		return
	
	print("✅ Message signed successfully")
	print("   Signature length: ", signature.length())
	
	print("\n🔍 Step 3: Verifying signature with server...")
	var auth_result = await ApiManager.verify_signature(wallet_address, signature)
	
	if auth_result.has("token"):
		auth_token = auth_result.token
		print("✅ Authentication successful!")
		print("   Token received (length): ", auth_token.length())
		
		# Debug: print user data structure
		print("   User data keys: ", auth_result.get("user", {}).keys())
		print("   User data: ", auth_result.get("user", {}))
		
		UserManager.set_user_data(auth_result.user)
		UserManager.set_auth_token(auth_token)
		
		authentication_complete.emit(auth_result.user)
	else:
		print("❌ Server verification failed")
		print("   Response: ", auth_result)
		authentication_failed.emit("Server verification failed")

func _sign_message(message: String) -> String:
	if not OS.has_feature("web"):
		return ""
	
	# Set message via JSON to avoid escaping issues
	var message_json = JSON.stringify(message)
	JavaScriptBridge.eval("window.godotWalletInterface.setPendingMessage(" + message_json + ")")
	
	# Start signing
	JavaScriptBridge.eval("window.godotWalletInterface.signPendingMessage()")
	
	var max_attempts = 100
	var attempts = 0
	
	while attempts < max_attempts:
		var is_processing = JavaScriptBridge.eval("window.godotWalletInterface.isProcessing")
		
		if not is_processing:
			var result = JavaScriptBridge.eval("window.godotWalletInterface.lastResult")
			
			if result == null or result == "":
				print("❌ Sign message returned empty result")
				return ""
			
			var json = JSON.new()
			var parse_result = json.parse(result)
			
			if parse_result == OK:
				var data = json.data
				if data.has("success") and data.success:
					if data.has("signature"):
						return data.signature
					else:
						print("❌ No signature in response")
						return ""
				else:
					var error_msg = data.get("error", "Unknown error")
					print("❌ Signing failed: ", error_msg)
					return ""
			else:
				print("❌ Failed to parse sign result")
				return ""
		
		attempts += 1
		await get_tree().create_timer(0.1).timeout
	
	print("❌ Sign message timeout")
	return ""

func check_wallet_status():
	if not OS.has_feature("web"):
		return
	
	var result = JavaScriptBridge.eval("window.godotWalletInterface.isWalletConnected()")
	
	var json = JSON.new()
	var parse_result = json.parse(result)
	
	if parse_result == OK:
		var data = json.data
		if data.connected:
			wallet_address = data.walletAddress
			is_connected = true
			print("ℹ️ Wallet already connected: ", wallet_address)

func get_wallet_address() -> String:
	return wallet_address

func is_wallet_connected() -> bool:
	return is_connected

func get_auth_token() -> String:
	return auth_token

func mint_tokens(token_type: String) -> Dictionary:
	"""
	Мінтує токени для підключеного гаманця.
	
	Параметри:
	- token_type: "APPLE_JUICE", "ORANGE_JUICE", або "GRAPE_SODA"
	
	Повертає: Dictionary з результатом операції
	"""
	if not is_connected:
		print("❌ Wallet not connected")
		return {"success": false, "error": "Wallet not connected"}
	
	if auth_token == "":
		print("❌ Not authenticated")
		return {"success": false, "error": "Not authenticated"}
	
	print("🪙 Minting tokens: ", token_type)
	var result = await ApiManager.mint_tokens(auth_token, token_type)
	return result
