from fastapi import FastAPI, Query, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import pandas as pd
from models import LeadInput, LeadDB
from agent.orchestrator import run_agent
from db import save_lead, init_db, get_all_leads, get_stats, delete_leads, delete_leads_by_file, get_imported_files, get_lead_by_email, get_lead_by_id, update_lead_action
from connectors.excel.connector import ExcelConnector
from agent.action_agent import draft_lead_action
from gmail_auth import send_email, create_calendar_event, check_calendar_availability
from fastapi import HTTPException

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.post("/qualify-lead")
async def qualify_lead(lead: LeadInput):
    lead_dict = lead.model_dump()
    
    existing_lead = await get_lead_by_email(lead.email) if lead.email else None
    
    if existing_lead:
        saved_lead = existing_lead
    else:
        result = await run_agent(lead_dict)
        saved_lead = await save_lead(lead_dict, result)
    
    return {
        "id": str(saved_lead.id),
        "created_at": saved_lead.created_at.isoformat(),
        "source": saved_lead.source,
        "name": saved_lead.name,
        "email": saved_lead.email,
        "company": saved_lead.company,
        "job_title": saved_lead.job_title,
        "company_size": saved_lead.company_size,
        "budget": saved_lead.budget,
        "message": saved_lead.message,
        "bant_score": saved_lead.bant_score,
        
        "budget_score": saved_lead.budget_score,
        "budget_confidence": saved_lead.budget_confidence,
        "budget_evidence": saved_lead.budget_evidence,
        
        "authority_score": saved_lead.authority_score,
        "authority_confidence": saved_lead.authority_confidence,
        "authority_evidence": saved_lead.authority_evidence,
        
        "need_score": saved_lead.need_score,
        "need_confidence": saved_lead.need_confidence,
        "need_evidence": saved_lead.need_evidence,
        
        "timeline_score": saved_lead.timeline_score,
        "timeline_confidence": saved_lead.timeline_confidence,
        "timeline_evidence": saved_lead.timeline_evidence,
        "tier": saved_lead.tier,
        "research_summary": saved_lead.research_summary,
        "reasoning": saved_lead.reasoning,
        "recommendation": saved_lead.recommendation,
        "suggested_action": saved_lead.suggested_action,
        "action_status": saved_lead.action_status,
        "draft_action": saved_lead.draft_action
    }

@app.get("/leads")
async def fetch_leads(
    tier: str = Query(None),
    source: str = Query(None),
    search: str = Query(None),
    source_file: str = Query(None),
    action_status: str = Query(None),
    page: int = Query(1),
    page_size: int = Query(10)
):
    skip = (page - 1) * page_size
    data = await get_all_leads(tier, source, search, source_file, action_status, skip, page_size)
    leads = data["leads"]
    
    formatted_leads = [
        {
            "id": str(lead.id),
            "created_at": lead.created_at.isoformat(),
            "source": lead.source,
            "source_file": lead.source_file,
            "name": lead.name,
            "email": lead.email,
            "company": lead.company,
            "job_title": lead.job_title,
            "company_size": lead.company_size,
            "budget": lead.budget,
            "message": lead.message,
            "bant_score": lead.bant_score,
            
            "budget_score": lead.budget_score,
            "budget_confidence": lead.budget_confidence,
            "budget_evidence": lead.budget_evidence,
            
            "authority_score": lead.authority_score,
            "authority_confidence": lead.authority_confidence,
            "authority_evidence": lead.authority_evidence,
            
            "need_score": lead.need_score,
            "need_confidence": lead.need_confidence,
            "need_evidence": lead.need_evidence,
            
            "timeline_score": lead.timeline_score,
            "timeline_confidence": lead.timeline_confidence,
            "timeline_evidence": lead.timeline_evidence,
            "tier": lead.tier,
            "research_summary": lead.research_summary,
            "reasoning": lead.reasoning,
            "recommendation": lead.recommendation,
            "suggested_action": lead.suggested_action,
            "action_status": lead.action_status,
            "draft_action": lead.draft_action
        }
        for lead in leads
    ]
    
    return {
        "leads": formatted_leads,
        "total": data["total"]
    }

@app.get("/stats")
async def fetch_stats():
    return await get_stats()

@app.get("/imported-files")
async def fetch_imported_files_route():
    files = await get_imported_files()
    return files

@app.get("/excel-files")
async def list_excel_files():
    try:
        connector = ExcelConnector()
        files = await connector.list_excel_files()
        return files
    except Exception as e:
        print(f"Error fetching Excel files: {e}")
        return []

class ExcelConnectRequest(BaseModel):
    file_id: str
    filename: str

async def process_excel_rows_background(data_rows: list, filename: str):
    try:
        for row in data_rows:
            email_val = str(row[1]).strip() if len(row) > 1 else ""
            if email_val:
                existing_lead = await get_lead_by_email(email_val)
                if existing_lead:
                    continue
                    
            row_dict = {
                "source": "EXCEL",
                "source_file": filename,
                "name": str(row[0]) if len(row) > 0 else "Unknown",
                "email": email_val,
                "company": str(row[2]) if len(row) > 2 else "Unknown",
                "job_title": str(row[3]) if len(row) > 3 else "",
                "company_size": str(row[4]) if len(row) > 4 else "Unknown",
                "budget": str(row[5]) if len(row) > 5 else "Unknown",
                "message": str(row[6]) if len(row) > 6 else f"Imported from {filename}"
            }
            result = await run_agent(row_dict)
            await save_lead(row_dict, result)
            
    except Exception as e:
        print(f"Error processing Excel file: {e}")

