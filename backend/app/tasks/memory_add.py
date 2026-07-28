async def add_memory(ctx, query, user_id):
    memory = ctx["memory"]
    result = await memory.add([{"role": "user", "content": query}], user_id=user_id)
    print(result)
