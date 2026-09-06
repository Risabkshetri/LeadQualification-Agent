import random
import datetime
from dotenv import load_dotenv

from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage

load_dotenv()

@tool
def greet(name: str) -> str:
    """Greets a user."""
    return f"Hello {name}"

@tool
def add(a: int, b: int) -> int:
    """Adds two numbers."""
    return a + b

@tool
def current_time() -> str:
    """Returns the current time."""
    return datetime.datetime.now().strftime("%I:%M %p")

@tool
def random_joke() -> str:
    """Tells a random joke. No inputs needed."""
    jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "There are 10 types of people in the world: those who understand binary, and those who don't.",
        "Why did the developer go broke? Because he used up all his cache."
    ]
    return random.choice(jokes)

@tool
def get_marks(name: str) -> str:
    """Fetches a student's marks from the database."""
    # Fake database
    students = {
        "Rahul": 90,
        "Aman": 87
    }
    
    marks = students.get(name)
    if marks is not None:
        return str(marks)
    return "Student not found."

def create_agent(model, tools):
    """
    Sets up the Agent Loop (Think -> Use Tool -> Read Output -> Final Answer)
    """
    agent = create_react_agent(model, tools=tools)
    
    class AgentWrapper:
        def invoke(self, inputs):
            result = agent.invoke({"messages": [HumanMessage(content=inputs["input"])]})
            
            for m in result["messages"]:
                if hasattr(m, "tool_calls") and m.tool_calls:
                    for tc in m.tool_calls:
                        print(f"  [Agent Decided to Use Tool]: {tc['name']} with args {tc['args']}")
                        
            return {"output": result["messages"][-1].content}
            
    return AgentWrapper()

if __name__ == "__main__":
    
    model = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
    
    my_tools = [greet, add, current_time, random_joke, get_marks]
    
    agent = create_agent(model=model, tools=my_tools)

    print("\n--- AI AGENT INITIALIZED ---\n")

    print("User: Say hello to Rishab")
    response = agent.invoke({"input": "Say hello to Rishab"})
    print(f"Final Answer: {response['output']}\n{'-'*40}")

    print("User: What is 50 + 22?")
    response = agent.invoke({"input": "What is 50 + 22?"})
    print(f"Final Answer: {response['output']}\n{'-'*40}")

    print("User: What time is it?")
    response = agent.invoke({"input": "What time is it?"})
    print(f"Final Answer: {response['output']}\n{'-'*40}")

    print("User: Tell me a joke")
    response = agent.invoke({"input": "Tell me a joke"})
    print(f"Final Answer: {response['output']}\n{'-'*40}")
    
    print("User: What are Rahul's marks?")
    response = agent.invoke({"input": "What are Rahul's marks?"})
    print(f"Final Answer: {response['output']}\n{'-'*40}")
