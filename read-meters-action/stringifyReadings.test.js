const stringifyReadings = require("./stringifyReadings");

test("properly stringifies different reading types", () => {
  expect(stringifyReadings({ reading: 42 })).toMatch(/reading = 42/);
  expect(stringifyReadings({ reading: 42.3 })).toMatch(/reading = 42.3/);
  expect(stringifyReadings({ reading: true })).toMatch(/reading = true/);
  expect(stringifyReadings({ reading: false })).toMatch(/reading = false/);
  expect(stringifyReadings({ reading: "str" })).toMatch(/reading = "str"/);
});

test("null and undefined readings are ignored", () => {
  expect(stringifyReadings({ reading: null })).not.toMatch(/reading =/);
  expect(stringifyReadings({ reading: undefined })).not.toMatch(/reading =/);
});

test("readings stringified in consistent order", () => {
  const string1 = stringifyReadings({
    reading2: 2,
    reading1: 1,
    reading3: 5,
  });
  const string2 = stringifyReadings({
    reading1: 1,
    reading3: 5,
    reading2: 2,
  });
  const string3 = stringifyReadings({
    reading1: 1,
    reading2: 2,
    reading3: 5,
  });
  expect(string1).toEqual(string2);
  expect(string2).toEqual(string3);
});

test("prepends autogeneration note", () => {
  expect(stringifyReadings({})).toMatch(/^# FILE IS AUTOGENERATED\n\n/);
});