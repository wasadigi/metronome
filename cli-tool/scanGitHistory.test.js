const initializeTestRepository = require("./initializeTestRepository");
const scanGitHistory = require("./scanGitHistory");

let repo;
beforeEach(() => {
  repo = initializeTestRepository();
});

afterEach(() => {
  repo.destroy();
});

test("does nothing for repository without matching commits", async () => {
  repo.commit("first commit");
  repo.commit("second commit");
  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);
  expect(onCommit.mock.calls.length).toBe(0);
});

test("triggers callback for commits with [meter-readings:...] in their subject", async () => {
  repo.commit("metered commit [meter-readings:prod]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(1);
  const parsedCommit = onCommit.mock.calls[0][0];

  expect(parsedCommit.type).toEqual("readings");
  expect(parsedCommit.branch).toEqual("prod");
  expect(parsedCommit.sha).toMatch(/[0-9a-f]{40}/);
  expect(parsedCommit.date).toBeTruthy();
});

test("triggers callback for commits with [meter-readings] in their body", async () => {
  repo.commit("metered commit\n\n[meter-readings:test]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(1);
  const parsedCommit = onCommit.mock.calls[0][0];

  expect(parsedCommit.type).toEqual("readings");
  expect(parsedCommit.branch).toEqual("test");
  expect(parsedCommit.sha).toMatch(/[0-9a-f]{40}/);
  expect(parsedCommit.date).toBeTruthy();
});

test("fetches file path and content for [meter-readings] commits", async () => {
  repo.commit("[meter-readings:prod]", { contents: "file content" });

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(1);
  const parsedCommit = onCommit.mock.calls[0][0];

  expect(parsedCommit.type).toEqual("readings");
  expect(parsedCommit.path).toEqual("file");
  expect(parsedCommit.content).toEqual("file content");
});

test("triggers callback for commits with [meter-expect: ...] in their body", async () => {
  repo.commit("commit [meter-expect: some assumption text]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(1);
  const parsedCommit = onCommit.mock.calls[0][0];

  expect(parsedCommit.type).toEqual("expectations");
  expect(parsedCommit.sha).toMatch(/[0-9a-f]{40}/);
  expect(parsedCommit.author).toEqual("everzet");
  expect(parsedCommit.expectations).toEqual(["some assumption text"]);
  expect(parsedCommit.date).toBeTruthy();
});

test("handles commits with multiple expectations", async () => {
  repo.commit("commit\n\n[meter-expect:one]\n[meter-expect:two]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(1);
  const parsedCommit = onCommit.mock.calls[0][0];

  expect(parsedCommit.expectations).toEqual(["one", "two"]);
});

test("commits are processed in chronological (reverse for git log) order", async () => {
  repo.commit("commit [meter-expect:one]");
  repo.commit("commit [meter-expect:two]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls.length).toBe(2);
  expect(onCommit.mock.calls[0][0].expectations).toEqual(["one"]);
  expect(onCommit.mock.calls[1][0].expectations).toEqual(["two"]);
});

test("whitespace is removed from branch and expectations", async () => {
  repo.commit("commit [meter-expect:  one ]");
  repo.commit("commit [meter-readings: prod  ]");

  const onCommit = jest.fn(async () => null);
  await scanGitHistory(repo.path, onCommit);

  expect(onCommit.mock.calls[0][0].expectations).toEqual(["one"]);
  expect(onCommit.mock.calls[1][0].branch).toEqual("prod");
});
