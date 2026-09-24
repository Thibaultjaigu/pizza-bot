/** Records in graph state whether the orchestrator's last turn ended at the token limit with no visible text. */
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";
import { z } from "zod";
import { TRUNCATED_TURN_CHANNEL } from "@pizza-bot/core";
import { reachedOutputLimit } from "./output-truncation-middleware.js";

const stateSchema = z.object({
  [TRUNCATED_TURN_CHANNEL]: z.boolean().optional(),
});

/**
 * Graph state, not a synthesized protocol frame: LangGraph's own `values`
 * snapshot replaces the whole state object on the client, so a flag that is
 * not part of the state is erased by the next snapshot. State also lands in
 * the checkpoint, so the notice survives a reload. Reset at run start so a
 * run that never completes a model call (stopped, or the model-call ceiling
 * already spent) cannot inherit the previous run's flag.
 */
export function truncatedTurnMiddleware() {
  return createMiddleware({
    name: "truncatedTurn",
    stateSchema,
    beforeAgent: () => ({ [TRUNCATED_TURN_CHANNEL]: false }),
    afterModel: (state) => ({
      [TRUNCATED_TURN_CHANNEL]: isTruncatedTurn(state.messages.at(-1)),
    }),
  });
}

export function isTruncatedTurn(message: BaseMessage | undefined): boolean {
  if (!message || !AIMessage.isInstance(message)) return false;
  // A length-limited tool call still routes to the tool; only a turn with no
  // visible reply and nothing to execute leaves the user with a blank turn.
  if (message.tool_calls?.length) return false;
  return reachedOutputLimit(message) && !hasVisibleText(message);
}

function hasVisibleText(message: AIMessage): boolean {
  if (typeof message.content === "string") return message.content.trim().length > 0;
  return message.content.some(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      block.type === "text" &&
      typeof block.text === "string" &&
      block.text.trim().length > 0,
  );
}
