import test from "node:test";
import assert from "node:assert/strict";
import { buildCsvGuestTemplate, parseCsvGuestRows, validateAttendeeQuestionAnswers, type BookingQuestion } from "../src/index.ts";

const SAMPLE_QUESTIONS: BookingQuestion[] = [
  { id: "q_ig", eventId: "evt_1", label: "Instagram Handle", fieldType: "SHORT_TEXT", options: [], required: true, sortOrder: 0 },
  { id: "q_diet", eventId: "evt_1", label: "Meal Preference", fieldType: "DROPDOWN", options: ["Veg", "Vegan"], required: true, sortOrder: 1 },
  { id: "q_zones", eventId: "evt_1", label: "Zones", fieldType: "MULTI_CHOICE", options: ["Main Stage", "VIP Lounge", "Backstage"], required: false, sortOrder: 2 },
  { id: "q_age", eventId: "evt_1", label: "Age", fieldType: "NUMBER", options: [], required: false, sortOrder: 3 },
  { id: "q_rules", eventId: "evt_1", label: "Rules Accepted", fieldType: "CHECKBOX", options: [], required: true, sortOrder: 4 }
];

test("parseCsvGuestRows maps question IDs, labels, quoted commas, multi-choice, and checkboxes", () => {
  const csv = [
    "name,email,phone,tier,type,Instagram Handle,q:q_diet,Zones,Age,Rules Accepted",
    '"Rao, Asha",asha@example.com,9876500099,,VIP,@asha.rao,Veg,"VIP Lounge, Backstage",26,yes'
  ].join("\n");

  const parsed = parseCsvGuestRows(csv, SAMPLE_QUESTIONS);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]!.fullName, "Rao, Asha");
  assert.equal(parsed.rows[0]!.rawAnswers.q_ig, "@asha.rao");
  assert.equal(parsed.rows[0]!.rawAnswers.q_diet, "Veg");
  assert.deepEqual(parsed.rows[0]!.rawAnswers.q_zones, ["VIP Lounge", "Backstage"]);
  assert.equal(parsed.rows[0]!.rawAnswers.q_age, 26);
  assert.equal(parsed.rows[0]!.rawAnswers.q_rules, true);

  const check = validateAttendeeQuestionAnswers(SAMPLE_QUESTIONS, parsed.rows[0]!.rawAnswers, parsed.rows[0]!.fullName);
  assert.equal(check.valid, true);
});

test("buildCsvGuestTemplate includes standard and custom question headers", () => {
  const tpl = buildCsvGuestTemplate(SAMPLE_QUESTIONS);
  const firstLine = tpl.split("\n")[0]!;
  assert.ok(firstLine.includes("name,email,phone,tier,type,Instagram Handle,Meal Preference,Zones,Age,Rules Accepted"));
});
