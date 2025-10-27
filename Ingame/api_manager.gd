# api_manager.gd
# Autoload singleton for handling all API requests
extends Node

const BASE_URL = "https://api.monster-cocktail.com"

var http_client: HTTPRequest

signal request_completed(result: Dictionary)
signal request_failed(error: String)

func _ready():
	print("🌐 APIManager initialized")
	http_client = HTTPRequest.new()
	add_child(http_client)
	http_client.request_completed.connect(_on_http_request_completed)

# Store the current callback for request completion
var current_callback: Callable

# POST /api/auth/nonce
func get_nonce(wallet_address: String) -> String:
	print("📡 Requesting nonce for wallet: ", wallet_address)
	
	var url = BASE_URL + "/auth/nonce"
	var headers = ["Content-Type: application/json"]
	var body = JSON.stringify({"walletAddress": wallet_address})
	
	var error = http_client.request(url, headers, HTTPClient.METHOD_POST, body)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return ""
	
	# Wait for response
	var response = await request_completed
	
	if response.has("nonce"):
		return response.nonce
	else:
		print("❌ No nonce in response")
		return ""

# POST /api/auth/verify
func verify_signature(wallet_address: String, signature: String) -> Dictionary:
	print("📡 Verifying signature for wallet: ", wallet_address)
	
	var url = BASE_URL + "/auth/verify"
	var headers = ["Content-Type: application/json"]
	var body = JSON.stringify({
		"walletAddress": wallet_address,
		"signature": signature
	})
	
	var error = http_client.request(url, headers, HTTPClient.METHOD_POST, body)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return {}
	
	# Wait for response
	var response = await request_completed
	return response

# GET /api/auth/me
func get_user_info(auth_token: String) -> Dictionary:
	print("📡 Fetching user info")
	
	var url = BASE_URL + "/auth/me"
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer " + auth_token
	]
	
	var error = http_client.request(url, headers, HTTPClient.METHOD_GET)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return {}
	
	# Wait for response
	var response = await request_completed
	return response

# POST /api/tokens/mint
func mint_tokens(auth_token: String, token_type: String) -> Dictionary:
	print("📡 Minting tokens: ", token_type)
	
	var url = BASE_URL + "/tokens/mint"
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer " + auth_token
	]
	var body = JSON.stringify({"tokenType": token_type})
	
	var error = http_client.request(url, headers, HTTPClient.METHOD_POST, body)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return {}
	
	# Wait for response
	var response = await request_completed
	return response

# Alias for backward compatibility
func claim_tokens(auth_token: String, token_type: String) -> Dictionary:
	return await mint_tokens(auth_token, token_type)

# GET /api/tokens/balance/:walletAddress
func get_token_balance(wallet_address: String) -> Dictionary:
	print("📡 Fetching token balance for: ", wallet_address)
	
	var url = BASE_URL + "/tokens/balance/" + wallet_address
	var headers = ["Content-Type: application/json"]
	
	var error = http_client.request(url, headers, HTTPClient.METHOD_GET)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return {}
	
	# Wait for response
	var response = await request_completed
	return response

func _on_http_request_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
	print("📬 HTTP Request completed - Code: ", response_code)
	
	if result != HTTPRequest.RESULT_SUCCESS:
		print("❌ Request failed with result code: ", result)
		request_failed.emit("HTTP request failed")
		request_completed.emit({})
		return
	
	if response_code != 200:
		print("❌ Server returned error code: ", response_code)
		request_failed.emit("Server error: " + str(response_code))
		request_completed.emit({})
		return
	
	var json_string = body.get_string_from_utf8()
	print("📦 Response body: ", json_string)
	
	var json = JSON.new()
	var parse_result = json.parse(json_string)
	
	if parse_result != OK:
		print("❌ Failed to parse JSON response")
		request_failed.emit("Invalid JSON response")
		request_completed.emit({})
		return
	
	var data = json.data
	print("✅ Parsed response data")
	request_completed.emit(data)

# Helper function to make authenticated requests
func make_authenticated_request(endpoint: String, method: HTTPClient.Method, body_data: Dictionary = {}) -> Dictionary:
	var auth_token = UserManager.get_auth_token()
	
	if auth_token == "":
		print("❌ No auth token available")
		return {}
	
	var url = BASE_URL + endpoint
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer " + auth_token
	]
	
	var body = ""
	if not body_data.is_empty():
		body = JSON.stringify(body_data)
	
	var error = http_client.request(url, headers, method, body)
	
	if error != OK:
		print("❌ HTTP Request failed: ", error)
		return {}
	
	var response = await request_completed
	return response
