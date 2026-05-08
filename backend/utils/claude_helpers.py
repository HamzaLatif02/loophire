def cached_text_block(text: str) -> dict:
    return {"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}


def uncached_text_block(text: str) -> dict:
    return {"type": "text", "text": text}


def cached_system_prompt(prompt: str) -> list:
    return [{"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}]


def log_cache_stats(logger, agent_name: str, usage) -> None:
    logger.info(
        "%s cache stats — input: %d tokens, cache_creation: %d tokens, "
        "cache_read: %d tokens, output: %d tokens",
        agent_name,
        usage.input_tokens,
        getattr(usage, "cache_creation_input_tokens", 0),
        getattr(usage, "cache_read_input_tokens", 0),
        usage.output_tokens,
    )
