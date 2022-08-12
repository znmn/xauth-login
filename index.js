class configError extends Error {
	constructor(message) {
		super(message);
		this.name = "configError";
	}
}

function objToParam(obj) {
	return new URLSearchParams(obj).toString();
}

function uriParamToObj(uri) {
	return JSON.parse('{"' + decodeURI(uri.replace(/&/g, '","').replace(/=/g, '":"')) + '"}');
}

class Twitter {
	#options;
	#config;
	#oauth;
	#baseString;

	static xauthLogin({ appKey, appSecret, username, password } = {}) {
		if (typeof appKey !== "string" || typeof appSecret !== "string" || typeof username !== "string" || typeof password !== "string") {
			throw new configError("Bad config");
		}

		const fetch = require("node-fetch");

		const options = {
			url: "https://api.twitter.com/oauth/access_token",
			method: "POST",
			data: {
				x_auth_mode: "client_auth",
				x_auth_password: password,
				x_auth_username: username,
			},
		};

		const config = {
			consumerKey: appKey,
			consumerSecret: appSecret,
		};

		const twitter = new Twitter({ options, config });

		const oauthHeader = twitter.#createOAuthHeader();

		const fetchOpts = {
			method: options.method,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: oauthHeader,
			},
			body: objToParam(options.data),
		};

		return new Promise((resolve, reject) => {
			fetch(options.url, fetchOpts)
				.then((res) => res.text())
				.then((text) => {
					if (text.includes("&")) {
						text = uriParamToObj(text);
					}
					resolve(text);
				})
				.catch((err) => reject(err));
		});
	}

	constructor({ options, config } = {}) {
		this.#options = options;
		this.#config = config;
	}

	#createSign() {
		const crypto = require("crypto");
		return crypto
			.createHmac("sha1", encodeURIComponent(this.#config.consumerSecret) + "&")
			.update(this.#baseString)
			.digest("base64");
	}

	#createBaseString() {
		return [this.#options.method, this.#options.url, objToParam(this.#oauth) + "&" + objToParam(this.#options.data)].map(encodeURIComponent).join("&");
	}

	#createOAuthHeader() {
		const timestamp = Math.floor(Date.now() / 1000);
		this.#oauth = {
			oauth_consumer_key: this.#config.consumerKey,
			oauth_nonce: timestamp.toString(),
			oauth_signature_method: "HMAC-SHA1",
			oauth_timestamp: timestamp,
			oauth_version: "1.0a",
		};
		this.#baseString = this.#createBaseString();
		const signature = this.#createSign();
		const oauthHeader = Object.keys(this.#oauth)
			.map((key) => `${key}="${this.#oauth[key]}"`)
			.join(",");
		return `OAuth ${oauthHeader}, oauth_signature="${encodeURIComponent(signature)}"`;
	}
}

module.exports = Twitter;
