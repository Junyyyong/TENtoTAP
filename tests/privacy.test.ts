import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const privacy = readFileSync(new URL("../public/privacy.html", import.meta.url), "utf8");

describe("public privacy contact", () => {
  it.each(["english", "korean"])("uses the owner-confirmed address throughout %s", (language) => {
    const section = privacy.match(new RegExp(`<section id="${language}"[^>]*>([\\s\\S]*?)</section>`))?.[1];
    expect(section).toBeDefined();
    const contacts = section!.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
    expect(contacts).toEqual(["wnsdydtml@gmail.com", "wnsdydtml@gmail.com"]);
  });
});
