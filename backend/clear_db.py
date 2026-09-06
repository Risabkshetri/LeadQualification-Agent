import asyncio
from db import async_session
from models import LeadDB
from sqlalchemy import delete

async def clear_leads():
    async with async_session() as session:
        await session.execute(delete(LeadDB))
        await session.commit()
    print("All leads have been deleted from the database.")

if __name__ == "__main__":
    asyncio.run(clear_leads())
