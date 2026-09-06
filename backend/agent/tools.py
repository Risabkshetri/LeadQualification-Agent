from groq import AsyncGroq
import os
from dotenv import load_dotenv

load_dotenv()

async def do_web_research(query: str, lead_data: dict) -> dict:
    """Uses Groq for web search / research simulation"""
    search_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        response = await search_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": f"""Research: {query}
                
                Lead details:
                Name: {lead_data.get('name')}
                Company: {lead_data.get('company')}
                Job Title: {lead_data.get('job_title')}
                Message: {lead_data.get('message')}
                
                Find (or logically infer based on context):
                1. Company size, funding, industry
                2. Person's seniority/decision-making power  
                3. Company's likely tech budget
                4. Recent news or signals (hiring, funding, etc.)
                
                You must respond in valid JSON format. Do not include any conversational filler.
                Use exactly these keys: company_size, funding, industry, seniority, decision_making_power, tech_budget, recent_news_and_signals."""
            }],
            response_format={"type": "json_object"},
            max_tokens=500,
            temperature=0.3
        )
        findings = response.choices[0].message.content
    except Exception as e:
        print(f"Research failed: {e}")
        findings = "Could not complete research due to API error."

    return {
        "query": query,
        "findings": findings
    }
