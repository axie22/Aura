"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var webhooks_methods_1 = require("@octokit/webhooks-methods");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var PORT = process.env.PORT || 3000;
var SECRET = process.env.WEBHOOK_SECRET || "";
if (!SECRET) {
    console.error('Error: WEBHOOK_SECRET is not defined in .env');
    process.exit(1);
}
// Mock Payload matching a minimal pull_request.synchronize event
var payload = {
    action: 'synchronize',
    pull_request: {
        number: 1,
        title: 'Test PR',
        head: { sha: 'abcdef123456' },
        base: { sha: '123456abcdef' },
    },
    repository: {
        name: 'Aura',
        owner: { login: 'alexanderxie' }, // Replace with your username if needed
    },
    installation: {
        id: 12345, // Fake Installation ID
    },
};
var payloadString = JSON.stringify(payload);
function sendWebhook() {
    return __awaiter(this, void 0, void 0, function () {
        var signature, response, text, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Signing payload with secret: ".concat(SECRET.slice(0, 4), "..."));
                    return [4 /*yield*/, (0, webhooks_methods_1.sign)(SECRET, payloadString)];
                case 1:
                    signature = _a.sent();
                    console.log("Sending webhook to http://localhost:".concat(PORT, "/webhooks..."));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, fetch("http://localhost:".concat(PORT, "/webhooks"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-hub-signature-256': signature,
                                'x-github-event': 'pull_request',
                            },
                            body: payloadString,
                        })];
                case 3:
                    response = _a.sent();
                    return [4 /*yield*/, response.text()];
                case 4:
                    text = _a.sent();
                    console.log("Response Status: ".concat(response.status));
                    console.log("Response Body: ".concat(text));
                    if (response.ok) {
                        console.log('✅ Webhook delivered successfully!');
                    }
                    else {
                        console.error('❌ Webhook failed.');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('❌ Connection failed:', error_1.message);
                    console.log('Make sure the server is running with "npm run dev"');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
sendWebhook();
