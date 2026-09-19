import configuration from "./configuration";

describe("configuration port resolution", () => {
  const originalPort = process.env.PORT;
  const originalApiPort = process.env.API_PORT;

  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;

    if (originalApiPort === undefined) delete process.env.API_PORT;
    else process.env.API_PORT = originalApiPort;
  });

  it("prefers PORT when both PORT and API_PORT are set", () => {
    process.env.PORT = "10000";
    process.env.API_PORT = "4000";

    expect(configuration().port).toBe(10000);
  });

  it("supports the legacy API_PORT when PORT is not set", () => {
    delete process.env.PORT;
    process.env.API_PORT = "5000";

    expect(configuration().port).toBe(5000);
  });

  it("falls back to 4000 when neither port variable is set", () => {
    delete process.env.PORT;
    delete process.env.API_PORT;

    expect(configuration().port).toBe(4000);
  });
});
