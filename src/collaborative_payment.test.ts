import { strict as assert } from "node:assert";
import { riskDecision } from "./collaborative_payment.ts";

assert.equal(riskDecision({ amount: 1250, currency: "USD" }), "allow");
assert.equal(riskDecision({ amount: 10000, currency: "USD" }), "review");
assert.equal(riskDecision({ amount: 1250, currency: "EUR" }), "review");
console.log("risk decision checks passed");
