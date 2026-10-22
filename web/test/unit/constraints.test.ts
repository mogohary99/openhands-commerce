import assert from "node:assert/strict";
import { test } from "node:test";
import { parseShoppingFor, shoppingForFromForm, wordsToNumber } from "../../lib/constraints";

test("demo request: USB-C phone, charger with cable, forty-five dollars all in", () => {
  assert.deepEqual(parseShoppingFor("My phone uses USB-C. I need a charger with a cable, forty-five dollars all in."), {
    category: "chargers",
    budgetCents: 4500,
    deviceConnector: "USB-C",
    voiceLanguage: null,
    wantsCable: true,
  });
});

test("budget formats", () => {
  assert.equal(parseShoppingFor("under $45").budgetCents, 4500);
  assert.equal(parseShoppingFor("about 39.50 dollars").budgetCents, 3950);
  assert.equal(parseShoppingFor("less than 60").budgetCents, 6000);
  assert.equal(parseShoppingFor("one hundred twenty bucks").budgetCents, 12000);
  assert.equal(parseShoppingFor("a charger please").budgetCents, null);
});

test("connector: what the device uses wins over what to avoid", () => {
  assert.equal(parseShoppingFor("my phone uses USB-C, not lightning").deviceConnector, "USB-C");
  assert.equal(parseShoppingFor("I have a lightning iPhone").deviceConnector, "Lightning");
  assert.equal(parseShoppingFor("type-c please").deviceConnector, "USB-C");
  assert.equal(parseShoppingFor("usb c or lightning, not sure").deviceConnector, null);
});

test("language and category", () => {
  assert.deepEqual(parseShoppingFor("talking kitchen scale in Spanish"), { category: "kitchen", budgetCents: null, deviceConnector: null, voiceLanguage: "es", wantsCable: false });
  assert.equal(parseShoppingFor("headphones for music").category, "audio");
});

test("wordsToNumber", () => {
  assert.equal(wordsToNumber("forty-five"), 45);
  assert.equal(wordsToNumber("a hundred"), 100);
  assert.equal(wordsToNumber("banana"), null);
});

test("form input is validated, unknown values dropped", () => {
  assert.deepEqual(shoppingForFromForm({ category: "chargers", budget: "$45.00", connector: "USB-C", language: "", cable: "yes" }), {
    category: "chargers",
    budgetCents: 4500,
    deviceConnector: "USB-C",
    voiceLanguage: null,
    wantsCable: true,
  });
  assert.deepEqual(shoppingForFromForm({ category: "drop table", budget: "-5", connector: "HDMI", language: "fr" }), {
    category: null,
    budgetCents: null,
    deviceConnector: null,
    voiceLanguage: null,
    wantsCable: false,
  });
});
