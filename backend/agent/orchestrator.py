from groq import AsyncGroq
import json
import os
from dotenv import load_dotenv
from agent.prompts import SYSTEM_PROMPT
from agent.tools import do_web_research

load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "research_company",
            "description": "Search the web for info about a company and person",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "score_lead",
            "description": "Calculate BANT score based on gathered info",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_score": {"type": "integer", "description": "0-25 score"},
                    "budget_confidence": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
                    "budget_evidence": {"type": "string"},
                    "authority_score": {"type": "integer", "description": "0-25 score"},
                    "authority_confidence": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
                    "authority_evidence": {"type": "string"},
                    "need_score": {"type": "integer", "description": "0-25 score"},
                    "need_confidence": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
                    "need_evidence": {"type": "string"},
                    "timeline_score": {"type": "integer", "description": "0-25 score"},
                    "timeline_confidence": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
                    "timeline_evidence": {"type": "string"},
                    "reasoning": {
                        "type": "array",
                        "description": "List of falsifiable reasoning claims",
                        "items": {
                            "type": "object",
                            "properties": {
                                "claim": {"type": "string", "description": "What you believe"},
                                "evidence": {"type": "string", "description": "Why you believe it (data point)"},
                                "source_url": {"type": "string", "description": "Where you found it (URL or 'Form Data')"}
                            },
                            "required": ["claim", "evidence", "source_url"]
                        }
                    }
                },
                "required": [
                    "budget_score", "budget_confidence", "budget_evidence",
                    "authority_score", "authority_confidence", "authority_evidence",
                    "need_score", "need_confidence", "need_evidence",
                    "timeline_score", "timeline_confidence", "timeline_evidence",
                    "reasoning"
                ]
            }
        }
    }
]

def generate_final_response(lead_data, research_findings, score, messages):
    bant_score = sum([
        score.get("budget_score", 0),
        score.get("authority_score", 0),
        score.get("need_score", 0),
        score.get("timeline_score", 0)
    ])
    
    tier = "UNQUALIFIED"
    if bant_score >= 75: tier = "HOT"
    elif bant_score >= 50: tier = "WARM"
    elif bant_score >= 25: tier = "COLD"
    
    # Adjust tier based on confidence
    if tier == "HOT":
        confidences = [
            score.get("budget_confidence", "LOW"),
            score.get("authority_confidence", "LOW"),
            score.get("need_confidence", "LOW"),
            score.get("timeline_confidence", "LOW")
        ]
        # If majority are LOW, or if it's completely unverified
        if confidences.count("LOW") >= 2:
            tier = "HOT - Verify"
        
    recommendation = "No recommendation provided."
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and msg.get("content"):
            recommendation = msg["content"]
            break
            
    suggested_action = {
        "HOT": "Schedule immediate sales call.",
        "HOT - Verify": "Verify information before calling.",
        "WARM": "Add to nurture sequence.",
        "COLD": "Send educational content.",
        "UNQUALIFIED": "Do not pursue."
    }.get(tier, "Review manually.")

    return {
        "bant_score": bant_score,
        
        "budget_score": score.get("budget_score", 0),
        "budget_confidence": score.get("budget_confidence", "LOW"),
        "budget_evidence": score.get("budget_evidence", "None provided"),
        
        "authority_score": score.get("authority_score", 0),
        "authority_confidence": score.get("authority_confidence", "LOW"),
        "authority_evidence": score.get("authority_evidence", "None provided"),
        
        "need_score": score.get("need_score", 0),
        "need_confidence": score.get("need_confidence", "LOW"),
        "need_evidence": score.get("need_evidence", "None provided"),
        
        "timeline_score": score.get("timeline_score", 0),
        "timeline_confidence": score.get("timeline_confidence", "LOW"),
        "timeline_evidence": score.get("timeline_evidence", "None provided"),
        
        "tier": tier,
        "research_summary": research_findings[0].get("findings") if research_findings else "{}",
        "reasoning": score.get("reasoning", []),
        "recommendation": recommendation,
        "suggested_action": suggested_action
    }

async def run_agent(lead_data: dict) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Qualify this lead: {json.dumps(lead_data)}"}
    ]
    
    research_findings = []
    score = {}
    
    for _ in range(5):
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.1
        )
        
        msg = response.choices[0].message
        
        assistant_msg = {"role": "assistant"}
        if msg.content:
            assistant_msg["content"] = msg.content
        if msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                } for tc in msg.tool_calls
            ]
        
        messages.append(assistant_msg)
        
        if not msg.tool_calls:
            break
            
        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            
            result = {}
            if name == "research_company":
                result = await do_web_research(args.get("query", ""), lead_data)
                research_findings.append(result)
            elif name == "score_lead":
                score = args
                result = score
                
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": name,
                "content": json.dumps(result)
            })
    
    return generate_final_response(lead_data, research_findings, score, messages)
