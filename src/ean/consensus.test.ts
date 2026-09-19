import { describe, expect, it } from "vite-plus/test";

import { DetectionConsensus } from "./consensus";

const detection = { format: "EAN-13" as const, value: "4901234567894" };

describe("DetectionConsensus", () => {
  it("1フレーム内で2本の走査線が一致すれば確定する", () => {
    const consensus = new DetectionConsensus();

    expect(consensus.add([detection, detection], 100)).toEqual(detection);
  });

  it("直近の3フレームで同じ結果がそろえば確定する", () => {
    const consensus = new DetectionConsensus();

    expect(consensus.add([detection], 100)).toBeNull();
    expect(consensus.add([detection], 400)).toBeNull();
    expect(consensus.add([detection], 700)).toEqual(detection);
  });
});
