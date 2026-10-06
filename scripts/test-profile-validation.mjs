import assert from "node:assert/strict";
import { ageFromBirthDate, readProfile } from "../lib/profile.ts";
function form(overrides = {}) {
  const data = new FormData();
  const values = { display_name: "Pessoa", birth_date: "1995-02-01", city: "Caxias do Sul", state: "RS", ...overrides };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
assert.deepEqual(readProfile(form()).objectives, []);
assert.deepEqual(readProfile(form()).interests, []);
assert.equal(ageFromBirthDate("2008-10-07", new Date("2026-10-06T12:00:00Z")), 17);
assert.equal(ageFromBirthDate("2008-10-06", new Date("2026-10-06T12:00:00Z")), 18);
assert.throws(() => readProfile(form({ birth_date: "2025-02-01" })));
assert.throws(() => readProfile(form({ birth_date: "2000-02-31" })));
assert.throws(() => readProfile(form({ about: "a".repeat(501) })));
assert.throws(() => readProfile(form({ state: "XX" })));
const malicious = form();
malicious.append("interests", "Inventado");
assert.throws(() => readProfile(malicious));
console.log("PASS: idade, data válida, limites de texto, estado e campos opcionais.");