@app.post("/excel-connect", status_code=202)
async def connect_excel(request: ExcelConnectRequest, background_tasks: BackgroundTasks):
    try:
        connector = ExcelConnector()
        rows = await connector.fetch_used_range(request.file_id)
        
        if not rows or len(rows) < 2:
            return {"message": "No data found", "expected_count": 0}
            
        data_rows = rows[1:]
        expected_count = len(data_rows)
        
        background_tasks.add_task(process_excel_rows_background, data_rows, request.filename)
        return {"message": "Processing started", "expected_count": expected_count}
    except Exception as e:
        print(f"Failed to fetch excel: {e}")
        return {"message": "Error connecting", "expected_count": 0}

@app.post("/upload-local-excel", status_code=202)
async def upload_local_excel(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename
        
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return {"message": "Unsupported file format", "expected_count": 0}
            
        df = df.fillna("")
        data_rows = df.values.tolist()
        expected_count = len(data_rows)
        
        if not data_rows:
            return {"message": "No data found", "expected_count": 0}
            
        background_tasks.add_task(process_excel_rows_background, data_rows, filename)
        return {"message": "Processing started", "expected_count": expected_count}
    except Exception as e:
        print(f"Failed to process upload: {e}")
        return {"message": "Error processing", "expected_count": 0}

class DeleteLeadsRequest(BaseModel):
    ids: list[str]

@app.delete("/leads")
async def api_delete_leads(request: DeleteLeadsRequest):
    await delete_leads(request.ids)
    return {"message": f"Deleted {len(request.ids)} leads"}

@app.delete("/leads/file/{filename}")
async def api_delete_leads_by_file(filename: str):
    await delete_leads_by_file(filename)
    return {"message": f"Deleted leads imported from {filename}"}

@app.post("/leads/{lead_id}/draft")
async def api_draft_action(lead_id: str):
    lead = await get_lead_by_id(lead_id)
    if not lead:
        return {"error": "Lead not found"}
        
    lead_dict = {
        "name": lead.name,
        "company": lead.company,
        "tier": lead.tier,
        "bant_score": lead.bant_score,
        "research_summary": lead.research_summary,
        "reasoning": lead.reasoning
    }
    
    draft = draft_lead_action(lead_dict)
    updated_lead = await update_lead_action(lead_id, "drafted", draft)
    return {"message": "Draft created", "draft": updated_lead.draft_action, "status": updated_lead.action_status}

class ExecuteActionRequest(BaseModel):
    subject: str
    body: str
    to: str | None = None
    cc: str | None = None

@app.post("/leads/{lead_id}/execute")
async def api_execute_action(lead_id: str, request: ExecuteActionRequest):
    lead = await get_lead_by_id(lead_id)
    if not lead:
        return {"error": "Lead not found"}
        
    if lead.tier.startswith("HOT"):
        # Send email
        target_to = request.to if request.to else lead.email
        result = send_email(to=target_to, subject=request.subject, body=request.body, cc=request.cc)
        if result:
            await update_lead_action(lead_id, "sent", {"subject": request.subject, "body": request.body, "to": target_to, "cc": request.cc})
            return {"message": "Email sent", "status": "sent"}
        else:
            return {"error": "Failed to send email"}
    else:
        # For non-HOT leads, action is just recorded internally
        await update_lead_action(lead_id, "nurturing" if lead.tier == "WARM" else "archived", {"note": request.body})
        return {"message": "Action recorded internally", "status": "nurturing" if lead.tier == "WARM" else "archived"}

class ScheduleRequest(BaseModel):
    start_time: str # ISO format
    end_time: str # ISO format
    description: str = ""
    email: str | None = None

@app.post("/leads/{lead_id}/schedule")
async def api_schedule_meeting(lead_id: str, request: ScheduleRequest):
    lead = await get_lead_by_id(lead_id)
    if not lead:
        return {"error": "Lead not found"}
        
    title = f"Discovery Call: {lead.name} / {lead.company}"
    target_email = request.email if request.email else lead.email
    
    is_available, error_msg = check_calendar_availability(request.start_time, request.end_time)
    if not is_available:
        raise HTTPException(status_code=409, detail=error_msg or "Time slot is not available. Please pick another time.")
    
    result = create_calendar_event(
        lead_email=target_email,
        title=title,
        start_time_iso=request.start_time,
        end_time_iso=request.end_time,
        description=request.description
    )
    
    if result:
        # Update action status to note it was scheduled
        await update_lead_action(lead_id, "scheduled", {"event_id": result.get("id"), "event_link": result.get("htmlLink")})
        return {"message": "Meeting scheduled", "link": result.get("htmlLink")}
    else:
        return {"error": "Failed to schedule meeting"}
