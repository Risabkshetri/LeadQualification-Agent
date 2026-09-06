import os
import base64
from email.message import EmailMessage
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
]
def get_gmail_service(token_path: str = "gmail_token.json"):
    creds = None
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except ValueError:
            os.remove(token_path)
            creds = None
        
    if not creds or not creds.valid or not creds.has_scopes(SCOPES):
        if creds and creds.expired and creds.refresh_token and creds.has_scopes(SCOPES):
            creds.refresh(Request())
        else:
            client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
            if not client_id or not client_secret:
                raise ValueError("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env")
            
            client_config = {
                "installed": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "redirect_uris": ["http://localhost:8080/"]
                }
            }
            
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            # Use fixed port so redirect URI matches
            creds = flow.run_local_server(port=8080, prompt='consent')
            
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
            
    return build('gmail', 'v1', credentials=creds)

def get_calendar_service(token_path: str = "gmail_token.json"):
    # Reuses the exact same auth flow and token
    creds = None
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except ValueError:
            pass
    if not creds or not creds.valid or not creds.has_scopes(SCOPES):
        # Trigger auth via get_gmail_service (which handles the flow)
        get_gmail_service(token_path)
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    return build('calendar', 'v3', credentials=creds)

def check_calendar_availability(start_time_iso: str, end_time_iso: str) -> tuple[bool, str | None]:
    try:
        service = get_calendar_service()
        body = {
            "timeMin": start_time_iso,
            "timeMax": end_time_iso,
            "items": [{"id": "primary"}]
        }
        result = service.freebusy().query(body=body).execute()
        busy = result.get('calendars', {}).get('primary', {}).get('busy', [])
        return len(busy) == 0, None
    except HttpError as error:
        print(f"Error checking availability: {error}")
        return False, "Failed to check calendar availability. Please try again."

def create_calendar_event(lead_email: str, title: str, start_time_iso: str, end_time_iso: str, description: str = ""):
    try:
        service = get_calendar_service()
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time_iso,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time_iso,
                'timeZone': 'UTC',
            },
            'attendees': [
                {'email': lead_email},
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{os.urandom(16).hex()}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        }
        
        # We need conferenceDataVersion=1 to enable Google Meet link generation
        created_event = service.events().insert(
            calendarId='primary', 
            body=event, 
            conferenceDataVersion=1,
            sendUpdates='all'
        ).execute()
        
        return created_event
    except HttpError as error:
        print(f"An error occurred scheduling: {error}")
        return None

def send_email(to: str, subject: str, body: str, cc: str = None):
    try:
        service = get_gmail_service()
        message = EmailMessage()
        
        message['To'] = to
        message['From'] = 'me'
        message['Subject'] = subject
        if cc:
            message['Cc'] = cc
        
        # Set plain text fallback
        message.set_content(body)
        
        # Create premium HTML version
        # Replace \n\n with </p><p> and \n with <br> to preserve LLM formatting
        paragraphs = body.strip().split('\n\n')
        html_body_content = "".join(f"<p>{p.replace('\n', '<br>')}</p>" for p in paragraphs)
        
        # Linkify calendly URLs if present
        import re
        html_body_content = re.sub(r'(https://calendly\.com/[^\s]+)', r'<a href="\1" style="color: #0055FF; font-weight: 500; text-decoration: none;">\1</a>', html_body_content)

        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #111111;
                    max-width: 600px;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    padding: 24px 0;
                }}
                p {{
                    margin: 0 0 16px 0;
                    font-size: 15px;
                    color: #333333;
                }}
                .signature {{
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid #E5E5E5;
                    font-size: 13px;
                    color: #6B6B6B;
                    line-height: 1.5;
                }}
                .signature strong {{
                    color: #111111;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                {html_body_content}
                
                <div class="signature">
                    <strong>Rishab Chhetri</strong><br>
                    Sales Development<br>
                    Lead Qualification Agent
                </div>
            </div>
        </body>
        </html>
        """
        
        # Add the HTML version
        message.add_alternative(html_template, subtype='html')

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}

        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        return send_message
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None
