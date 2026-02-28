export function toTextResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
  };
}

export function toErrorResult(message) {
  return {
    isError: true,
    content: [{ type: "text", text: message }]
  };
}
