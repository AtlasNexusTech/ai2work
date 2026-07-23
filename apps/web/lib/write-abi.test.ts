import assert from "node:assert/strict";
import test from "node:test";

import { coreWriteAbi } from "./write-abi";

test("postBounty ABI matches the deployed AI2WorkCore contract", () => {
  const fn = coreWriteAbi.find(
    (entry) => entry.type === "function" && entry.name === "postBounty"
  );

  assert.ok(fn && "inputs" in fn);
  assert.deepEqual(
    fn.inputs.map((input) => [input.name, input.type]),
    [
      ["token", "address"],
      ["bountyType", "uint8"],
      ["targetRepoUrl", "string"],
      ["instructionUrl", "string"],
      ["requirementsHash", "bytes32"],
      ["amount", "uint96"],
      ["maxSlots", "uint8"],
      ["stake", "uint96"],
      ["deadline", "uint64"],
      ["ciRequired", "bool"],
    ]
  );
});
