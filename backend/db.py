from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, or_, delete
from models import Base, LeadDB
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

async def save_lead(lead_data: dict, result: dict) -> LeadDB:
    async with async_session() as session:
        new_lead = LeadDB(
            source=lead_data.get("source", "FORM"),
            source_file=lead_data.get("source_file"),
            name=lead_data["name"],
            email=lead_data["email"],
            company=lead_data["company"],
            job_title=lead_data["job_title"],
            company_size=lead_data["company_size"],
            budget=lead_data["budget"],
            message=lead_data["message"],
            bant_score=result.get("bant_score"),
            
            budget_score=result.get("budget_score"),
            budget_confidence=result.get("budget_confidence"),
            budget_evidence=result.get("budget_evidence"),
            
            authority_score=result.get("authority_score"),
            authority_confidence=result.get("authority_confidence"),
            authority_evidence=result.get("authority_evidence"),
            
            need_score=result.get("need_score"),
            need_confidence=result.get("need_confidence"),
            need_evidence=result.get("need_evidence"),
            
            timeline_score=result.get("timeline_score"),
            timeline_confidence=result.get("timeline_confidence"),
            timeline_evidence=result.get("timeline_evidence"),
            
            tier=result.get("tier"),
            research_summary=result.get("research_summary"),
            reasoning=result.get("reasoning"),
            recommendation=result.get("recommendation"),
            suggested_action=result.get("suggested_action")
        )
        session.add(new_lead)
        await session.commit()
        await session.refresh(new_lead)
        return new_lead

async def get_all_leads(tier: str = None, source: str = None, search: str = None, source_file: str = None, action_status: str = None, skip: int = 0, limit: int = 10):
    async with async_session() as session:
        query = select(LeadDB)
        
        if tier and tier != "ALL":
            if tier == "HOT":
                query = query.where(LeadDB.tier.in_(["HOT", "HOT - Verify"]))
            else:
                query = query.where(LeadDB.tier == tier)
        if source and source != "All Sources":
            query = query.where(LeadDB.source == source.upper())
        if source_file and source_file != "All Files":
            query = query.where(LeadDB.source_file == source_file)
        if action_status and action_status != "All Actions":
            query = query.where(LeadDB.action_status == action_status)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    LeadDB.name.ilike(search_term),
                    LeadDB.company.ilike(search_term)
                )
            )
            
        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query)
            
        query = query.order_by(LeadDB.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await session.execute(query)
        return {"leads": result.scalars().all(), "total": total or 0}

async def get_stats():
    async with async_session() as session:
        total = await session.scalar(select(func.count()).select_from(LeadDB))
        hot = await session.scalar(select(func.count()).select_from(LeadDB).where(LeadDB.tier.in_(["HOT", "HOT - Verify"])))
        warm = await session.scalar(select(func.count()).select_from(LeadDB).where(LeadDB.tier == "WARM"))
        cold = await session.scalar(select(func.count()).select_from(LeadDB).where(LeadDB.tier == "COLD"))
        unqualified = await session.scalar(select(func.count()).select_from(LeadDB).where(LeadDB.tier == "UNQUALIFIED"))
        
        return {
            "total": total or 0,
            "hot": hot or 0,
            "warm": warm or 0,
            "cold": cold or 0,
            "unqualified": unqualified or 0
        }

async def get_imported_files():
    async with async_session() as session:
        result = await session.execute(
            select(LeadDB.source_file).distinct().where(LeadDB.source_file.isnot(None))
        )
        return result.scalars().all()

async def delete_leads(ids: list[str]):
    async with async_session() as session:
        await session.execute(delete(LeadDB).where(LeadDB.id.in_(ids)))
        await session.commit()

async def delete_leads_by_file(filename: str):
    async with async_session() as session:
        await session.execute(delete(LeadDB).where(LeadDB.source_file == filename))
        await session.commit()

async def get_lead_by_email(email: str):
    async with async_session() as session:
        result = await session.execute(select(LeadDB).where(LeadDB.email == email))
        return result.scalars().first()

async def get_lead_by_id(lead_id: str):
    async with async_session() as session:
        result = await session.execute(select(LeadDB).where(LeadDB.id == lead_id))
        return result.scalars().first()

async def update_lead_action(lead_id: str, status: str, draft: dict = None):
    async with async_session() as session:
        lead = await session.execute(select(LeadDB).where(LeadDB.id == lead_id))
        lead_obj = lead.scalars().first()
        if lead_obj:
            lead_obj.action_status = status
            if draft is not None:
                lead_obj.draft_action = draft
            await session.commit()
            await session.refresh(lead_obj)
        return lead_obj
