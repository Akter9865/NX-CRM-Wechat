import { describe, expect, it } from "vitest";
import {
  confirmOptimistic,
  mergeStatus,
  messageKey,
  upsertServerMessage,
  type ThreadMessage,
} from "./messages";
import { customerWindowState, lastCustomerMessageAt, CUSTOMER_WINDOW_MS } from "./session-window";

const base = (over: Partial<ThreadMessage>): ThreadMessage => ({
  id: "m1",
  conversation_id: "c1",
  sender_type: "agent",
  content_type: "text",
  content_text: "hello",
  status: "sent",
  created_at: "2026-01-01T10:00:00.000Z",
  ...over,
});

describe("mergeStatus", () => {
  it("never regresses ticks", () => {
    expect(mergeStatus("read", "sent")).toBe("read");
    expect(mergeStatus("sent", "delivered")).toBe("delivered");
  });
  it("lets a server failure win and a server row clear a client failure", () => {
    expect(mergeStatus("delivered", "failed")).toBe("failed");
    expect(mergeStatus("failed", "sent")).toBe("sent");
  });
});

describe("upsertServerMessage", () => {
  it("reconciles a realtime INSERT with the pending optimistic bubble (no duplicate)", () => {
    const temp = base({ id: "temp-1", client_key: "temp-1", status: "sending" });
    const list = [base({ id: "old", sender_type: "customer", created_at: "2026-01-01T09:00:00Z" }), temp];
    const next = upsertServerMessage(list, base({ id: "real", message_id: "wamid.1" }));
    expect(next).toHaveLength(2);
    expect(next[1].id).toBe("real");
    // key stays the temp id so React doesn't remount the bubble
    expect(messageKey(next[1])).toBe("temp-1");
    expect(next[1].status).toBe("sent");
  });

  it("does not match an optimistic bubble with different text", () => {
    const temp = base({ id: "temp-1", client_key: "temp-1", status: "sending", content_text: "a" });
    const next = upsertServerMessage([temp], base({ id: "bot", content_text: "b" }));
    expect(next).toHaveLength(2);
  });

  it("dedupes by wamid and returns the same array when nothing changed", () => {
    const row = base({ id: "real", message_id: "wamid.1", status: "read" });
    const list = [row];
    expect(upsertServerMessage(list, { ...row })).toBe(list);
    const updated = upsertServerMessage(list, { ...row, id: "real", status: "sent" });
    expect(updated).toBe(list); // "sent" must not regress "read"
  });

  it("inserts out-of-order rows by created_at", () => {
    const list = [base({ id: "a", created_at: "2026-01-01T10:00:00Z" }), base({ id: "c", created_at: "2026-01-01T12:00:00Z" })];
    const next = upsertServerMessage(list, base({ id: "b", content_text: "x", created_at: "2026-01-01T11:00:00Z" }));
    expect(next.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("confirmOptimistic", () => {
  it("attaches the server id when the API answers first", () => {
    const temp = base({ id: "temp-1", client_key: "temp-1", status: "sending" });
    const next = confirmOptimistic([temp], "temp-1", { id: "real", message_id: "wamid.9" });
    expect(next[0]).toMatchObject({ id: "real", message_id: "wamid.9", status: "sent", client_key: "temp-1" });
    // the late realtime INSERT then merges by id
    const after = upsertServerMessage(next, base({ id: "real", message_id: "wamid.9", status: "delivered" }));
    expect(after).toHaveLength(1);
    expect(after[0].status).toBe("delivered");
  });

  it("drops the temp bubble if a separate server row already exists", () => {
    const temp = base({ id: "temp-1", client_key: "temp-1", status: "sending", content_text: "x" });
    const server = base({ id: "real", content_text: "x " /* heuristics may miss */, content_type: "interactive" });
    const next = confirmOptimistic([server, temp], "temp-1", { id: "real" });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("real");
  });
});

describe("customer window", () => {
  it("uses the newer of the column and loaded inbound messages", () => {
    const at = lastCustomerMessageAt(
      { last_customer_message_at: "2026-01-01T00:00:00Z" } as never,
      [{ sender_type: "customer", created_at: "2026-01-02T00:00:00Z" }],
    );
    expect(at).toBe(Date.parse("2026-01-02T00:00:00Z"));
  });

  it("is expired after 24h and unknown (open) when history is partial", () => {
    const now = Date.parse("2026-01-03T00:00:01Z");
    expect(customerWindowState(Date.parse("2026-01-02T00:00:00Z"), now, true).expired).toBe(true);
    expect(customerWindowState(now - CUSTOMER_WINDOW_MS + 1000, now, true).expired).toBe(false);
    expect(customerWindowState(null, now, false).expired).toBe(false);
    expect(customerWindowState(null, now, true)).toMatchObject({ expired: true, neverMessaged: true });
  });
});
