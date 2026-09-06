import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DRAFTING_PROMPT = """You are an expert SDR (Sales Development Representative) working for an enterprise software company.
Your goal is to draft a follow-up action for a newly qualified lead based on their tier and research findings.

Here are the rules based on the lead's tier:
1. If the lead is 'HOT' or 'HOT - Verify':
   Draft a highly personalized outreach email. The email MUST be conversational, reference specific claims from the agent's reasoning or research, and include a call to action with a Calendly link (e.g., 'https://calendly.com/risawgc/30min'). 
   CRITICAL: Do NOT sound like a generic robot reciting facts (e.g. avoid saying "With a budget of X..."). Weave the research in naturally. Keep it short and punchy.
   CRITICAL: Format the email with proper paragraphs. Use spacing (blank lines) between the greeting, the body paragraphs, and the sign-off. Do NOT output a single wall of text.

2. If the lead is 'WARM':
   Draft a note indicating which nurture sequence the lead should be placed in (e.g., "Low Budget Nurture", "Long Timeline Nurture"). Your draft should be a brief internal note explaining why this specific sequence was chosen.

3. If the lead is 'COLD' or 'UNQUALIFIED':
   Draft a brief internal archive note explaining why this lead is not worth pursuing right now.

OUTPUT FORMAT:
You MUST output valid JSON with exactly two fields:
- "subject": The subject line of the email (for HOT leads) or a title for the note (for WARM/COLD).
- "body": The actual content of the email or the note.

Do NOT output any markdown blocks or conversational filler outside of the JSON object.
"""

def draft_lead_action(lead: dict) -> dict:
    prompt = f"""
    Lead Info: {json.dumps({
        "name": lead.get("name"),
        "company": lead.get("company"),
        "tier": lead.get("tier"),
        "bant_score": lead.get("bant_score"),
        "research_summary": lead.get("research_summary"),
        "reasoning": lead.get("reasoning")
    })}
    """
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": DRAFTING_PROMPT},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.4
    )
    
    try:
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Error parsing draft action: {e}")
        return {"subject": "Follow-up Action", "body": "Could not generate draft."}
