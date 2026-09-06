from googleapiclient.discovery import build
from typing import Any, List, Dict
from connectors.excel.auth import get_credentials

class ExcelConnector:
    """
    Connection logic for Google Sheets.
    """
    def __init__(self):
        # We store token.json in the connectors/excel directory or root. Let's put it in root for easy access.
        self.creds = get_credentials("token.json")
        self.drive_service = build('drive', 'v3', credentials=self.creds)
        self.sheets_service = build('sheets', 'v4', credentials=self.creds)

    async def list_excel_files(self) -> List[Dict[str, str]]:
        """
        Search user's Google Drive for Google Sheets.
        """
        query = "mimeType='application/vnd.google-apps.spreadsheet'"
        
        results = self.drive_service.files().list(
            q=query,
            pageSize=50,
            fields="files(id, name)"
        ).execute()
        
        items = results.get('files', [])
        return [{"id": item["id"], "name": item["name"]} for item in items]

    async def fetch_used_range(self, workbook_id: str) -> List[List[Any]]:
        """
        Fetch the used range from the first worksheet of the specified Google Sheet.
        """
        # 1. Get the first sheet's name
        spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=workbook_id).execute()
        sheets = spreadsheet.get('sheets', [])
        if not sheets:
            return []
            
        first_sheet_name = sheets[0]['properties']['title']
        
        # 2. Get data from the first sheet
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=workbook_id,
            range=first_sheet_name
        ).execute()
        
        return result.get('values', [])
