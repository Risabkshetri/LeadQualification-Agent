import asyncio
from db import async_session
from sqlalchemy import text

async def alter_table():
    async with async_session() as session:
        try:
            await session.execute(text("ALTER TABLE leads ADD COLUMN source_file VARCHAR;"))
            await session.commit()
            print("Successfully added source_file column to leads table.")
        except Exception as e:
            print("Column may already exist or error occurred:", e)

if __name__ == "__main__":
    asyncio.run(alter_table())
